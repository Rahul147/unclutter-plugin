import React, { useMemo, useRef, useState } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

export interface TagEditorProps {
  value: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
}

export function TagEditor({ value, suggestions, onChange }: TagEditorProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const valueSet = useMemo(() => new Set(value.map((t: string) => t.toLowerCase())), [value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = suggestions.filter((s: string) => !valueSet.has(s.toLowerCase()));
    if (!q) return base.slice(0, 8);
    return base.filter((s: string) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [query, suggestions, valueSet]);

  function add(tag: string) {
    const clean = tag.trim();
    if (!clean) return;
    const next = Array.from(new Set([...value, clean]));
    onChange(next);
    setQuery("");
    inputRef.current?.focus();
  }

  function remove(tag: string) {
    const next = value.filter((t: string) => t !== tag);
    onChange(next);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add(query);
    } else if (e.key === "Backspace" && !query) {
      // Remove last tag quickly
      if (value.length > 0) remove(value[value.length - 1]);
    }
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {value.map((tag: string) => (
          <Badge key={tag} variant="default">
            <span>{tag}</span>
            <button
              className="btn btn--icon btn--ghost"
              aria-label={`Remove ${tag}`}
              onClick={() => remove(tag)}
              style={{ marginLeft: 6 }}
            >
              ×
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Add tag…"
          className="input"
        />
      </div>
      {filtered.length > 0 && (
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {filtered.map((s: string) => (
            <Button key={s} size="sm" variant="ghost" onClick={() => add(s)}>
              {s}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export default TagEditor;

