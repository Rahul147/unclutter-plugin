import React from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import type { TagCount } from "../../db/db";

export interface TagFilterProps {
  tags: TagCount[];
  selected: string[];
  isAndMode: boolean;
  onToggleMode: () => void;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}

export function TagFilter({ tags, selected, isAndMode, onToggleMode, onToggleTag, onClear }: TagFilterProps) {
  // Use exact match to avoid marking differently-cased tags as selected simultaneously
  const selectedSet = new Set(selected);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="label">Tags</span>
        <Separator orientation="vertical" />
        {tags.length === 0 ? (
          <span className="caption">No tags yet — add tags to start filtering</span>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tags.map(({ tag, count }: TagCount) => {
              const isSelected = selectedSet.has(tag);
              return (
                <Badge
                  key={tag}
                  variant={isSelected ? "default" : "secondary"}
                  className="badge--clickable"
                  onClick={() => onToggleTag(tag)}
                  title={isSelected ? "Remove filter" : "Filter by tag"}
                >
                  {tag} <span className="meta" style={{ marginTop: 0, marginLeft: 4 }}>({count})</span>
                </Badge>
              );
            })}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" onClick={onToggleMode} title="Toggle AND/OR">
          {isAndMode ? "AND" : "OR"}
        </Button>
        {selected.length > 0 && (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

export default TagFilter;

