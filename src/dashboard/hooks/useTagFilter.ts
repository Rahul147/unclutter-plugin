import { useCallback, useMemo, useState } from "react";

import type { SavedItem } from "../../db/db";

type UseTagFilterReturn = {
  selectedTags: string[];
  andMode: boolean;
  toggleTag: (tag: string) => void;
  toggleMode: () => void;
  clearFilters: () => void;
  filterItems: (items: SavedItem[]) => SavedItem[];
};

export function useTagFilter(): UseTagFilterReturn {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [andMode, setAndMode] = useState(true);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const set = new Set(prev);
      if (set.has(tag)) {
        set.delete(tag);
      } else {
        set.add(tag);
      }
      return Array.from(set);
    });
  }, []);

  const toggleMode = useCallback(() => {
    setAndMode((v) => !v);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const filterItems = useCallback(
    (items: SavedItem[]): SavedItem[] => {
      if (selectedTags.length === 0) return items;

      const lowerTags = selectedTags.map((t) => t.toLowerCase());

      return items.filter((item) => {
        const itemTags = new Set(
          (item.tags || []).map((t) => t.toLowerCase())
        );

        return andMode
          ? lowerTags.every((t) => itemTags.has(t))
          : lowerTags.some((t) => itemTags.has(t));
      });
    },
    [selectedTags, andMode]
  );

  return {
    selectedTags,
    andMode,
    toggleTag,
    toggleMode,
    clearFilters,
    filterItems,
  };
}
