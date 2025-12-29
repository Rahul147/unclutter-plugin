import React from "react";

import type { SavedItem } from "../../db/db";

export function useTagFilter() {
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [andMode, setAndMode] = React.useState(true);

  const toggleTag = React.useCallback((tag: string) => {
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

  const toggleMode = React.useCallback(() => {
    setAndMode((v) => !v);
  }, []);

  const clearFilters = React.useCallback(() => {
    setSelectedTags([]);
  }, []);

  const filterItems = React.useCallback(
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
