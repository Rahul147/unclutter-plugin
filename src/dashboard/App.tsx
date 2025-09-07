import React, { useEffect, useMemo, useState } from 'react';
import {
  listItems,
  type SavedItem,
  getTagCounts,
  queryItemsByTagsAND,
  queryItemsByTagsOR,
  addTagToItem,
  removeTagFromItem,
  setTagsForItem,
  type TagCount,
} from '../db/db';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Button } from '../components/ui/button';
import TagFilter from './components/TagFilter';
import TagEditor from './components/TagEditor';

export default function App() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [andMode, setAndMode] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [enableTags, setEnableTags] = useState<boolean>(false);
  useEffect(() => {
    void (async () => {
      const all = await listItems();
      setItems(all.sort((a, b) => b.savedAt - a.savedAt));
      try {
        const { enableTags: flag } = await chrome.storage.local.get({ enableTags: false });
        setEnableTags(Boolean(flag));
      } catch {
        setEnableTags(false);
      }
      if (enableTags) {
        const counts = await getTagCounts();
        setTags(counts);
      }
    })();
    // Note: enableTags is intentionally omitted to avoid double fetching during init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (it.title || it.url).toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    void (async () => {
      if (!enableTags || selectedTags.length === 0) {
        const all = await listItems();
        setItems(all.sort((a, b) => b.savedAt - a.savedAt));
        return;
      }
      const result = andMode
        ? await queryItemsByTagsAND(selectedTags)
        : await queryItemsByTagsOR(selectedTags);
      setItems(result.sort((a, b) => b.savedAt - a.savedAt));
    })();
  }, [selectedTags, andMode, enableTags]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const set = new Set(prev);
      if (set.has(tag)) set.delete(tag);
      else set.add(tag);
      return Array.from(set);
    });
  }

  function clearFilters() {
    setSelectedTags([]);
  }

  const allTagNames = useMemo(() => tags.map((t: TagCount) => t.tag), [tags]);

  async function onSetTags(id: string, next: string[]) {
    const updated = await setTagsForItem(id, next);
    if (!updated) return;
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    const counts = await getTagCounts();
    setTags(counts);
  }

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

        <TagFilter
          tags={tags}
          selected={selectedTags}
          isAndMode={andMode}
          onToggleMode={() => setAndMode((v) => !v)}
          onToggleTag={toggleTag}
          onClear={clearFilters}
        />

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
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {(it.tags || []).map((t: string) => (
                          <Badge key={t} variant="secondary">{t}</Badge>
                        ))}
                        <Button size="sm" variant="ghost" onClick={() => setEditingId((id) => (id === it.id ? null : it.id))}>
                          {editingId === it.id ? 'Done' : 'Edit tags'}
                        </Button>
                      </div>
                      {editingId === it.id && (
                        <div style={{ marginTop: 8 }}>
                          <TagEditor
                            value={it.tags || []}
                            suggestions={allTagNames}
                            onChange={(next) => void onSetTags(it.id, next)}
                          />
                        </div>
                      )}
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


