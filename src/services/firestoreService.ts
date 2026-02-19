import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { User, Task, Category, UUID } from "../types/user";

// --- Timestamp converters ---

function toTimestamp(date: Date | string | undefined | null): Timestamp | null {
  if (!date) return null;
  return Timestamp.fromDate(new Date(date));
}

function toDate(ts: Timestamp | null | undefined): Date | undefined {
  return ts?.toDate() ?? undefined;
}

// --- Task converters ---

function taskToFirestore(task: Task): Record<string, unknown> {
  return {
    done: task.done,
    pinned: task.pinned,
    name: task.name,
    description: task.description ?? null,
    emoji: task.emoji ?? null,
    color: task.color,
    date: toTimestamp(task.date),
    deadline: toTimestamp(task.deadline),
    category: task.category ?? null,
    lastSave: toTimestamp(task.lastSave),
    sharedBy: task.sharedBy ?? null,
    position: task.position ?? null,
  };
}

function taskFromFirestore(data: Record<string, unknown>, id: string): Task {
  return {
    id: id as UUID,
    done: data.done as boolean,
    pinned: data.pinned as boolean,
    name: data.name as string,
    description: (data.description as string) ?? undefined,
    emoji: (data.emoji as string) ?? undefined,
    color: data.color as string,
    date: toDate(data.date as Timestamp) ?? new Date(),
    deadline: toDate(data.deadline as Timestamp),
    category: (data.category as Category[]) ?? undefined,
    lastSave: toDate(data.lastSave as Timestamp),
    sharedBy: (data.sharedBy as string) ?? undefined,
    position: (data.position as number) ?? undefined,
  };
}

// --- Category converters ---

function categoryToFirestore(cat: Category): Record<string, unknown> {
  return {
    name: cat.name,
    emoji: cat.emoji ?? null,
    color: cat.color,
    lastSave: toTimestamp(cat.lastSave),
  };
}

function categoryFromFirestore(data: Record<string, unknown>, id: string): Category {
  return {
    id: id as UUID,
    name: data.name as string,
    emoji: (data.emoji as string) ?? undefined,
    color: data.color as string,
    lastSave: toDate(data.lastSave as Timestamp),
  };
}

// --- User profile (excludes tasks/categories subcollections) ---

type UserProfileFields = Omit<User, "tasks" | "categories">;

function userProfileToFirestore(user: UserProfileFields): Record<string, unknown> {
  return {
    name: user.name,
    createdAt: toTimestamp(user.createdAt),
    profilePicture: user.profilePicture,
    emojisStyle: user.emojisStyle,
    deletedTasks: user.deletedTasks,
    deletedCategories: user.deletedCategories,
    favoriteCategories: user.favoriteCategories,
    colorList: user.colorList,
    settings: user.settings,
    theme: user.theme,
    darkmode: user.darkmode,
    lastSyncedAt: serverTimestamp(),
  };
}

function userProfileFromFirestore(
  data: Record<string, unknown>,
): Omit<User, "tasks" | "categories"> {
  return {
    name: (data.name as string) ?? null,
    createdAt: toDate(data.createdAt as Timestamp) ?? new Date(),
    profilePicture: (data.profilePicture as string) ?? null,
    emojisStyle: data.emojisStyle as User["emojisStyle"],
    deletedTasks: (data.deletedTasks as UUID[]) ?? [],
    deletedCategories: (data.deletedCategories as UUID[]) ?? [],
    favoriteCategories: (data.favoriteCategories as UUID[]) ?? [],
    colorList: (data.colorList as string[]) ?? [],
    settings: data.settings as User["settings"],
    theme: (data.theme as string) ?? "system",
    darkmode: (data.darkmode as User["darkmode"]) ?? "system",
    lastSyncedAt: toDate(data.lastSyncedAt as Timestamp),
  };
}

// --- CRUD Operations ---

export async function getUserProfile(
  uid: string,
): Promise<Omit<User, "tasks" | "categories"> | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return userProfileFromFirestore(snap.data());
}

export async function setUserProfile(
  uid: string,
  user: Omit<User, "tasks" | "categories">,
): Promise<void> {
  await setDoc(doc(db, "users", uid), userProfileToFirestore(user));
}

export async function getTasks(uid: string): Promise<Task[]> {
  const snap = await getDocs(collection(db, "users", uid, "tasks"));
  return snap.docs.map((d) => taskFromFirestore(d.data(), d.id));
}

export async function getCategories(uid: string): Promise<Category[]> {
  const snap = await getDocs(collection(db, "users", uid, "categories"));
  return snap.docs.map((d) => categoryFromFirestore(d.data(), d.id));
}

// --- Full Data Operations ---

export async function getFullUserData(uid: string): Promise<User | null> {
  const [profile, tasks, categories] = await Promise.all([
    getUserProfile(uid),
    getTasks(uid),
    getCategories(uid),
  ]);
  if (!profile) return null;
  return { ...profile, tasks, categories };
}

