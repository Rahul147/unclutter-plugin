import React from "react";

import {
  deleteItem,
  getTagCounts,
  listItems,
  queryItemsByTagsAND,
  queryItemsByTagsOR,
  type SavedItem,
  setTagsForItem,
  type TagCount,
  toggleBookmark,
  updateItem,
} from "../../db/db";

export type TabType = "new" | "viewed" | "bookmarked";

type UseSavedItemsReturn = {
  items: SavedItem[];
  tags: TagCount[];
  isLoading: boolean;
  counts: { totalNew: number; totalViewed: number; totalBookmarked: number };
  onOpen: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleBookmark: (id: string) => Promise<void>;
  onSetTags: (id: string, tags: string[]) => Promise<void>;
  refreshItems: () => Promise<void>;
  filterByTags: (tags: string[], andMode: boolean) => Promise<void>;
};

export function useSavedItems(): UseSavedItemsReturn {
  const [items, setItems] = React.useState<SavedItem[]>([]);
  const [tags, setTags] = React.useState<TagCount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshItems = React.useCallback(async () => {
    const all = await listItems();
    setItems(all.sort((a, b) => b.savedAt - a.savedAt));
    const counts = await getTagCounts();
    setTags(counts);
  }, []);

  React.useEffect(() => {
    setIsLoading(true);
    void refreshItems().finally(() => setIsLoading(false));
  }, [refreshItems]);

  const counts = React.useMemo(() => {
    const totalNew = items.filter((it) => it.status === "unread").length;
    const totalViewed = items.filter((it) => it.status === "done").length;
    const totalBookmarked = items.filter((it) => it.bookmarked).length;
    return { totalNew, totalViewed, totalBookmarked };
  }, [items]);

  const onOpen = React.useCallback((id: string) => {
    const now = Date.now();
    void updateItem(id, { status: "done", lastOpenedAt: now });
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, status: "done", lastOpenedAt: now } : it
      )
    );
  }, []);

  const onDelete = React.useCallback(
    async (id: string) => {
      const ok = window.confirm("Delete this item?");
      if (!ok) return;

      const prevItems = items;
      setItems((prev) => prev.filter((it) => it.id !== id));

      try {
        await deleteItem(id);
        const counts = await getTagCounts();
        setTags(counts);
      } catch {
        setItems(prevItems);
        alert("Failed to delete");
      }
    },
    [items]
  );

  const onToggleBookmark = React.useCallback(async (id: string) => {
    const updated = await toggleBookmark(id);
    if (!updated) return;
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
  }, []);

  const onSetTags = React.useCallback(async (id: string, nextTags: string[]) => {
    const updated = await setTagsForItem(id, nextTags);
    if (!updated) return;
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    const counts = await getTagCounts();
    setTags(counts);
  }, []);

  const filterByTags = React.useCallback(async (selectedTags: string[], andMode: boolean) => {
    if (selectedTags.length === 0) {
      await refreshItems();
      return;
    }
    const result = andMode
      ? await queryItemsByTagsAND(selectedTags)
      : await queryItemsByTagsOR(selectedTags);
    setItems(result.sort((a, b) => b.savedAt - a.savedAt));
  }, [refreshItems]);

  return {
    items,
    tags,
    isLoading,
    counts,
    onOpen,
    onDelete,
    onToggleBookmark,
    onSetTags,
    refreshItems,
    filterByTags,
  };
}
