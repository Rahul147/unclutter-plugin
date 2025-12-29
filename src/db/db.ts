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
      by_category: string;
      by_domainHash: string;
      by_tag: string;
      by_bookmarked: number;
    };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

let dbPromise: Promise<IDBPDatabase<UnclutterDB>> | null = null;

// Reset database connection (for testing)
export async function resetDBConnection(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
  }
  dbPromise = null;
}

// --- Database bootstrap ---
export function getDB(): Promise<IDBPDatabase<UnclutterDB>> {
  if (!dbPromise) {
    dbPromise = openDB<UnclutterDB>("unclutter", 3, {
      upgrade: async (
        db: IDBPDatabase<UnclutterDB>,
        oldVersion: number,
        _newVersion: number,
        tx: IDBPTransaction<UnclutterDB, ArrayLike<"items" | "settings">, "versionchange">
      ) => {
        // v1: Initial schema
        if (oldVersion < 1) {
          const items = db.createObjectStore("items", { keyPath: "id" });
          items.createIndex("by_status", "status", { unique: false });
          items.createIndex("by_savedAt", "savedAt", { unique: false });
          items.createIndex("by_category", "category", { unique: false });
          items.createIndex("by_domainHash", "domainHash", { unique: false });
          db.createObjectStore("settings", { keyPath: "dbVersion" });
        }

        // v2: Add tags index
        if (oldVersion < 2) {
          const items = oldVersion < 1 ? tx.objectStore("items") : tx.objectStore("items");
          if (!items.indexNames.contains("by_tag")) {
            items.createIndex("by_tag", "tags", {
              unique: false,
              multiEntry: true,
            });
          }
        }

        // v3: Add bookmarked index and backfill
        if (oldVersion < 3) {
          const items = tx.objectStore("items");
          if (!items.indexNames.contains("by_bookmarked")) {
            items.createIndex("by_bookmarked", "bookmarked", { unique: false });
          }
          // Backfill existing items with bookmarked = false
          let cursor = await items.openCursor();
          while (cursor) {
            if (typeof cursor.value.bookmarked !== "boolean") {
              await cursor.update({ ...cursor.value, bookmarked: false });
            }
            cursor = await cursor.continue();
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

export async function getItemByUrl(url: string): Promise<SavedItem | null> {
  const db = await getDB();
  const all = await db.getAll("items");
  return all.find((item) => item.url === url) ?? null;
}

export async function toggleBookmark(id: string): Promise<SavedItem | null> {
  const db = await getDB();
  const existing = await db.get("items", id);
  if (!existing) return null;
  const next: SavedItem = { ...existing, bookmarked: !existing.bookmarked };
  await db.put("items", next);
  return next;
}

// --- Tag helpers ---

export type TagCount = { tag: string; count: number };

// Normalize tags: trim, dedupe, remove empty
function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
}

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
  const desired = normalizeTags(tags);
  if (desired.length === 0) return db.getAll("items");
  const byId = new Map<string, SavedItem>();
  try {
    const tx = db.transaction("items");
    const index = tx.store.index("by_tag");
    for (const tag of desired) {
      let cursor = await index.openCursor(tag);
      while (cursor) {
        byId.set(cursor.value.id, cursor.value);
        cursor = await cursor.continue();
      }
    }
    return Array.from(byId.values());
  } catch {
    // Fallback to in-memory filter
    const all = await db.getAll("items");
    const lower = new Set(desired.map((t) => t.toLowerCase()));
    return all.filter((it) =>
      it.tags?.some((t) => lower.has(t.toLowerCase()))
    );
  }
}

export async function queryItemsByTagsAND(
  tags: string[]
): Promise<SavedItem[]> {
  const db = await getDB();
  const desired = normalizeTags(tags);
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
        idsForTag.set(cursor.value.id, cursor.value);
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
    const lowers = desired.map((t) => t.toLowerCase());
    return all.filter((it) => {
      const set = new Set((it.tags || []).map((t) => t.toLowerCase()));
      return lowers.every((t) => set.has(t));
    });
  }
}

export async function setTagsForItem(
  id: string,
  tags: string[]
): Promise<SavedItem | null> {
  const db = await getDB();
  const existing = await db.get("items", id);
  if (!existing) return null;
  const next = { ...existing, tags: normalizeTags(tags) };
  await db.put("items", next);
  return next;
}