export async function setFullUserData(uid: string, userData: User): Promise<void> {
  const { tasks, categories, ...profile } = userData;

  // Firestore batches are limited to 500 operations
  const MAX_BATCH_OPS = 499;
  const allOps: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];

  // Profile doc
  allOps.push({
    ref: doc(db, "users", uid),
    data: userProfileToFirestore(profile),
  });

  // Task docs
  for (const task of tasks) {
    allOps.push({
      ref: doc(db, "users", uid, "tasks", task.id),
      data: taskToFirestore(task),
    });
  }

  // Category docs
  for (const cat of categories) {
    allOps.push({
      ref: doc(db, "users", uid, "categories", cat.id),
      data: categoryToFirestore(cat),
    });
  }

  // Split into batches of MAX_BATCH_OPS
  for (let i = 0; i < allOps.length; i += MAX_BATCH_OPS) {
    const batch = writeBatch(db);
    const chunk = allOps.slice(i, i + MAX_BATCH_OPS);
    for (const op of chunk) {
      batch.set(op.ref, op.data);
    }
    await batch.commit();
  }
}

// --- Individual Write Operations ---

export async function setTask(uid: string, task: Task): Promise<void> {
  await setDoc(doc(db, "users", uid, "tasks", task.id), taskToFirestore(task));
}

export async function deleteTask(uid: string, taskId: UUID): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "tasks", taskId));
}

export async function setCategory(uid: string, category: Category): Promise<void> {
  await setDoc(doc(db, "users", uid, "categories", category.id), categoryToFirestore(category));
}

export async function deleteCategory(uid: string, categoryId: UUID): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "categories", categoryId));
}

// --- Batch Diff Write ---

interface DiffOps {
  addedOrModifiedTasks: Task[];
  deletedTaskIds: UUID[];
  addedOrModifiedCategories: Category[];
  deletedCategoryIds: UUID[];
}

export async function batchWriteDiff(uid: string, diff: DiffOps): Promise<void> {
  const MAX_BATCH_OPS = 499;

  type BatchOp =
    | { type: "set"; ref: ReturnType<typeof doc>; data: Record<string, unknown> }
    | { type: "delete"; ref: ReturnType<typeof doc> };

  const ops: BatchOp[] = [];

  for (const task of diff.addedOrModifiedTasks) {
    ops.push({
      type: "set",
      ref: doc(db, "users", uid, "tasks", task.id),
      data: taskToFirestore(task),
    });
  }

  for (const taskId of diff.deletedTaskIds) {
    ops.push({
      type: "delete",
      ref: doc(db, "users", uid, "tasks", taskId),
    });
  }

  for (const cat of diff.addedOrModifiedCategories) {
    ops.push({
      type: "set",
      ref: doc(db, "users", uid, "categories", cat.id),
      data: categoryToFirestore(cat),
    });
  }

  for (const catId of diff.deletedCategoryIds) {
    ops.push({
      type: "delete",
      ref: doc(db, "users", uid, "categories", catId),
    });
  }

  if (ops.length === 0) return;

  for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
    const batch = writeBatch(db);
    const chunk = ops.slice(i, i + MAX_BATCH_OPS);
    for (const op of chunk) {
      if (op.type === "set") {
        batch.set(op.ref, op.data);
      } else {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

// --- Delete All User Data ---

export async function deleteAllUserData(uid: string): Promise<void> {
  const MAX_BATCH_OPS = 499;

  // Collect all docs to delete
  const refs: ReturnType<typeof doc>[] = [];

  const taskSnap = await getDocs(collection(db, "users", uid, "tasks"));
  taskSnap.docs.forEach((d) => refs.push(d.ref));

  const catSnap = await getDocs(collection(db, "users", uid, "categories"));
  catSnap.docs.forEach((d) => refs.push(d.ref));

  // Delete the user profile doc
  refs.push(doc(db, "users", uid));

  for (let i = 0; i < refs.length; i += MAX_BATCH_OPS) {
    const batch = writeBatch(db);
    const chunk = refs.slice(i, i + MAX_BATCH_OPS);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

// --- Real-time Listeners ---

export function onTasksChange(uid: string, callback: (tasks: Task[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "users", uid, "tasks"), (snap) => {
    const tasks = snap.docs.map((d) => taskFromFirestore(d.data(), d.id));
    callback(tasks);
  });
}

export function onCategoriesChange(
  uid: string,
  callback: (categories: Category[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, "users", uid, "categories"), (snap) => {
    const categories = snap.docs.map((d) => categoryFromFirestore(d.data(), d.id));
    callback(categories);
  });
}

export function onUserProfileChange(
  uid: string,
  callback: (profile: Omit<User, "tasks" | "categories">) => void,
): Unsubscribe {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    if (snap.exists()) {
      callback(userProfileFromFirestore(snap.data()));
    }
  });
}
