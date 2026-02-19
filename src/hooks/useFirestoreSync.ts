import { useEffect, useRef, useCallback } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import type { User, Task, Category, UUID } from "../types/user";
import {
  getFullUserData,
  setFullUserData,
  setUserProfile,
  batchWriteDiff,
  onTasksChange,
  onCategoriesChange,
  onUserProfileChange,
} from "../services/firestoreService";
import { mergeTasks, mergeCategories } from "../utils/syncUtils";
import { showToast } from "../utils";

// --- Shallow diff helpers ---

const PROFILE_FIELDS: Array<keyof Omit<User, "tasks" | "categories">> = [
  "name",
  "profilePicture",
  "emojisStyle",
  "deletedTasks",
  "deletedCategories",
  "favoriteCategories",
  "colorList",
  "settings",
  "theme",
  "darkmode",
];

function hasProfileChanged(prev: User, current: User): boolean {
  return PROFILE_FIELDS.some((key) => {
    const a = prev[key];
    const b = current[key];
    if (a === b) return false;
    // For arrays and objects, compare by reference first (fast path), then by value
    if (typeof a === "object" && typeof b === "object") {
      return JSON.stringify(a) !== JSON.stringify(b);
    }
    return true;
  });
}

function hasTaskChanged(a: Task, b: Task): boolean {
  return (
    a.done !== b.done ||
    a.pinned !== b.pinned ||
    a.name !== b.name ||
    a.description !== b.description ||
    a.emoji !== b.emoji ||
    a.color !== b.color ||
    a.sharedBy !== b.sharedBy ||
    a.position !== b.position ||
    String(a.date) !== String(b.date) ||
    String(a.deadline) !== String(b.deadline) ||
    String(a.lastSave) !== String(b.lastSave) ||
    JSON.stringify(a.category) !== JSON.stringify(b.category)
  );
}

function hasCategoryChanged(a: Category, b: Category): boolean {
  return (
    a.name !== b.name ||
    a.emoji !== b.emoji ||
    a.color !== b.color ||
    String(a.lastSave) !== String(b.lastSave)
  );
}

interface DiffResult {
  profileChanged: boolean;
  addedOrModifiedTasks: Task[];
  deletedTaskIds: UUID[];
  addedOrModifiedCategories: Category[];
  deletedCategoryIds: UUID[];
}

function computeDiff(prev: User, current: User): DiffResult {
  const profileChanged = hasProfileChanged(prev, current);

  const prevTaskMap = new Map(prev.tasks.map((t) => [t.id, t]));
  const currentTaskMap = new Map(current.tasks.map((t) => [t.id, t]));

  const addedOrModifiedTasks: Task[] = [];
  for (const task of current.tasks) {
    const prevTask = prevTaskMap.get(task.id);
    if (!prevTask || hasTaskChanged(prevTask, task)) {
      addedOrModifiedTasks.push(task);
    }
  }

  const deletedTaskIds: UUID[] = [];
  for (const prevTask of prev.tasks) {
    if (!currentTaskMap.has(prevTask.id)) {
      deletedTaskIds.push(prevTask.id);
    }
  }

  const prevCatMap = new Map(prev.categories.map((c) => [c.id, c]));
  const currentCatMap = new Map(current.categories.map((c) => [c.id, c]));

  const addedOrModifiedCategories: Category[] = [];
  for (const cat of current.categories) {
    const prevCat = prevCatMap.get(cat.id);
    if (!prevCat || hasCategoryChanged(prevCat, cat)) {
      addedOrModifiedCategories.push(cat);
    }
  }

  const deletedCategoryIds: UUID[] = [];
  for (const prevCat of prev.categories) {
    if (!currentCatMap.has(prevCat.id)) {
      deletedCategoryIds.push(prevCat.id);
    }
  }

  return {
    profileChanged,
    addedOrModifiedTasks,
    deletedTaskIds,
    addedOrModifiedCategories,
    deletedCategoryIds,
  };
}

