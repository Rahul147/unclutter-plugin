/**
 * @fileoverview Comprehensive tests for the ItemCard component.
 *
 * Tests the saved item card that displays article/video/other content
 * with actions for opening, deleting, bookmarking, and tagging.
 *
 * Coverage includes:
 * - Rendering of item properties (title, URL, hostname, time)
 * - Click handlers for open, delete, bookmark actions
 * - Inline tag editing (always visible when enabled)
 * - Accessibility attributes
 * - Edge cases (missing data, special characters)
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SavedItem } from "../../db/db";
import { ItemCard } from "./ItemCard";

/**
 * Creates a mock SavedItem with sensible defaults
 */
function createMockItem(overrides: Partial<SavedItem> = {}): SavedItem {
  const now = Date.now();
  return {
    id: "test-item-1",
    url: "https://example.com/article/test",
    title: "Test Article Title",
    sourceHost: "example.com",
    type: "article",
    tags: [],
    category: null,
    status: "unread",
    savedAt: now - 3600000, // 1 hour ago
    lastOpenedAt: null,
    estReadMins: null,
    bookmarked: false,
    favIconUrl: "https://example.com/favicon.ico",
    ogImage: "https://example.com/image.jpg",
    notes: null,
    domainHash: "abc123",
    ...overrides,
  };
}

