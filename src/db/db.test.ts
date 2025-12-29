import { deleteDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addItem,
  deleteItem,
  getDB,
  getItemByUrl,
  getTagCounts,
  listItems,
  queryItemsByTagsAND,
  queryItemsByTagsOR,
  resetDBConnection,
  type SavedItem,
  setTagsForItem,
  toggleBookmark,
  updateItem,
} from "./db";

function createTestItem(overrides: Partial<SavedItem> = {}): SavedItem {
  const now = Date.now();
  return {
    id: `test-${now}-${Math.random()}`,
    url: "https://example.com/article",
    title: "Test Article",
    sourceHost: "example.com",
    type: "article",
    tags: [],
    category: null,
    status: "unread",
    savedAt: now,
    lastOpenedAt: null,
    estReadMins: null,
    bookmarked: false,
    favIconUrl: null,
    ogImage: null,
    notes: null,
    domainHash: "abc123",
    ...overrides,
  };
}

describe("db", () => {
  beforeEach(async () => {
    await resetDBConnection();
    await deleteDB("unclutter");
  });

  afterEach(async () => {
    await resetDBConnection();
  });

  describe("getDB", () => {
    it("creates database with correct version", async () => {
      const db = await getDB();
      expect(db.name).toBe("unclutter");
      expect(db.version).toBe(3);
    });

    it("creates items object store", async () => {
      const db = await getDB();
      expect(db.objectStoreNames.contains("items")).toBe(true);
    });

    it("creates settings object store", async () => {
      const db = await getDB();
      expect(db.objectStoreNames.contains("settings")).toBe(true);
    });

    it("returns same instance on subsequent calls", async () => {
      const db1 = await getDB();
      const db2 = await getDB();
      expect(db1).toBe(db2);
    });
  });

  describe("addItem", () => {
    it("adds an item to the database", async () => {
      const item = createTestItem({ id: "test-1" });
      await addItem(item);

      const items = await listItems();
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(item);
    });

    it("overwrites existing item with same id", async () => {
      const item1 = createTestItem({ id: "test-1", title: "Original" });
      const item2 = createTestItem({ id: "test-1", title: "Updated" });

      await addItem(item1);
      await addItem(item2);

      const items = await listItems();
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe("Updated");
    });
  });

  describe("listItems", () => {
    it("returns empty array when no items", async () => {
      const items = await listItems();
      expect(items).toEqual([]);
    });

    it("returns all items", async () => {
      await addItem(createTestItem({ id: "test-1" }));
      await addItem(createTestItem({ id: "test-2" }));
      await addItem(createTestItem({ id: "test-3" }));

      const items = await listItems();
      expect(items).toHaveLength(3);
    });
  });

  describe("updateItem", () => {
    it("updates existing item", async () => {
      const item = createTestItem({ id: "test-1", title: "Original" });
      await addItem(item);

      await updateItem("test-1", { title: "Updated", status: "done" });

      const items = await listItems();
      expect(items[0].title).toBe("Updated");
      expect(items[0].status).toBe("done");
      expect(items[0].url).toBe(item.url); // unchanged
    });

    it("does nothing for non-existent item", async () => {
      await updateItem("non-existent", { title: "Updated" });
      const items = await listItems();
      expect(items).toHaveLength(0);
    });
  });

  describe("deleteItem", () => {
    it("removes item from database", async () => {
      await addItem(createTestItem({ id: "test-1" }));
      await addItem(createTestItem({ id: "test-2" }));

      await deleteItem("test-1");

      const items = await listItems();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("test-2");
    });

    it("does nothing for non-existent item", async () => {
      await addItem(createTestItem({ id: "test-1" }));
      await deleteItem("non-existent");

      const items = await listItems();
      expect(items).toHaveLength(1);
    });
  });

  describe("getItemByUrl", () => {
    it("finds item by URL", async () => {
      const item = createTestItem({
        id: "test-1",
        url: "https://example.com/specific",
      });
      await addItem(item);

      const found = await getItemByUrl("https://example.com/specific");
      expect(found).toEqual(item);
    });

    it("returns null when URL not found", async () => {
      await addItem(createTestItem({ id: "test-1" }));

      const found = await getItemByUrl("https://notfound.com");
      expect(found).toBeNull();
    });

    it("returns null when database is empty", async () => {
      const found = await getItemByUrl("https://example.com");
      expect(found).toBeNull();
    });
  });

  describe("toggleBookmark", () => {
    it("toggles bookmarked from false to true", async () => {
      await addItem(createTestItem({ id: "test-1", bookmarked: false }));

      const result = await toggleBookmark("test-1");

      expect(result?.bookmarked).toBe(true);
      const items = await listItems();
      expect(items[0].bookmarked).toBe(true);
    });

    it("toggles bookmarked from true to false", async () => {
      await addItem(createTestItem({ id: "test-1", bookmarked: true }));

      const result = await toggleBookmark("test-1");

      expect(result?.bookmarked).toBe(false);

      // Verify database persistence
      const items = await listItems();
      expect(items[0].bookmarked).toBe(false);
    });

    it("returns null for non-existent item", async () => {
      const result = await toggleBookmark("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("setTagsForItem", () => {
    it("sets tags for an item", async () => {
      await addItem(createTestItem({ id: "test-1", tags: [] }));

      const result = await setTagsForItem("test-1", ["react", "typescript"]);

      expect(result?.tags).toEqual(["react", "typescript"]);
    });

    it("replaces existing tags", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["old"] }));

      const result = await setTagsForItem("test-1", ["new"]);

      expect(result?.tags).toEqual(["new"]);
    });

    it("removes duplicates and trims whitespace", async () => {
      await addItem(createTestItem({ id: "test-1" }));

      const result = await setTagsForItem("test-1", [
        "  react  ",
        "react",
        "typescript",
        "",
      ]);

      expect(result?.tags).toEqual(["react", "typescript"]);
    });

    it("returns null for non-existent item", async () => {
      const result = await setTagsForItem("non-existent", ["tag"]);
      expect(result).toBeNull();
    });
  });

  describe("getTagCounts", () => {
    it("returns empty array when no items", async () => {
      const counts = await getTagCounts();
      expect(counts).toEqual([]);
    });

    it("counts tags across all items", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["react", "js"] }));
      await addItem(createTestItem({ id: "test-2", tags: ["react", "ts"] }));
      await addItem(createTestItem({ id: "test-3", tags: ["vue"] }));

      const counts = await getTagCounts();

      const reactCount = counts.find((c) => c.tag === "react");
      const jsCount = counts.find((c) => c.tag === "js");
      const vueCount = counts.find((c) => c.tag === "vue");

      expect(reactCount?.count).toBe(2);
      expect(jsCount?.count).toBe(1);
      expect(vueCount?.count).toBe(1);
    });

    it("sorts by count descending, then alphabetically", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["zebra", "apple"] }));
      await addItem(createTestItem({ id: "test-2", tags: ["apple"] }));

      const counts = await getTagCounts();

      expect(counts[0].tag).toBe("apple"); // count: 2
      expect(counts[1].tag).toBe("zebra"); // count: 1
    });
  });

  describe("queryItemsByTagsOR", () => {
    it("returns all items when no tags specified", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["react"] }));
      await addItem(createTestItem({ id: "test-2", tags: ["vue"] }));

      const items = await queryItemsByTagsOR([]);

      expect(items).toHaveLength(2);
    });

    it("returns items matching any of the tags", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["react"] }));
      await addItem(createTestItem({ id: "test-2", tags: ["vue"] }));
      await addItem(createTestItem({ id: "test-3", tags: ["angular"] }));

      const items = await queryItemsByTagsOR(["react", "vue"]);

      expect(items).toHaveLength(2);
      const ids = items.map((i) => i.id);
      expect(ids).toContain("test-1");
      expect(ids).toContain("test-2");
    });

    it("handles items with multiple matching tags without duplicates", async () => {
      await addItem(
        createTestItem({ id: "test-1", tags: ["react", "typescript"] })
      );

      const items = await queryItemsByTagsOR(["react", "typescript"]);

      expect(items).toHaveLength(1);
    });

    it("trims and filters empty tags", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["react"] }));

      const items = await queryItemsByTagsOR(["  react  ", "", "  "]);

      expect(items).toHaveLength(1);
    });
  });

  describe("queryItemsByTagsAND", () => {
    it("returns all items when no tags specified", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["react"] }));
      await addItem(createTestItem({ id: "test-2", tags: ["vue"] }));

      const items = await queryItemsByTagsAND([]);

      expect(items).toHaveLength(2);
    });

    it("returns only items matching all tags", async () => {
      await addItem(
        createTestItem({ id: "test-1", tags: ["react", "typescript"] })
      );
      await addItem(createTestItem({ id: "test-2", tags: ["react"] }));
      await addItem(
        createTestItem({ id: "test-3", tags: ["vue", "typescript"] })
      );

      const items = await queryItemsByTagsAND(["react", "typescript"]);

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("test-1");
    });

    it("returns empty array when no items match all tags", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["react"] }));
      await addItem(createTestItem({ id: "test-2", tags: ["vue"] }));

      const items = await queryItemsByTagsAND(["react", "vue"]);

      expect(items).toHaveLength(0);
    });

    it("handles single tag same as OR query", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["react"] }));
      await addItem(createTestItem({ id: "test-2", tags: ["vue"] }));

      const items = await queryItemsByTagsAND(["react"]);

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("test-1");
    });
  });

  describe("index fallback behavior", () => {
    it("getTagCounts falls back to in-memory when index access throws", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["react", "js"] }));
      await addItem(createTestItem({ id: "test-2", tags: ["react", "ts"] }));
      await addItem(createTestItem({ id: "test-3", tags: ["vue"] }));

      const db = await getDB();
      const originalTransaction = db.transaction.bind(db);

      // Mock transaction to throw when accessing index
      vi.spyOn(db, "transaction").mockImplementation((storeNames, mode?) => {
        const tx = originalTransaction(storeNames, mode);
        const originalStore = tx.store;
        Object.defineProperty(tx, "store", {
          get() {
            return Object.assign({}, originalStore, {
              index: () => {
                throw new Error("Simulated index missing");
              },
            });
          },
        });
        return tx;
      });

      const counts = await getTagCounts();

      // Should still compute correct counts via fallback
      const reactCount = counts.find((c) => c.tag === "react");
      const jsCount = counts.find((c) => c.tag === "js");
      const vueCount = counts.find((c) => c.tag === "vue");

      expect(reactCount?.count).toBe(2);
      expect(jsCount?.count).toBe(1);
      expect(vueCount?.count).toBe(1);

      vi.restoreAllMocks();
    });

    it("queryItemsByTagsOR falls back to in-memory filter when index throws", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["react"] }));
      await addItem(createTestItem({ id: "test-2", tags: ["vue"] }));
      await addItem(createTestItem({ id: "test-3", tags: ["angular"] }));

      const db = await getDB();
      const originalTransaction = db.transaction.bind(db);

      vi.spyOn(db, "transaction").mockImplementation((storeNames, mode?) => {
        const tx = originalTransaction(storeNames, mode);
        const originalStore = tx.store;
        Object.defineProperty(tx, "store", {
          get() {
            return Object.assign({}, originalStore, {
              index: () => {
                throw new Error("Simulated index missing");
              },
            });
          },
        });
        return tx;
      });

      const items = await queryItemsByTagsOR(["react", "vue"]);

      // Fallback should still filter correctly
      expect(items).toHaveLength(2);
      const ids = items.map((i) => i.id);
      expect(ids).toContain("test-1");
      expect(ids).toContain("test-2");

      vi.restoreAllMocks();
    });

    it("queryItemsByTagsAND falls back to in-memory AND filter when index throws", async () => {
      await addItem(
        createTestItem({ id: "test-1", tags: ["react", "typescript"] })
      );
      await addItem(createTestItem({ id: "test-2", tags: ["react"] }));
      await addItem(
        createTestItem({ id: "test-3", tags: ["vue", "typescript"] })
      );

      const db = await getDB();
      const originalTransaction = db.transaction.bind(db);

      vi.spyOn(db, "transaction").mockImplementation((storeNames, mode?) => {
        const tx = originalTransaction(storeNames, mode);
        const originalStore = tx.store;
        Object.defineProperty(tx, "store", {
          get() {
            return Object.assign({}, originalStore, {
              index: () => {
                throw new Error("Simulated index missing");
              },
            });
          },
        });
        return tx;
      });

      const items = await queryItemsByTagsAND(["react", "typescript"]);

      // Fallback should return only items with ALL tags
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("test-1");

      vi.restoreAllMocks();
    });

  });
});
