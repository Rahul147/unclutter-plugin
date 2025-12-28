import React, { useEffect, useMemo, useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import type { SavedItem } from "../db/db";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ItemCard } from "./components/ItemCard";
import TagFilter from "./components/TagFilter";
import { useSavedItems, useSettings, useTagFilter, useTheme, type TabType } from "./hooks";

function Dashboard() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { enableTags } = useSettings();
  const {
    items,
    tags,
    counts,
    onOpen,
    onDelete,
    onToggleBookmark,
    onSetTags,
    filterByTags,
  } = useSavedItems();
  const {
    selectedTags,
    andMode,
    toggleTag,
    toggleMode,
    clearFilters,
    filterItems,
  } = useTagFilter();

  const [tab, setTab] = useState<TabType>("new");
  const [query, setQuery] = useState("");

  // Re-fetch when tag filter changes
  useEffect(() => {
    filterByTags(selectedTags, andMode);
  }, [selectedTags, andMode, filterByTags]);

  // Filter items by tab
  const tabFiltered = useMemo(() => {
    if (tab === "new") return items.filter((it) => it.status === "unread");
    if (tab === "viewed") return items.filter((it) => it.status === "done");
    return items.filter((it) => it.bookmarked);
  }, [items, tab]);

  // Apply tag filter
  const tagFiltered = useMemo(
    () => filterItems(tabFiltered),
    [tabFiltered, filterItems]
  );

  // Apply search filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tagFiltered;
    return tagFiltered.filter((it) =>
      (it.title || it.url).toLowerCase().includes(q)
    );
  }, [tagFiltered, query]);

  const allTagNames = useMemo(() => tags.map((t) => t.tag), [tags]);

  return (
    <div className="app">
      <div className="container">
        <Header
          itemCount={items.length}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        <Separator />

        <div className="row" style={{ alignItems: "center", gap: 8 }}>
          <TabNavigation tab={tab} counts={counts} onTabChange={setTab} />
          <div style={{ flex: 1 }} />
          <Input
            placeholder="Search saved pages..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
          />
        </div>

        <TagFilter
          tags={tags}
          selected={selectedTags}
          isAndMode={andMode}
          onToggleMode={toggleMode}
          onToggleTag={toggleTag}
          onClear={clearFilters}
        />

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                enableTags={enableTags}
                allTagNames={allTagNames}
                onOpen={onOpen}
                onDelete={onDelete}
                onToggleBookmark={onToggleBookmark}
                onSetTags={onSetTags}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type HeaderProps = {
  itemCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
};

function Header({ itemCount, isDark, onToggleTheme }: HeaderProps) {
  return (
    <div className="row">
      <div className="stack">
        <h1 className="heading">unclutter</h1>
        <p className="subtle">Save now, read beautifully later.</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Badge variant="secondary">{itemCount} saved</Badge>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Toggle theme"
          title={isDark ? "Switch to light" : "Switch to dark"}
          onClick={onToggleTheme}
        >
          {isDark ? "☀︎" : "☾"}
        </Button>
      </div>
    </div>
  );
}

type TabNavigationProps = {
  tab: TabType;
  counts: { totalNew: number; totalViewed: number; totalBookmarked: number };
  onTabChange: (tab: TabType) => void;
};

function TabNavigation({ tab, counts, onTabChange }: TabNavigationProps) {
  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "new", label: "New", count: counts.totalNew },
    { id: "viewed", label: "Viewed", count: counts.totalViewed },
    { id: "bookmarked", label: "Bookmarked", count: counts.totalBookmarked },
  ];

  return (
    <div className="tabs" role="tablist">
      {tabs.map(({ id, label, count }) => (
        <Button
          key={id}
          role="tab"
          aria-selected={tab === id}
          variant={tab === id ? "default" : "outline"}
          size="sm"
          onClick={() => onTabChange(id)}
        >
          {label} ({count})
        </Button>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No saves yet</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="subtle">
          Use the context menu or the keyboard shortcut to save the current
          page.
        </p>
      </CardContent>
    </Card>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
