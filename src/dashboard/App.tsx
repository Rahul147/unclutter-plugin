import React, { useEffect, useState } from 'react';
import { listItems, type SavedItem } from '../db/db';

export default function App() {
  const [items, setItems] = useState<SavedItem[]>([]);
  useEffect(() => {
    void (async () => {
      const all = await listItems();
      setItems(all.sort((a, b) => b.savedAt - a.savedAt));
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">unclutter</h1>
        <p className="text-sm text-gray-600">Save now, read beautifully later.</p>
      </header>
      <main>
        <div className="rounded-2xl bg-white shadow p-6">
          {items.length === 0 ? (
            <p>No saves yet. Use the context menu or shortcut to save the current page.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => (
                <li key={it.id} className="border rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <a href={it.url} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">
                      {it.title || it.url}
                    </a>
                    <span className="text-xs text-gray-500">{new URL(it.url).hostname}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}


