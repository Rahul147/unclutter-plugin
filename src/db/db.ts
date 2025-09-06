import { openDB, DBSchema, IDBPDatabase } from "idb";

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
    dbPromise = openDB<UnclutterDB>("unclutter", 1, {
      upgrade(db, oldVersion, _newVersion, _tx) {
        if (oldVersion < 1) {
          const items = db.createObjectStore("items", { keyPath: "id" });
          items.createIndex("by_status", "status", { unique: false });
          items.createIndex("by_savedAt", "savedAt", { unique: false });
          items.createIndex("by_category", "category", { unique: false });
          items.createIndex("by_domainHash", "domainHash", { unique: false });
          db.createObjectStore("settings", { keyPath: "dbVersion" });
        }
      },
    });
  }
  return dbPromise;
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
