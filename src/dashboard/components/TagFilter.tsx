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
        <strong style={{ fontSize: 12, opacity: 0.8 }}>Tags</strong>
        <Separator orientation="vertical" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tags.map(({ tag, count }: TagCount) => {
            const isSelected = selectedSet.has(tag);
            return (
              <div
                key={tag}
                role="button"
                aria-pressed={isSelected}
                onClick={() => onToggleTag(tag.toLowerCase())}
                style={{ cursor: "pointer" }}
                title={isSelected ? "Remove filter" : "Filter by tag"}
              >
                <Badge variant={isSelected ? "default" : "secondary"}>
                  {tag} <span style={{ opacity: 0.7 }}>({count})</span>
                </Badge>
              </div>
            );
          })}
        </div>
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

