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
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">unclutter</h1>
            <p className="text-sm text-muted-foreground">Save now, read beautifully later.</p>
          </div>
          <Badge variant="secondary">{items.length} saved</Badge>
        </div>
        <Separator />
        <div className="flex items-center gap-3">
          <Input placeholder="Search saved pages..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No saves yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Use the context menu or the keyboard shortcut to save the current page.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((it) => (
              <Card key={it.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <a href={it.url} target="_blank" rel="noreferrer" className="font-medium hover:underline truncate block">
                        {it.title || it.url}
                      </a>
                      <span className="text-xs text-muted-foreground">{new URL(it.url).hostname}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={it.url} target="_blank" rel="noreferrer">Open</a>
                      </Button>
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


