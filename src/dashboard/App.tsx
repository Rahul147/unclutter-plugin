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
  updateItem,
  toggleBookmark,
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
  const [tab, setTab] = useState<'new' | 'viewed' | 'bookmarked'>('new');
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
  const tabFiltered = useMemo(() => {
    if (tab === 'new') return items.filter((it: SavedItem) => it.status === 'unread');
    if (tab === 'viewed') return items.filter((it: SavedItem) => it.status === 'done');
    return items.filter((it: SavedItem) => it.bookmarked === true);
  }, [items, tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tabFiltered;
    return tabFiltered.filter((it: SavedItem) => (it.title || it.url).toLowerCase().includes(q));
  }, [tabFiltered, query]);

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
    setSelectedTags((prev: string[]) => {
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
    setItems((prev: SavedItem[]) => prev.map((it: SavedItem) => (it.id === id ? updated : it)));
    const counts = await getTagCounts();
    setTags(counts);
  }

  const counts = useMemo(() => {
    const totalNew = items.filter((it: SavedItem) => it.status === 'unread').length;
    const totalViewed = items.filter((it: SavedItem) => it.status === 'done').length;
    const totalBookmarked = items.filter((it: SavedItem) => it.bookmarked === true).length;
    return { totalNew, totalViewed, totalBookmarked };
  }, [items]);

  async function onOpen(id: string) {
    const now = Date.now();
    // Persist and optimistically update UI
    void updateItem(id, { status: 'done', lastOpenedAt: now });
    setItems((prev: SavedItem[]) => prev.map((it: SavedItem) => (it.id === id ? { ...it, status: 'done', lastOpenedAt: now } : it)));
  }

  async function onToggleBookmark(id: string) {
    const updated = await toggleBookmark(id);
    if (!updated) return;
    setItems((prev: SavedItem[]) => prev.map((it: SavedItem) => (it.id === id ? updated : it)));
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
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <div className="tabs" role="tablist">
            <Button
              role="tab"
              aria-selected={tab === 'new'}
              variant={tab === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab('new')}
            >
              New ({counts.totalNew})
            </Button>
            <Button
              role="tab"
              aria-selected={tab === 'viewed'}
              variant={tab === 'viewed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab('viewed')}
            >
              Viewed ({counts.totalViewed})
            </Button>
            <Button
              role="tab"
              aria-selected={tab === 'bookmarked'}
              variant={tab === 'bookmarked' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab('bookmarked')}
            >
              Bookmarked ({counts.totalBookmarked})
            </Button>
          </div>
          <div style={{ flex: 1 }} />
          <Input placeholder="Search saved pages..." value={query} onChange={(e: any) => setQuery(e.target.value)} />
        </div>

        <TagFilter
          tags={tags}
          selected={selectedTags}
          isAndMode={andMode}
          onToggleMode={() => setAndMode((v: boolean) => !v)}
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
            {filtered.map((it: SavedItem) => (
              <Card key={it.id}>
                <CardContent>
                  <div className="row" style={{ alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <a href={it.url} target="_blank" rel="noreferrer" className="link truncate" onClick={() => void onOpen(it.id)}>
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
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-pressed={it.bookmarked ? true : false}
                        title={it.bookmarked ? 'Remove bookmark' : 'Add bookmark'}
                        onClick={() => void onToggleBookmark(it.id)}
                      >
                        {it.bookmarked ? '★' : '☆'}
                      </Button>
                      <a className="btn btn--sm btn--outline" href={it.url} target="_blank" rel="noreferrer" onClick={() => void onOpen(it.id)}>Open</a>
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


