// @vitest-environment jsdom
import type { Task, UUID, Category } from "../../types/user";
import {
  mergeTasks,
  mergeCategories,
  compressSyncData,
  decompressSyncData,
  prepareSyncData,
} from "../syncUtils";

// Helper to create a UUID-like string for testing
const uuid = (id: string) => id as UUID;

// Helper to create a minimal task
function makeTask(overrides: Partial<Task> & { id: UUID; name: string }): Task {
  return {
    done: false,
    pinned: false,
    color: "#000",
    date: new Date("2024-01-01"),
    ...overrides,
  };
}

// Helper to create a minimal category
function makeCategory(overrides: Partial<Category> & { id: UUID; name: string }): Category {
  return {
    color: "#000",
    ...overrides,
  };
}

describe("mergeTasks", () => {
  it("merges tasks from two devices with no overlap", () => {
    const local = [makeTask({ id: uuid("a"), name: "Local Task" })];
    const remote = [makeTask({ id: uuid("b"), name: "Remote Task" })];

    const result = mergeTasks(local, remote, [], [], [], []);

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toContain(uuid("a"));
    expect(result.map((t) => t.id)).toContain(uuid("b"));
  });

  it("keeps the newer version when tasks overlap (by lastSave)", () => {
    const local = [
      makeTask({
        id: uuid("a"),
        name: "Old Name",
        lastSave: new Date("2024-01-01"),
      }),
    ];
    const remote = [
      makeTask({
        id: uuid("a"),
        name: "New Name",
        lastSave: new Date("2024-06-01"),
      }),
    ];

    const result = mergeTasks(local, remote, [], [], [], []);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("New Name");
  });

  it("excludes tasks that are in the deleted list", () => {
    const local = [makeTask({ id: uuid("a"), name: "Keep" })];
    const remote = [makeTask({ id: uuid("b"), name: "Deleted" })];

    const result = mergeTasks(local, remote, [], [uuid("b")], [], []);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(uuid("a"));
  });

  it("removes references to deleted categories from tasks", () => {
    const cat: Category = { id: uuid("cat1"), name: "Work", color: "#f00" };
    const local = [makeTask({ id: uuid("a"), name: "Task", category: [cat] })];

    const result = mergeTasks(local, [], [], [], [uuid("cat1")], []);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBeUndefined();
  });

  it("handles empty inputs", () => {
    const result = mergeTasks([], [], [], [], [], []);
    expect(result).toEqual([]);
  });

  it("respects both local and remote deleted lists", () => {
    const local = [makeTask({ id: uuid("a"), name: "A" }), makeTask({ id: uuid("b"), name: "B" })];
    const remote = [makeTask({ id: uuid("c"), name: "C" }), makeTask({ id: uuid("d"), name: "D" })];

    const result = mergeTasks(local, remote, [uuid("c")], [uuid("a")], [], []);

    expect(result).toHaveLength(2);
    const ids = result.map((t) => t.id);
    expect(ids).toContain(uuid("b"));
    expect(ids).toContain(uuid("d"));
    expect(ids).not.toContain(uuid("a"));
    expect(ids).not.toContain(uuid("c"));
  });
});

describe("mergeCategories", () => {
  it("merges categories from two devices with no overlap", () => {
    const local = [makeCategory({ id: uuid("c1"), name: "Work" })];
    const remote = [makeCategory({ id: uuid("c2"), name: "Personal" })];

    const result = mergeCategories(local, remote, [], []);

    expect(result).toHaveLength(2);
  });

  it("keeps the newer version when categories overlap", () => {
    const local = [makeCategory({ id: uuid("c1"), name: "Old", lastSave: new Date("2024-01-01") })];
    const remote = [
      makeCategory({ id: uuid("c1"), name: "Updated", lastSave: new Date("2024-06-01") }),
    ];

    const result = mergeCategories(local, remote, [], []);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Updated");
  });

  it("excludes deleted categories", () => {
    const local = [makeCategory({ id: uuid("c1"), name: "Keep" })];
    const remote = [makeCategory({ id: uuid("c2"), name: "Delete" })];

    const result = mergeCategories(local, remote, [], [uuid("c2")]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(uuid("c1"));
  });

  it("handles empty inputs", () => {
    const result = mergeCategories([], [], [], []);
    expect(result).toEqual([]);
  });
});

describe("compress/decompress roundtrip", () => {
  it("roundtrips sync data correctly", () => {
    const tasks = [
      makeTask({
        id: uuid("t1"),
        name: "Test Task",
        date: new Date("2024-03-15"),
        lastSave: new Date("2024-03-15"),
      }),
    ];
    const categories = [makeCategory({ id: uuid("c1"), name: "Work" })];

    const syncData = prepareSyncData(tasks, [], categories, [], [uuid("c1")]);
    const compressed = compressSyncData(syncData);
    const decompressed = decompressSyncData(compressed);

    expect(decompressed).not.toBeNull();
    expect(decompressed!.tasks).toHaveLength(1);
    expect(decompressed!.tasks[0].name).toBe("Test Task");
    expect(decompressed!.categories).toHaveLength(1);
    expect(decompressed!.categories[0].name).toBe("Work");
    expect(decompressed!.favoriteCategories).toEqual([uuid("c1")]);
    expect(decompressed!.version).toBe(1);
  });

  it("preserves Date objects after roundtrip", () => {
    const tasks = [
      makeTask({
        id: uuid("t1"),
        name: "Task",
        date: new Date("2024-03-15T10:00:00Z"),
        lastSave: new Date("2024-03-15T10:00:00Z"),
        deadline: new Date("2024-04-01T12:00:00Z"),
      }),
    ];

    const syncData = prepareSyncData(tasks, [], [], [], []);
    const compressed = compressSyncData(syncData);
    const decompressed = decompressSyncData(compressed);

    expect(decompressed!.tasks[0].date).toBeInstanceOf(Date);
    expect(decompressed!.tasks[0].lastSave).toBeInstanceOf(Date);
    expect(decompressed!.tasks[0].deadline).toBeInstanceOf(Date);
    expect(decompressed!.lastModified).toBeInstanceOf(Date);
  });

  it("returns null for invalid compressed data", () => {
    const result = decompressSyncData("invalid_data_!!!");
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = decompressSyncData("");
    expect(result).toBeNull();
  });
});