describe("ItemCard", () => {
  // Default props factory
  const createProps = (overrides: Partial<Parameters<typeof ItemCard>[0]> = {}) => ({
    item: createMockItem(),
    enableTags: true,
    allTagNames: ["react", "typescript", "testing"],
    onOpen: vi.fn(),
    onDelete: vi.fn(),
    onToggleBookmark: vi.fn(),
    onSetTags: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the item title", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      expect(screen.getByText("Test Article Title")).toBeInTheDocument();
    });

    it("renders the URL as a link", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      const link = screen.getByRole("link", { name: /Test Article Title/i });
      expect(link).toHaveAttribute("href", "https://example.com/article/test");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    });

    it("falls back to URL when title is empty", () => {
      const props = createProps({
        item: createMockItem({ title: "" }),
      });
      render(<ItemCard {...props} />);

      expect(screen.getByText("https://example.com/article/test")).toBeInTheDocument();
    });

    it("renders the hostname", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      expect(screen.getByText(/example\.com/)).toBeInTheDocument();
    });

    it("renders relative time", () => {
      const props = createProps({
        item: createMockItem({ savedAt: Date.now() - 3600000 }), // 1 hour ago
      });
      render(<ItemCard {...props} />);

      expect(screen.getByText(/1 hour ago/)).toBeInTheDocument();
    });

    it("renders absolute time as tooltip", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      // The absolute time is in a span with title attribute
      const timeSpan = screen.getByText(/ago/);
      expect(timeSpan).toHaveAttribute("title");
      expect(timeSpan.getAttribute("title")).toContain("IST");
    });

    it("renders tags as badges", () => {
      const props = createProps({
        item: createMockItem({ tags: ["react", "typescript"] }),
      });
      render(<ItemCard {...props} />);

      expect(screen.getByText("react")).toBeInTheDocument();
      expect(screen.getByText("typescript")).toBeInTheDocument();
    });

    it("renders empty state when no tags", () => {
      const props = createProps({
        item: createMockItem({ tags: [] }),
      });
      render(<ItemCard {...props} />);

      // Should not have any Badge elements with tag content
      expect(screen.queryByText("react")).not.toBeInTheDocument();
    });

    it("renders bookmark button with correct state (not bookmarked)", () => {
      const props = createProps({
        item: createMockItem({ bookmarked: false }),
      });
      render(<ItemCard {...props} />);

      const bookmarkBtn = screen.getByTitle("Add bookmark");
      expect(bookmarkBtn).toHaveTextContent("☆");
      expect(bookmarkBtn).toHaveAttribute("aria-pressed", "false");
    });

    it("renders bookmark button with correct state (bookmarked)", () => {
      const props = createProps({
        item: createMockItem({ bookmarked: true }),
      });
      render(<ItemCard {...props} />);

      const bookmarkBtn = screen.getByTitle("Remove bookmark");
      expect(bookmarkBtn).toHaveTextContent("★");
      expect(bookmarkBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("renders Open button", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("renders Delete button", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      expect(screen.getByTitle("Delete item")).toBeInTheDocument();
    });

    it("renders add tag button when enableTags is true", () => {
      const props = createProps({ enableTags: true });
      render(<ItemCard {...props} />);

      expect(screen.getByRole("button", { name: "Add tag" })).toBeInTheDocument();
    });

    it("does not render add tag button when enableTags is false", () => {
      const props = createProps({ enableTags: false });
      render(<ItemCard {...props} />);

      expect(screen.queryByRole("button", { name: "Add tag" })).not.toBeInTheDocument();
    });
  });

  describe("click handlers", () => {
    it("calls onOpen when title link is clicked", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      const link = screen.getByRole("link", { name: /Test Article Title/i });
      fireEvent.click(link);

      expect(props.onOpen).toHaveBeenCalledWith("test-item-1");
      expect(props.onOpen).toHaveBeenCalledTimes(1);
    });

    it("calls onOpen when Open button is clicked", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      const openLink = screen.getByText("Open");
      fireEvent.click(openLink);

      expect(props.onOpen).toHaveBeenCalledWith("test-item-1");
    });

    it("calls onDelete when Delete button is clicked", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      const deleteBtn = screen.getByTitle("Delete item");
      fireEvent.click(deleteBtn);

      expect(props.onDelete).toHaveBeenCalledWith("test-item-1");
      expect(props.onDelete).toHaveBeenCalledTimes(1);
    });

    it("delete click stops propagation", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      const deleteBtn = screen.getByTitle("Delete item");
      const clickEvent = new MouseEvent("click", { bubbles: true });
      const stopPropagationSpy = vi.spyOn(clickEvent, "stopPropagation");

      deleteBtn.dispatchEvent(clickEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it("calls onToggleBookmark when bookmark button is clicked", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      const bookmarkBtn = screen.getByTitle("Add bookmark");
      fireEvent.click(bookmarkBtn);

      expect(props.onToggleBookmark).toHaveBeenCalledWith("test-item-1");
      expect(props.onToggleBookmark).toHaveBeenCalledTimes(1);
    });
  });

  describe("inline tag editing", () => {
    it("shows add tag button when enableTags is true", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      // Collapsed state shows + button
      expect(screen.getByRole("button", { name: "Add tag" })).toBeInTheDocument();
    });

    it("displays existing tags as interactive chips", () => {
      const props = createProps({
        item: createMockItem({ tags: ["react", "typescript"] }),
      });
      render(<ItemCard {...props} />);

      // Tags displayed as chips with remove buttons
      expect(screen.getByText("react")).toBeInTheDocument();
      expect(screen.getByText("typescript")).toBeInTheDocument();
      expect(screen.getByLabelText("Remove react")).toBeInTheDocument();
      expect(screen.getByLabelText("Remove typescript")).toBeInTheDocument();
    });

    it("does not show tag controls when enableTags is false", () => {
      const props = createProps({ enableTags: false });
      render(<ItemCard {...props} />);

      expect(screen.queryByRole("button", { name: "Add tag" })).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles URL with special characters", () => {
      const props = createProps({
        item: createMockItem({
          url: "https://example.com/article?q=test&page=1#section",
          title: "Article with Query",
        }),
      });
      render(<ItemCard {...props} />);

      const link = screen.getByRole("link", { name: /Article with Query/i });
      expect(link).toHaveAttribute(
        "href",
        "https://example.com/article?q=test&page=1#section"
      );
    });

    it("handles very long title (truncation via CSS)", () => {
      const longTitle = "A".repeat(500);
      const props = createProps({
        item: createMockItem({ title: longTitle }),
      });
      render(<ItemCard {...props} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("handles many tags", () => {
      const manyTags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
      const props = createProps({
        item: createMockItem({ tags: manyTags }),
      });
      render(<ItemCard {...props} />);

      manyTags.forEach((tag) => {
        expect(screen.getByText(tag)).toBeInTheDocument();
      });
    });

    it("handles unicode in title and tags", () => {
      const props = createProps({
        item: createMockItem({
          title: "日本語タイトル — émojis 🎉",
          tags: ["日本語", "émoji", "한국어"],
        }),
      });
      render(<ItemCard {...props} />);

      expect(screen.getByText("日本語タイトル — émojis 🎉")).toBeInTheDocument();
      expect(screen.getByText("日本語")).toBeInTheDocument();
      expect(screen.getByText("émoji")).toBeInTheDocument();
      expect(screen.getByText("한국어")).toBeInTheDocument();
    });

    it("handles item saved just now", () => {
      const props = createProps({
        item: createMockItem({ savedAt: Date.now() }),
      });
      render(<ItemCard {...props} />);

      expect(screen.getByText(/1 minute ago/)).toBeInTheDocument();
    });

    it("handles item saved long ago", () => {
      const props = createProps({
        item: createMockItem({ savedAt: Date.now() - 86400000 * 30 }), // 30 days ago
      });
      render(<ItemCard {...props} />);

      expect(screen.getByText(/30 days ago/)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("bookmark button has aria-pressed attribute", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      const bookmarkBtn = screen.getByTitle("Add bookmark");
      expect(bookmarkBtn).toHaveAttribute("aria-pressed");
    });

    it("bookmark button has descriptive title", () => {
      const props = createProps({ item: createMockItem({ bookmarked: false }) });
      render(<ItemCard {...props} />);

      expect(screen.getByTitle("Add bookmark")).toBeInTheDocument();
    });

    it("delete button has descriptive title", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      expect(screen.getByTitle("Delete item")).toBeInTheDocument();
    });

    it("links have proper attributes for external navigation", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        if (link.getAttribute("href")?.startsWith("http")) {
          expect(link).toHaveAttribute("target", "_blank");
          expect(link).toHaveAttribute("rel", "noreferrer");
        }
      });
    });

    it("time element has accessible label", () => {
      const props = createProps();
      render(<ItemCard {...props} />);

      const timeSpan = screen.getByText(/ago/);
      expect(timeSpan).toHaveAttribute("aria-label");
    });
  });
});
