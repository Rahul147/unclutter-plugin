import React, { useEffect, useMemo, useState } from 'react';
import { listItems, type SavedItem } from '../db/db';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Button } from '../components/ui/button';

export default function App() {
  const [items, setItems] = useState<SavedItem[]>([]);
  useEffect(() => {
    void (async () => {
      const all = await listItems();
      setItems(all.sort((a, b) => b.savedAt - a.savedAt));
    })();
  }, []);

  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (it.title || it.url).toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="app">
      <div className="container">
        <div className="row">
          <div className="stack">
            <h1 className="heading">unclutter</h1>
            <p className="subtle">Save now, read beautifully later.</p>
          </div>
          <Badge variant="secondary">{items.length} saved</Badge>
        </div>
        <Separator />
        <div className="row" style={{ alignItems: 'center' }}>
          <Input placeholder="Search saved pages..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No saves yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="subtle">Use the context menu or the keyboard shortcut to save the current page.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid">
            {filtered.map((it) => (
              <Card key={it.id}>
                <CardContent>
                  <div className="row" style={{ alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <a href={it.url} target="_blank" rel="noreferrer" className="link truncate">
                        {it.title || it.url}
                      </a>
                      <span className="meta">{new URL(it.url).hostname}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a className="btn btn--sm btn--outline" href={it.url} target="_blank" rel="noreferrer">Open</a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


