import { openDB, DBSchema, IDBPDatabase, IDBPTransaction } from "idb";

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
    };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

let dbPromise: Promise<IDBPDatabase<UnclutterDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<UnclutterDB>> {
  if (!dbPromise) {
    dbPromise = openDB<UnclutterDB>("unclutter", 2, {
      upgrade(
        db: IDBPDatabase<UnclutterDB>,
        oldVersion: number,
        _newVersion: number,
        tx: IDBPTransaction<UnclutterDB, any, "versionchange">
      ) {
        if (oldVersion < 1) {
          const items = db.createObjectStore("items", { keyPath: "id" });
          items.createIndex("by_status", "status", { unique: false });
          items.createIndex("by_savedAt", "savedAt", { unique: false });
          items.createIndex("by_category", "category", { unique: false });
          items.createIndex("by_domainHash", "domainHash", { unique: false });
          // v2 will add by_tag; if we create fresh at v2+, also create by_tag now
          items.createIndex("by_tag", "tags", { unique: false, multiEntry: true });
          db.createObjectStore("settings", { keyPath: "dbVersion" });
        } else if (oldVersion < 2) {
          const items = tx.objectStore("items");
          // Add multiEntry index for tags
          items.createIndex("by_tag", "tags", { unique: false, multiEntry: true });
        }
      },
    });
  }
  return dbPromise!;
}

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

// --- Tag helpers ---

export type TagCount = { tag: string; count: number };

export async function getTagCounts(): Promise<TagCount[]> {
  const db = await getDB();
  const counts = new Map<string, number>();
  try {
    let cursor = await db.transaction("items").store.index("by_tag").openCursor();
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
  const desired = Array.from(new Set(tags.map((t: string) => t.trim()).filter(Boolean)));
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
    return all.filter((it: SavedItem) => it.tags?.some((t: string) => lower.has(t.toLowerCase())));
  }
}

export async function queryItemsByTagsAND(tags: string[]): Promise<SavedItem[]> {
  const db = await getDB();
  const desired = Array.from(new Set(tags.map((t: string) => t.trim()).filter(Boolean)));
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

export async function addTagToItem(id: string, tag: string): Promise<SavedItem | null> {
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

export async function removeTagFromItem(id: string, tag: string): Promise<SavedItem | null> {
  const db = await getDB();
  const existing = await db.get("items", id);
  if (!existing) return null;
  const target = tag.trim();
  const nextTags = (existing.tags || []).filter((t: string) => t !== target);
  const next: SavedItem = { ...existing, tags: nextTags };
  await db.put("items", next);
  return next;
}

export async function setTagsForItem(id: string, tags: string[]): Promise<SavedItem | null> {
  const db = await getDB();
  const existing = await db.get("items", id);
  if (!existing) return null;
  const nextTags = Array.from(new Set(tags.map((t: string) => t.trim()).filter(Boolean)));
  const next: SavedItem = { ...existing, tags: nextTags };
  await db.put("items", next);
  return next;
}
