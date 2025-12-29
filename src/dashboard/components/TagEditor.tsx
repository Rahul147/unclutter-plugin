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
  const [isExpanded, setIsExpanded] = React.useState(false);
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

    // Batch all valid tags together to avoid stale closure issues
    const newTags: string[] = [];
    const existingLower = new Set(value.map((t) => t.toLowerCase()));

    for (const part of parts) {
      if (value.length + newTags.length >= MAX_TAGS_PER_ITEM) {
        setHintMessage("Maximum 20 tags per item.");
        break;
      }
      if (part.length > MAX_TAG_LENGTH) continue;
      if (existingLower.has(part.toLowerCase())) continue;
      if (newTags.some((t) => t.toLowerCase() === part.toLowerCase())) continue;
      newTags.push(part);
      existingLower.add(part.toLowerCase());
    }

    if (newTags.length > 0) {
      onChange([...value, ...newTags]);
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
      setQuery("");
      setIsOpen(false);
    } else if (query.trim()) {
      // For single tags (no comma/semicolon), use addOne to show validation hints
      if (!query.includes(",") && !query.includes(";")) {
        addOne(query);
        setQuery("");
      } else {
        addMany(query);
      }
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
      setActiveIndex((i) => (i + 1) % filtered.length);
      setIsOpen(true);
      return;
    }
    if (e.key === "ArrowUp" && filtered.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
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

  // --- Expand/collapse handlers ---
  function expand() {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function collapse() {
    if (!query.trim()) {
      setIsExpanded(false);
      setIsOpen(false);
    }
  }

  // --- Render ---
  return (
    <>
      <div className="tag-editor">
        {value.map((tag) => (
          <div key={tag} className="tag-chip">
            <span className="tag-chip__label">{tag}</span>
            <button
              type="button"
              className="tag-chip__remove"
              aria-label={`Remove ${tag}`}
              onClick={() => remove(tag)}
            >
              ×
            </button>
          </div>
        ))}
        {isExpanded ? (
          <div className="tag-input-wrap">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  setIsExpanded(false);
                  setIsOpen(false);
                  return;
                }
                onKeyDown(e);
              }}
              onPaste={onPaste}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                window.setTimeout(() => {
                  setIsFocused(false);
                  collapse();
                }, 150);
              }}
              placeholder="Add tag…"
              aria-label="Add tag"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-activedescendant={activeOptionId}
              className="tag-input input"
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
        ) : (
          <button
            type="button"
            className="tag-add-btn"
            onClick={expand}
            aria-label="Add tag"
          >
            +
          </button>
        )}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{live}</div>
      {hint && <div className="tag-editor__hint" aria-live="polite">{hint}</div>}
    </>
  );
}

export default TagEditor;

