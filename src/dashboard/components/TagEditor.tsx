import React from "react";
import { Input } from "../../components/ui/input";

export interface TagEditorProps {
  value: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
}

// Limits
const MAX_TAG_LENGTH = 30;
const MAX_TAGS_PER_ITEM = 20;

export function TagEditor({ value, suggestions, onChange }: TagEditorProps) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [hint, setHint] = React.useState("");
  const [live, setLive] = React.useState("");
  const inputRef = React.useRef(null as HTMLInputElement | null);
  const listboxIdRef = React.useRef(`tag-listbox-${Math.random().toString(36).slice(2)}`);
  const listboxId = listboxIdRef.current;

  const valueSet = React.useMemo(() => new Set(value.map((t: string) => t.toLowerCase())), [value]);

  const baseSuggestions = React.useMemo(() => {
    return suggestions.filter((s: string) => !valueSet.has(s.toLowerCase()));
  }, [suggestions, valueSet]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseSuggestions.slice(0, 8);
    return baseSuggestions.filter((s: string) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [query, baseSuggestions]);

  React.useEffect(() => {
    // Open only when focused and there is a non-empty query and suggestions exist
    setIsOpen(isFocused && query.trim().length > 0 && filtered.length > 0);
    if (!(isFocused && query.trim().length > 0 && filtered.length > 0)) {
      setActiveIndex(-1);
    }
  }, [isFocused, query, filtered.length]);

  function announce(message: string) {
    setLive(message);
    // Clear after a moment to allow repeated announcements
    window.setTimeout(() => setLive(""), 1000);
  }

  function setHintMessage(msg: string) {
    setHint(msg);
    window.setTimeout(() => setHint(""), 2000);
  }

  function addOne(raw: string, { silent = false }: { silent?: boolean } = {}) {
    const clean = raw.trim();
    if (!clean) return;
    if (value.length >= MAX_TAGS_PER_ITEM) {
      setHintMessage("Maximum 20 tags per item.");
      return;
    }
    if (clean.length > MAX_TAG_LENGTH) {
      setHintMessage("Tag too long (max 30 characters).");
      return;
    }
    if (valueSet.has(clean.toLowerCase())) {
      setHintMessage("Tag already added.");
      return;
    }
    const next = [...value, clean];
    onChange(next);
    if (!silent) announce(`Added tag ${clean}`);
  }

  function addMany(input: string) {
    // Supports comma-separated entry and whitespace; ignores empties
    const parts = input
      .split(/[;,]/)
      .map((p: string) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    for (const part of parts) {
      if (value.length >= MAX_TAGS_PER_ITEM) break;
      addOne(part, { silent: true });
    }
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
    announce("Tags updated");
  }

  function remove(tag: string) {
    const next = value.filter((t: string) => t !== tag);
    if (next.length === value.length) return;
    onChange(next);
    announce(`Removed tag ${tag}`);
    // keep focus on input for fast editing
    inputRef.current?.focus();
  }

  function commitCurrent() {
    if (isOpen && activeIndex >= 0 && activeIndex < filtered.length) {
      addOne(filtered[activeIndex]);
    } else if (query.trim()) {
      addMany(query);
    }
  }

  function onKeyDown(e: any) {
    if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
      if (e.key !== "Tab") e.preventDefault();
      commitCurrent();
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      if (filtered.length === 0) return;
      e.preventDefault();
      const next = (activeIndex + 1 + filtered.length) % filtered.length;
      setActiveIndex(next);
      setIsOpen(true);
      return;
    }
    if (e.key === "ArrowUp") {
      if (filtered.length === 0) return;
      e.preventDefault();
      const next = (activeIndex - 1 + filtered.length) % filtered.length;
      setActiveIndex(next);
      setIsOpen(true);
      return;
    }
    if (e.key === "Backspace" && !query) {
      if (value.length > 0) remove(value[value.length - 1]);
      return;
    }
  }

  function onPaste(e: any) {
    const text = e.clipboardData?.getData("text");
    if (!text) return;
    if (text.includes(",") || text.includes(";")) {
      e.preventDefault();
      addMany(text);
    }
  }

  const activeOptionId = isOpen && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="tag-editor">
        {value.map((tag: string) => (
          <div key={tag} className="tag-chip">
            <span className="tag-chip__label">{tag}</span>
            <button
              type="button"
              className="tag-chip__remove btn btn--ghost"
              aria-label={`Remove ${tag}`}
              onClick={() => remove(tag)}
            >
              ×
            </button>
          </div>
        ))}
        <div className="tag-input-wrap">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay closing to allow option click via onMouseDown
              window.setTimeout(() => setIsFocused(false), 0);
            }}
            placeholder="Add a tag…"
            aria-label="Add tag"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            className="tag-input"
          />
          {isOpen && (
            <div id={listboxId} role="listbox" className="autocomplete">
              {filtered.map((s: string, idx: number) => {
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={s}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    className={`autocomplete__option${isActive ? " is-active" : ""}`}
                    onMouseDown={(e: any) => {
                      // Prevent input blur
                      e.preventDefault();
                      addOne(s);
                      setIsOpen(false);
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                  >
                    {s}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{live}</div>
      <div className="tag-editor__hint" aria-live="polite">{hint}</div>
    </div>
  );
}

export default TagEditor;

