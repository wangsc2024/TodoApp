import { useEffect, useRef, useCallback } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import type { User } from "../types/user";
import {
  getFullUserData,
  setFullUserData,
  setUserProfile,
  setTask,
  deleteTask as firestoreDeleteTask,
  setCategory,
  deleteCategory as firestoreDeleteCategory,
  onTasksChange,
  onCategoriesChange,
  onUserProfileChange,
} from "../services/firestoreService";
import { mergeTasks, mergeCategories } from "../utils/syncUtils";
import { showToast } from "../utils";

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

  // Reset state when user signs out
  useEffect(() => {
    if (!firebaseUser) {
      isInitialMergeDone.current = false;
      isMerging.current = false;
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

  // --- Compute diff and write to Firestore ---
  const applyDiffToFirestore = useCallback(
    async (uid: string, prev: User, current: User) => {
      try {
        // Check for profile-level changes
        const profileFields: Array<keyof Omit<User, "tasks" | "categories">> = [
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

        const profileChanged = profileFields.some(
          (key) => JSON.stringify(prev[key]) !== JSON.stringify(current[key]),
        );

        if (profileChanged) {
          const { tasks: _t, categories: _c, ...profile } = current;
          await setUserProfile(uid, profile);
        }

        // Check for task changes
        const prevTaskMap = new Map(prev.tasks.map((t) => [t.id, t]));
        const currentTaskMap = new Map(current.tasks.map((t) => [t.id, t]));

        // Added or modified tasks
        for (const task of current.tasks) {
          const prevTask = prevTaskMap.get(task.id);
          if (!prevTask || JSON.stringify(prevTask) !== JSON.stringify(task)) {
            await setTask(uid, task);
          }
        }

        // Deleted tasks
        for (const prevTask of prev.tasks) {
          if (!currentTaskMap.has(prevTask.id)) {
            await firestoreDeleteTask(uid, prevTask.id);
          }
        }

        // Check for category changes
        const prevCatMap = new Map(prev.categories.map((c) => [c.id, c]));
        const currentCatMap = new Map(current.categories.map((c) => [c.id, c]));

        // Added or modified categories
        for (const cat of current.categories) {
          const prevCat = prevCatMap.get(cat.id);
          if (!prevCat || JSON.stringify(prevCat) !== JSON.stringify(cat)) {
            await setCategory(uid, cat);
          }
        }

        // Deleted categories
        for (const prevCat of prev.categories) {
          if (!currentCatMap.has(prevCat.id)) {
            await firestoreDeleteCategory(uid, prevCat.id);
          }
        }
      } catch (error) {
        console.error("Error writing diff to Firestore:", error);
      }
    },
    [],
  );

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
    debounceTimer.current = setTimeout(() => {
      applyDiffToFirestore(firebaseUser.uid, prev, user);
      previousUser.current = user;
    }, 1500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [user, firebaseUser, applyDiffToFirestore]);
}
