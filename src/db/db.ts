import type { DBSchema, IDBPDatabase, IDBPTransaction } from "idb";
import { openDB } from "idb";

export type SavedItem = {
  id: string;
  url: string;
  title: string;
  sourceHost: string;
  type: "article" | "video" | "other";
  tags: string[];
  category: string | null;
  status: "unread" | "in_progress" | "done";
  savedAt: number;
  lastOpenedAt: number | null;
  estReadMins: number | null;
  bookmarked: boolean;
  favIconUrl: string | null;
  ogImage: string | null;
  notes: string | null;
  domainHash: string;
};

export type Settings = {
  weeklyReminderEnabled: boolean;
  weeklyReminderDay: number;
  weeklyReminderTime: string; // HH:mm
  categories: string[];
  firstRunCompleted: boolean;
  dbVersion: number;
};

interface UnclutterDB extends DBSchema {
  items: {
    key: string;
    value: SavedItem;
    indexes: {
      by_status: "unread" | "in_progress" | "done";
      by_savedAt: number;
      by_category: string | null;
      by_domainHash: string;
      by_tag: string;
      by_bookmarked: boolean;
    };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

let dbPromise: Promise<IDBPDatabase<UnclutterDB>> | null = null;

// --- Database bootstrap ---
export function getDB(): Promise<IDBPDatabase<UnclutterDB>> {
  if (!dbPromise) {
    dbPromise = openDB<UnclutterDB>("unclutter", 3, {
      upgrade: async (
        db: IDBPDatabase<UnclutterDB>,
        oldVersion: number,
        _newVersion: number,
        tx: IDBPTransaction<UnclutterDB, any, "versionchange">
      ) => {
        if (oldVersion < 1) {
          const items = db.createObjectStore("items", { keyPath: "id" });
          items.createIndex("by_status", "status", { unique: false });
          items.createIndex("by_savedAt", "savedAt", { unique: false });
          items.createIndex("by_category", "category", { unique: false });
          items.createIndex("by_domainHash", "domainHash", { unique: false });
          // v2 will add by_tag; if we create fresh at v2+, also create by_tag now
          items.createIndex("by_tag", "tags", {
            unique: false,
            multiEntry: true,
          });
          // v3 adds bookmark support
          items.createIndex("by_bookmarked", "bookmarked", { unique: false });
          db.createObjectStore("settings", { keyPath: "dbVersion" });
        } else if (oldVersion < 2) {
          const items = tx.objectStore("items");
          // Add multiEntry index for tags
          items.createIndex("by_tag", "tags", {
            unique: false,
            multiEntry: true,
          });
        } else if (oldVersion < 3) {
          const items = tx.objectStore("items");
          // Add index for bookmarked
          items.createIndex("by_bookmarked", "bookmarked", { unique: false });
          // Backfill existing items with bookmarked = false (await within upgrade transaction)
          try {
            let cursor = await items.openCursor();
            while (cursor) {
              const value: any = cursor.value;
              if (typeof value.bookmarked !== "boolean") {
                value.bookmarked = false;
                await cursor.update(value);
              }
              cursor = await cursor.continue();
            }
          } catch {
            // ignore backfill errors during upgrade
          }
        }
      },
    });
  }
  return dbPromise!;
}

// --- Core CRUD ---
export async function addItem(item: SavedItem): Promise<void> {
  const db = await getDB();
  await db.put("items", item);
}

export async function listItems(): Promise<SavedItem[]> {
  const db = await getDB();
  return db.getAll("items");
}

export async function updateItem(
  id: string,
  updates: Partial<SavedItem>
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("items", id);
  if (!existing) return;
  await db.put("items", { ...existing, ...updates });
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("items", id);
}

// --- Counts (deprecated in favor of in-memory counts on dashboard) ---
/**
 * @deprecated Retained for compatibility. Not referenced in repo; compute counts in UI instead.
 */
export async function countUnread(): Promise<number> {
  const db = await getDB();
  let count = 0;
  let cursor = await db
    .transaction("items")
    .store.index("by_status")
    .openCursor("unread");
  while (cursor) {
    count++;
    cursor = await cursor.continue();
  }
  return count;
}

/**
 * @deprecated Retained for compatibility. Not referenced in repo; compute counts in UI instead.
 */
export async function countByStatus(
  status: "unread" | "in_progress" | "done"
): Promise<number> {
  const db = await getDB();
  let count = 0;
  let cursor = await db
    .transaction("items")
    .store.index("by_status")
    .openCursor(status);
  while (cursor) {
    count++;
    cursor = await cursor.continue();
  }
  return count;
}

/**
 * @deprecated Retained for compatibility. Not referenced in repo; prefer UI filter.
 */
export async function countBookmarked(): Promise<number> {
  const db = await getDB();
  let count = 0;
  try {
    let cursor = await db
      .transaction("items")
      .store.index("by_bookmarked")
      .openCursor(true);
    while (cursor) {
      count++;
      cursor = await cursor.continue();
    }
  } catch {
    // Index may not exist yet in some environments
    const all = await db.getAll("items");
    for (const it of all) if ((it as any).bookmarked === true) count++;
  }
  return count;
}

export async function toggleBookmark(id: string): Promise<SavedItem | null> {
  const db = await getDB();
  const existing = await db.get("items", id);
  if (!existing) return null;
  const next: SavedItem = { ...existing, bookmarked: !existing.bookmarked };
  await db.put("items", next);
  return next;
}

// --- Listing helpers (deprecated) ---
/**
 * @deprecated Retained for compatibility. Not referenced in repo; use in-memory filters.
 */
export async function listByStatus(
  status: "unread" | "in_progress" | "done"
): Promise<SavedItem[]> {
  const db = await getDB();
  const results: SavedItem[] = [];
  let cursor = await db
    .transaction("items")
    .store.index("by_status")
    .openCursor(status);
  while (cursor) {
    results.push(cursor.value as SavedItem);
    cursor = await cursor.continue();
  }
  return results;
}

/**
 * @deprecated Retained for compatibility. Not referenced in repo; use in-memory filters.
 */
export async function listBookmarked(): Promise<SavedItem[]> {
  const db = await getDB();
  try {
    const results: SavedItem[] = [];
    let cursor = await db
      .transaction("items")
      .store.index("by_bookmarked")
      .openCursor(true);
    while (cursor) {
      results.push(cursor.value as SavedItem);
      cursor = await cursor.continue();
    }
    return results;
  } catch {
    const all = await db.getAll("items");
    return all.filter((it: any) => it.bookmarked === true) as SavedItem[];
  }
}

// --- Tag helpers ---

export type TagCount = { tag: string; count: number };

export async function getTagCounts(): Promise<TagCount[]> {
  const db = await getDB();
  const counts = new Map<string, number>();
  try {
    let cursor = await db
      .transaction("items")
      .store.index("by_tag")
      .openCursor();
    while (cursor) {
      const tagKey = String(cursor.key || "");
      if (tagKey) counts.set(tagKey, (counts.get(tagKey) || 0) + 1);
      cursor = await cursor.continue();
    }
  } catch {
    // Fallback if index missing: compute from all items
    const all = await db.getAll("items");
    for (const it of all) {
      for (const t of it.tags || []) {
        if (!t) continue;
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function queryItemsByTagsOR(tags: string[]): Promise<SavedItem[]> {
  const db = await getDB();
  const desired = Array.from(
    new Set(tags.map((t: string) => t.trim()).filter(Boolean))
  );
  if (desired.length === 0) return db.getAll("items");
  const byId = new Map<string, SavedItem>();
  try {
    const tx = db.transaction("items");
    const index = tx.store.index("by_tag");
    for (const tag of desired) {
      let cursor = await index.openCursor(tag);
      while (cursor) {
        const item = cursor.value as SavedItem;
        byId.set(item.id, item);
        cursor = await cursor.continue();
      }
    }
    return Array.from(byId.values());
  } catch {
    // Fallback to in-memory filter
    const all = await db.getAll("items");
    const lower = new Set(desired.map((t: string) => t.toLowerCase()));
    return all.filter((it: SavedItem) =>
      it.tags?.some((t: string) => lower.has(t.toLowerCase()))
    );
  }
}

export async function queryItemsByTagsAND(
  tags: string[]
): Promise<SavedItem[]> {
  const db = await getDB();
  const desired = Array.from(
    new Set(tags.map((t: string) => t.trim()).filter(Boolean))
  );
  if (desired.length === 0) return db.getAll("items");
  try {
    const tx = db.transaction("items");
    const index = tx.store.index("by_tag");
    let current = new Map<string, SavedItem>();
    // Seed with first tag
    let first = true;
    for (const tag of desired) {
      const idsForTag = new Map<string, SavedItem>();
      let cursor = await index.openCursor(tag);
      while (cursor) {
        const item = cursor.value as SavedItem;
        idsForTag.set(item.id, item);
        cursor = await cursor.continue();
      }
      if (first) {
        current = idsForTag;
        first = false;
      } else {
        // Intersect
        for (const id of Array.from(current.keys())) {
          if (!idsForTag.has(id)) current.delete(id);
        }
      }
      if (current.size === 0) break;
    }
    return Array.from(current.values());
  } catch {
    // Fallback to in-memory AND filter
    const all = await db.getAll("items");
    const lowers = desired.map((t: string) => t.toLowerCase());
    return all.filter((it: SavedItem) => {
      const set = new Set((it.tags || []).map((t: string) => t.toLowerCase()));
      return lowers.every((t: string) => set.has(t));
    });
  }
}

export async function addTagToItem(
  id: string,
  tag: string
): Promise<SavedItem | null> {
  const clean = tag.trim();
  if (!clean) return null;
  const db = await getDB();
  const existing = await db.get("items", id);
  if (!existing) return null;
  const nextTags = Array.from(new Set([...(existing.tags || []), clean]));
  const next: SavedItem = { ...existing, tags: nextTags };
  await db.put("items", next);
  return next;
}

export async function removeTagFromItem(
  id: string,
  tag: string
): Promise<SavedItem | null> {
  const db = await getDB();
  const existing = await db.get("items", id);
  if (!existing) return null;
  const target = tag.trim();
  const nextTags = (existing.tags || []).filter((t: string) => t !== target);
  const next: SavedItem = { ...existing, tags: nextTags };
  await db.put("items", next);
  return next;
}

export async function setTagsForItem(
  id: string,
  tags: string[]
): Promise<SavedItem | null> {
  const db = await getDB();
  const existing = await db.get("items", id);
  if (!existing) return null;
  const nextTags = Array.from(
    new Set(tags.map((t: string) => t.trim()).filter(Boolean))
  );
  const next: SavedItem = { ...existing, tags: nextTags };
  await db.put("items", next);
  return next;
}