export function useFirestoreSync(
  firebaseUser: FirebaseUser | null,
  user: User,
  setUser: React.Dispatch<React.SetStateAction<User>>,
) {
  const isInitialMergeDone = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousUser = useRef<User>(user);
  const isRemoteUpdate = useRef(false);
  const isMerging = useRef(false);
  const pendingFlush = useRef<(() => Promise<void>) | null>(null);

  // Reset state when user signs out
  useEffect(() => {
    if (!firebaseUser) {
      isInitialMergeDone.current = false;
      isMerging.current = false;
      pendingFlush.current = null;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    }
  }, [firebaseUser]);

  // --- Initial merge when user signs in ---
  useEffect(() => {
    if (!firebaseUser || isInitialMergeDone.current || isMerging.current) return;

    isMerging.current = true;

    const mergeOnSignIn = async () => {
      try {
        const cloudData = await getFullUserData(firebaseUser.uid);

        if (!cloudData) {
          // First time: upload local data to Firestore
          await setFullUserData(firebaseUser.uid, user);
          showToast("資料已同步至雲端！");
        } else {
          // Merge local + cloud
          const mergedTasks = mergeTasks(
            user.tasks,
            cloudData.tasks,
            user.deletedTasks,
            cloudData.deletedTasks,
            user.deletedCategories,
            cloudData.deletedCategories,
          );

          const mergedCategories = mergeCategories(
            user.categories,
            cloudData.categories,
            user.deletedCategories,
            cloudData.deletedCategories,
          );

          const mergedDeletedTasks = Array.from(
            new Set([...user.deletedTasks, ...cloudData.deletedTasks]),
          );
          const mergedDeletedCategories = Array.from(
            new Set([...user.deletedCategories, ...cloudData.deletedCategories]),
          );

          // Cloud profile takes priority for settings, keep local name if set
          const merged: User = {
            ...cloudData,
            name: user.name || cloudData.name,
            tasks: mergedTasks,
            categories: mergedCategories,
            deletedTasks: mergedDeletedTasks,
            deletedCategories: mergedDeletedCategories,
            favoriteCategories: Array.from(
              new Set([...user.favoriteCategories, ...cloudData.favoriteCategories]),
            ),
          };

          isRemoteUpdate.current = true;
          setUser(merged);
          await setFullUserData(firebaseUser.uid, merged);
          showToast("資料已與雲端合併！");
        }

        previousUser.current = user;
        isInitialMergeDone.current = true;
      } catch (error) {
        console.error("Firebase sync error:", error);
        showToast("雲端同步失敗，請稍後再試。", { type: "error" });
      } finally {
        isMerging.current = false;
      }
    };

    mergeOnSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser]);

  // --- Real-time listeners ---
  useEffect(() => {
    if (!firebaseUser || !isInitialMergeDone.current) return;

    const unsubs = [
      onTasksChange(firebaseUser.uid, (remoteTasks) => {
        isRemoteUpdate.current = true;
        setUser((prev) => ({ ...prev, tasks: remoteTasks }));
      }),
      onCategoriesChange(firebaseUser.uid, (remoteCategories) => {
        isRemoteUpdate.current = true;
        setUser((prev) => ({ ...prev, categories: remoteCategories }));
      }),
      onUserProfileChange(firebaseUser.uid, (profile) => {
        isRemoteUpdate.current = true;
        setUser((prev) => ({
          ...prev,
          ...profile,
          // Preserve tasks and categories from subcollection listeners
          tasks: prev.tasks,
          categories: prev.categories,
        }));
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, isInitialMergeDone.current]);

  // --- Compute diff and write to Firestore using batch ---
  const applyDiffToFirestore = useCallback(async (uid: string, prev: User, current: User) => {
    try {
      const diff = computeDiff(prev, current);

      // Skip if nothing changed
      if (
        !diff.profileChanged &&
        diff.addedOrModifiedTasks.length === 0 &&
        diff.deletedTaskIds.length === 0 &&
        diff.addedOrModifiedCategories.length === 0 &&
        diff.deletedCategoryIds.length === 0
      ) {
        return;
      }

      // Write profile separately (not part of subcollection batch)
      if (diff.profileChanged) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { tasks: _t, categories: _c, ...profile } = current;
        await setUserProfile(uid, profile);
      }

      // Batch write all task and category changes
      await batchWriteDiff(uid, diff);
    } catch (error) {
      console.error("Error writing diff to Firestore:", error);
    }
  }, []);

  // --- beforeunload: flush pending writes ---
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingFlush.current) {
        pendingFlush.current();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // --- Debounced write-back to Firestore on local changes ---
  useEffect(() => {
    if (!firebaseUser || !isInitialMergeDone.current) return;

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      previousUser.current = user;
      return; // Don't write back changes that came from Firestore
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const prev = previousUser.current;
    const flush = async () => {
      await applyDiffToFirestore(firebaseUser.uid, prev, user);
      previousUser.current = user;
      pendingFlush.current = null;
    };

    pendingFlush.current = flush;
    debounceTimer.current = setTimeout(flush, 1500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [user, firebaseUser, applyDiffToFirestore]);
}
