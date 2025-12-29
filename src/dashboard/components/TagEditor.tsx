import React from "react";

import { Input } from "../../components/ui/input";

export interface TagEditorProps {
  value: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
}

const MAX_TAG_LENGTH = 30;
const MAX_TAGS_PER_ITEM = 20;

export function TagEditor({ value, suggestions, onChange }: TagEditorProps) {
  // --- State ---
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [hint, setHint] = React.useState("");
  const [live, setLive] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listboxId = React.useRef(`tag-listbox-${Math.random().toString(36).slice(2)}`).current;

  // --- Computed values ---
  const valueSet = React.useMemo(() => new Set(value.map((t) => t.toLowerCase())), [value]);

  const baseSuggestions = React.useMemo(() => {
    return suggestions.filter((s) => !valueSet.has(s.toLowerCase()));
  }, [suggestions, valueSet]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseSuggestions.slice(0, 8);
    return baseSuggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [query, baseSuggestions]);

  // --- Effects ---
  React.useEffect(() => {
    const shouldOpen = isFocused && query.trim().length > 0 && filtered.length > 0;
    setIsOpen(shouldOpen);
    if (!shouldOpen) setActiveIndex(-1);
  }, [isFocused, query, filtered.length]);

  // --- Accessibility helpers ---
  function announce(message: string) {
    setLive(message);
    window.setTimeout(() => setLive(""), 1000);
  }

  function setHintMessage(msg: string) {
    setHint(msg);
    window.setTimeout(() => setHint(""), 2000);
  }

  // --- Tag actions ---
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
    onChange([...value, clean]);
    if (!silent) announce(`Added tag ${clean}`);
  }

  function addMany(input: string) {
    const parts = input.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
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
    const next = value.filter((t) => t !== tag);
    if (next.length === value.length) return;
    onChange(next);
    announce(`Removed tag ${tag}`);
    inputRef.current?.focus();
  }

  function commitCurrent() {
    if (isOpen && activeIndex >= 0 && activeIndex < filtered.length) {
      addOne(filtered[activeIndex]);
    } else if (query.trim()) {
      addMany(query);
    }
  }

  // --- Keyboard handling ---
  function onKeyDown(e: React.KeyboardEvent) {
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
    if (e.key === "ArrowDown" && filtered.length > 0) {
      e.preventDefault();
      setActiveIndex((activeIndex + 1) % filtered.length);
      setIsOpen(true);
      return;
    }
    if (e.key === "ArrowUp" && filtered.length > 0) {
      e.preventDefault();
      setActiveIndex((activeIndex - 1 + filtered.length) % filtered.length);
      setIsOpen(true);
      return;
    }
    if (e.key === "Backspace" && !query && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData?.getData("text");
    if (text && (text.includes(",") || text.includes(";"))) {
      e.preventDefault();
      addMany(text);
    }
  }

  const activeOptionId = isOpen && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  // --- Render ---
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="tag-editor">
        {value.map((tag) => (
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
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => window.setTimeout(() => setIsFocused(false), 0)}
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
              {filtered.map((s, idx) => (
                <div
                  key={s}
                  id={`${listboxId}-opt-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={`autocomplete__option${idx === activeIndex ? " is-active" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addOne(s);
                    setIsOpen(false);
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                >
                  {s}
                </div>
              ))}
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

