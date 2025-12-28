import { act, renderHook, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addItem,
  listItems,
  resetDBConnection,
  type SavedItem,
} from "../../db/db";
import { useSavedItems } from "./useSavedItems";

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

describe("useSavedItems", () => {
  beforeEach(async () => {
    await resetDBConnection();
    await deleteDB("unclutter");
    // Mock window.confirm to always return true
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(async () => {
    // Close DB connection to prevent operations from running after test ends
    await resetDBConnection();
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("starts with loading state", () => {
      const { result } = renderHook(() => useSavedItems());
      expect(result.current.isLoading).toBe(true);
    });

    it("loads items from database", async () => {
      const item = createTestItem({ id: "test-1" });
      await addItem(item);

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe("test-1");
    });

    it("sorts items by savedAt descending", async () => {
      const now = Date.now();
      await addItem(createTestItem({ id: "old", savedAt: now - 1000 }));
      await addItem(createTestItem({ id: "new", savedAt: now }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items[0].id).toBe("new");
      expect(result.current.items[1].id).toBe("old");
    });
  });

  describe("counts", () => {
    it("calculates correct counts by status", async () => {
      await addItem(createTestItem({ id: "1", status: "unread" }));
      await addItem(createTestItem({ id: "2", status: "unread" }));
      await addItem(createTestItem({ id: "3", status: "done" }));
      await addItem(
        createTestItem({ id: "4", status: "unread", bookmarked: true })
      );

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.counts.totalNew).toBe(3);
      expect(result.current.counts.totalViewed).toBe(1);
      expect(result.current.counts.totalBookmarked).toBe(1);
    });
  });

  describe("onOpen", () => {
    it("marks item as done and updates lastOpenedAt", async () => {
      await addItem(createTestItem({ id: "test-1", status: "unread" }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.onOpen("test-1");
      });

      expect(result.current.items[0].status).toBe("done");
      expect(result.current.items[0].lastOpenedAt).toBeTruthy();

      // Wait for fire-and-forget DB operation to complete
      await vi.waitFor(async () => {
        const items = await listItems();
        expect(items[0].status).toBe("done");
      });
    });
  });

  describe("onDelete", () => {
    it("removes item from list", async () => {
      await addItem(createTestItem({ id: "test-1" }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
      });

      await act(async () => {
        await result.current.onDelete("test-1");
      });

      expect(result.current.items).toHaveLength(0);
    });

    it("removes item from database", async () => {
      await addItem(createTestItem({ id: "test-1" }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
      });

      await act(async () => {
        await result.current.onDelete("test-1");
      });

      const dbItems = await listItems();
      expect(dbItems).toHaveLength(0);
    });

    it("does not delete when user cancels", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      await addItem(createTestItem({ id: "test-1" }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
      });

      await act(async () => {
        await result.current.onDelete("test-1");
      });

      expect(result.current.items).toHaveLength(1);
    });
  });

  describe("onToggleBookmark", () => {
    it("toggles bookmark from false to true", async () => {
      await addItem(createTestItem({ id: "test-1", bookmarked: false }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
      });

      await act(async () => {
        await result.current.onToggleBookmark("test-1");
      });

      expect(result.current.items[0].bookmarked).toBe(true);

      // Verify database persistence
      const dbItems = await listItems();
      expect(dbItems[0].bookmarked).toBe(true);
    });

    it("toggles bookmark from true to false", async () => {
      await addItem(createTestItem({ id: "test-1", bookmarked: true }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
      });

      await act(async () => {
        await result.current.onToggleBookmark("test-1");
      });

      expect(result.current.items[0].bookmarked).toBe(false);

      // Verify database persistence
      const dbItems = await listItems();
      expect(dbItems[0].bookmarked).toBe(false);
    });

    it("does nothing for non-existent item", async () => {
      await addItem(createTestItem({ id: "test-1", bookmarked: false }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
      });

      await act(async () => {
        await result.current.onToggleBookmark("non-existent");
      });

      // Original item should be unchanged
      expect(result.current.items[0].bookmarked).toBe(false);
    });
  });

  describe("onSetTags", () => {
    it("updates item tags", async () => {
      await addItem(createTestItem({ id: "test-1", tags: [] }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
      });

      await act(async () => {
        await result.current.onSetTags("test-1", ["react", "typescript"]);
      });

      expect(result.current.items[0].tags).toEqual(["react", "typescript"]);
    });

    it("updates tag counts", async () => {
      await addItem(createTestItem({ id: "test-1", tags: [] }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
      });

      await act(async () => {
        await result.current.onSetTags("test-1", ["react"]);
      });

      expect(result.current.tags).toContainEqual({ tag: "react", count: 1 });
    });

    it("does nothing for non-existent item", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["original"] }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
      });

      await act(async () => {
        await result.current.onSetTags("non-existent", ["new-tag"]);
      });

      // Original item should be unchanged
      expect(result.current.items[0].tags).toEqual(["original"]);
    });
  });

  describe("refreshItems", () => {
    it("reloads items from database", async () => {
      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add item directly to database
      await addItem(createTestItem({ id: "new-item" }));

      await act(async () => {
        await result.current.refreshItems();
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe("new-item");
    });
  });

  describe("filterByTags", () => {
    it("filters items by tags with OR mode", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["react"] }));
      await addItem(createTestItem({ id: "test-2", tags: ["vue"] }));
      await addItem(createTestItem({ id: "test-3", tags: ["angular"] }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3);
      });

      await act(async () => {
        await result.current.filterByTags(["react", "vue"], false); // OR mode
      });

      expect(result.current.items).toHaveLength(2);
      const ids = result.current.items.map((i) => i.id);
      expect(ids).toContain("test-1");
      expect(ids).toContain("test-2");
    });

    it("filters items by tags with AND mode", async () => {
      await addItem(
        createTestItem({ id: "test-1", tags: ["react", "typescript"] })
      );
      await addItem(createTestItem({ id: "test-2", tags: ["react"] }));
      await addItem(
        createTestItem({ id: "test-3", tags: ["vue", "typescript"] })
      );

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(3);
      });

      await act(async () => {
        await result.current.filterByTags(["react", "typescript"], true); // AND mode
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe("test-1");
    });

    it("refreshes all items when tags array is empty", async () => {
      await addItem(createTestItem({ id: "test-1", tags: ["react"] }));
      await addItem(createTestItem({ id: "test-2", tags: ["vue"] }));

      const { result } = renderHook(() => useSavedItems());

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2);
      });

      // Filter first
      await act(async () => {
        await result.current.filterByTags(["react"], false);
      });

      expect(result.current.items).toHaveLength(1);

      // Clear filter
      await act(async () => {
        await result.current.filterByTags([], false);
      });

      expect(result.current.items).toHaveLength(2);
    });
  });
});
