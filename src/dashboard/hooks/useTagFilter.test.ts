import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useTagFilter } from "./useTagFilter";

describe("useTagFilter", () => {
  describe("initial state", () => {
    it("starts with empty selected tags", () => {
      const { result } = renderHook(() => useTagFilter());
      expect(result.current.selectedTags).toEqual([]);
    });

    it("starts with AND mode enabled", () => {
      const { result } = renderHook(() => useTagFilter());
      expect(result.current.andMode).toBe(true);
    });
  });

  describe("toggleTag", () => {
    it("adds tag when not selected", () => {
      const { result } = renderHook(() => useTagFilter());

      act(() => {
        result.current.toggleTag("react");
      });

      expect(result.current.selectedTags).toEqual(["react"]);
    });

    it("removes tag when already selected", () => {
      const { result } = renderHook(() => useTagFilter());

      act(() => {
        result.current.toggleTag("react");
      });
      act(() => {
        result.current.toggleTag("react");
      });

      expect(result.current.selectedTags).toEqual([]);
    });

    it("handles multiple tags", () => {
      const { result } = renderHook(() => useTagFilter());

      act(() => {
        result.current.toggleTag("react");
      });
      act(() => {
        result.current.toggleTag("typescript");
      });

      expect(result.current.selectedTags).toContain("react");
      expect(result.current.selectedTags).toContain("typescript");
    });
  });

  describe("toggleMode", () => {
    it("toggles from AND to OR mode", () => {
      const { result } = renderHook(() => useTagFilter());

      act(() => {
        result.current.toggleMode();
      });

      expect(result.current.andMode).toBe(false);
    });

    it("toggles back to AND mode", () => {
      const { result } = renderHook(() => useTagFilter());

      act(() => {
        result.current.toggleMode();
      });
      act(() => {
        result.current.toggleMode();
      });

      expect(result.current.andMode).toBe(true);
    });
  });

  describe("clearFilters", () => {
    it("clears all selected tags", () => {
      const { result } = renderHook(() => useTagFilter());

      act(() => {
        result.current.toggleTag("react");
        result.current.toggleTag("typescript");
      });
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.selectedTags).toEqual([]);
    });
  });

  describe("filterItems", () => {
    const items = [
      { id: "1", tags: ["react", "typescript"] },
      { id: "2", tags: ["react"] },
      { id: "3", tags: ["vue", "typescript"] },
      { id: "4", tags: [] },
    ] as Parameters<ReturnType<typeof useTagFilter>["filterItems"]>[0];

    it("returns all items when no tags selected", () => {
      const { result } = renderHook(() => useTagFilter());

      const filtered = result.current.filterItems(items);

      expect(filtered).toHaveLength(4);
    });

    it("filters with AND mode - requires all tags", () => {
      const { result } = renderHook(() => useTagFilter());

      act(() => {
        result.current.toggleTag("react");
        result.current.toggleTag("typescript");
      });

      const filtered = result.current.filterItems(items);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });

    it("filters with OR mode - requires any tag", () => {
      const { result } = renderHook(() => useTagFilter());

      act(() => {
        result.current.toggleTag("react");
        result.current.toggleTag("typescript");
        result.current.toggleMode(); // Switch to OR
      });

      const filtered = result.current.filterItems(items);

      expect(filtered).toHaveLength(3);
      const ids = filtered.map((i) => i.id);
      expect(ids).toContain("1");
      expect(ids).toContain("2");
      expect(ids).toContain("3");
    });

    it("is case insensitive", () => {
      const { result } = renderHook(() => useTagFilter());

      act(() => {
        result.current.toggleTag("REACT");
      });

      const filtered = result.current.filterItems(items);

      expect(filtered).toHaveLength(2);
    });
  });
});
