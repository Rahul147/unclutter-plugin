import React from "react";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import type { SavedItem } from "../../db/db";
import { formatIST, formatRelativeAgo } from "../../utils/date";
import TagEditor from "./TagEditor";

type Props = {
  item: SavedItem;
  enableTags: boolean;
  allTagNames: string[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onSetTags: (id: string, tags: string[]) => void;
};

export function ItemCard({
  item,
  enableTags,
  allTagNames,
  onOpen,
  onDelete,
  onToggleBookmark,
  onSetTags,
}: Props) {
  const hostname = new URL(item.url).hostname;
  const relativeTime = formatRelativeAgo(item.savedAt);
  const absoluteTime = formatIST(item.savedAt);

  const handleClick = () => onOpen(item.id);
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(item.id);
  };

  return (
    <Card>
      <CardContent>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="link truncate item-title"
              onClick={handleClick}
            >
              {item.title || item.url}
            </a>

            <span className="meta">
              {hostname}
              {relativeTime && (
                <>
                  {" \u2022 "}
                  <span title={absoluteTime} aria-label={absoluteTime}>
                    {relativeTime}
                  </span>
                </>
              )}
            </span>

            {enableTags && (
              <div style={{ marginTop: 10 }}>
                <TagEditor
                  value={item.tags}
                  suggestions={allTagNames}
                  onChange={(tags) => onSetTags(item.id, tags)}
                />
              </div>
            )}
          </div>

          <div className="card__actions">
            <Button
              size="icon"
              variant="ghost"
              aria-pressed={item.bookmarked}
              title={item.bookmarked ? "Remove bookmark" : "Add bookmark"}
              onClick={() => onToggleBookmark(item.id)}
            >
              {item.bookmarked ? "★" : "☆"}
            </Button>

            <a
              className="btn btn--sm btn--outline"
              href={item.url}
              target="_blank"
              rel="noreferrer"
              onClick={handleClick}
            >
              Open
            </a>

            <Button
              size="sm"
              variant="outline"
              className="btn--danger"
              title="Delete item"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
