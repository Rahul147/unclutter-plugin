/**
 * @fileoverview Comprehensive tests for the page metadata extractor.
 *
 * Tests the extractPageMetadata function which runs in content script context
 * to extract metadata from web pages for saving to the extension.
 *
 * Coverage includes:
 * - Title extraction (og:title, document.title, fallback)
 * - Description extraction (meta description, og:description)
 * - Canonical URL extraction
 * - Open Graph image extraction
 * - Favicon extraction (icon, shortcut icon)
 * - Content type detection (article, video, other)
 * - Edge cases and malformed HTML
 */

import { beforeEach, describe, expect, it } from "vitest";

import { extractPageMetadata } from "./extractor";

/**
 * Helper to set up a mock DOM with specified HTML content.
 * Resets document.head and document.body for each test.
 */
function setupDOM(headContent: string, bodyContent = ""): void {
  document.head.innerHTML = headContent;
  document.body.innerHTML = bodyContent;
}

/**
 * Helper to mock window.location.href
 */
function mockLocation(url: string): void {
  Object.defineProperty(window, "location", {
    value: { href: url },
    writable: true,
  });
}

describe("extractPageMetadata", () => {
  beforeEach(() => {
    // Reset DOM
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.title = "";
    // Reset location to a default
    mockLocation("https://example.com/page");
  });

  describe("URL extraction", () => {
    it("extracts the current page URL from location.href", () => {
      mockLocation("https://example.com/article/123");
      setupDOM("");

      const result = extractPageMetadata();

      expect(result.url).toBe("https://example.com/article/123");
    });

    it("handles URLs with query parameters", () => {
      mockLocation("https://example.com/search?q=test&page=1");
      setupDOM("");

      const result = extractPageMetadata();

      expect(result.url).toBe("https://example.com/search?q=test&page=1");
    });

    it("handles URLs with hash fragments", () => {
      mockLocation("https://example.com/page#section-2");
      setupDOM("");

      const result = extractPageMetadata();

      expect(result.url).toBe("https://example.com/page#section-2");
    });
  });

  describe("title extraction", () => {
    it("prefers og:title over document.title", () => {
      document.title = "Document Title";
      setupDOM(`
        <meta property="og:title" content="Open Graph Title">
      `);

      const result = extractPageMetadata();

      expect(result.title).toBe("Open Graph Title");
    });

    it("falls back to document.title when og:title is missing", () => {
      setupDOM("<title>Document Title</title>");

      const result = extractPageMetadata();

      expect(result.title).toBe("Document Title");
    });

    it("returns empty string when both og:title and document.title are missing", () => {
      document.title = "";
      setupDOM("");

      const result = extractPageMetadata();

      expect(result.title).toBe("");
    });

    it("handles og:title with empty content attribute", () => {
      setupDOM(`
        <title>Fallback Title</title>
        <meta property="og:title" content="">
      `);

      const result = extractPageMetadata();

      expect(result.title).toBe("Fallback Title");
    });

    it("handles og:title with whitespace-only content", () => {
      document.title = "Fallback Title";
      setupDOM(`<meta property="og:title" content="   ">`);

      const result = extractPageMetadata();

      // The extractor returns the whitespace as-is (no trimming)
      expect(result.title).toBe("   ");
    });

    it("handles special characters in title", () => {
      setupDOM(`<meta property="og:title" content="Test &amp; Demo — Article">`);

      const result = extractPageMetadata();

      expect(result.title).toBe("Test & Demo — Article");
    });
  });

  describe("description extraction", () => {
    it("extracts description from meta name=description", () => {
      setupDOM(`
        <meta name="description" content="This is the page description.">
      `);

      const result = extractPageMetadata();

      expect(result.description).toBe("This is the page description.");
    });

    it("extracts description from og:description", () => {
      setupDOM(`
        <meta property="og:description" content="Open Graph description.">
      `);

      const result = extractPageMetadata();

      expect(result.description).toBe("Open Graph description.");
    });

    it("prefers meta name=description over og:description (query order)", () => {
      setupDOM(`
        <meta name="description" content="Meta description">
        <meta property="og:description" content="OG description">
      `);

      const result = extractPageMetadata();

      // The querySelector returns the first match in document order
      expect(result.description).toBe("Meta description");
    });

    it("returns null when no description is available", () => {
      setupDOM("");

      const result = extractPageMetadata();

      expect(result.description).toBeNull();
    });

    it("handles empty description content", () => {
      setupDOM(`<meta name="description" content="">`);

      const result = extractPageMetadata();

      // Empty string from getAttribute becomes falsy, so returns null
      expect(result.description).toBeNull();
    });
  });

  describe("canonical URL extraction", () => {
    it("extracts canonical URL from link rel=canonical", () => {
      setupDOM(`
        <link rel="canonical" href="https://example.com/canonical-page">
      `);

      const result = extractPageMetadata();

      expect(result.canonicalUrl).toBe("https://example.com/canonical-page");
    });

    it("returns null when no canonical link is present", () => {
      setupDOM("");

      const result = extractPageMetadata();

      expect(result.canonicalUrl).toBeNull();
    });

    it("handles relative canonical URLs", () => {
      setupDOM(`<link rel="canonical" href="/relative/path">`);

      const result = extractPageMetadata();

      expect(result.canonicalUrl).toBe("/relative/path");
    });
  });

  describe("Open Graph image extraction", () => {
    it("extracts og:image URL", () => {
      setupDOM(`
        <meta property="og:image" content="https://example.com/image.jpg">
      `);

      const result = extractPageMetadata();

      expect(result.ogImage).toBe("https://example.com/image.jpg");
    });

    it("returns null when og:image is missing", () => {
      setupDOM("");

      const result = extractPageMetadata();

      expect(result.ogImage).toBeNull();
    });

    it("handles og:image with relative URL", () => {
      setupDOM(`<meta property="og:image" content="/images/hero.png">`);

      const result = extractPageMetadata();

      expect(result.ogImage).toBe("/images/hero.png");
    });
  });

  describe("favicon extraction", () => {
    it("extracts favicon from link rel=icon", () => {
      setupDOM(`
        <link rel="icon" href="https://example.com/favicon.ico">
      `);

      const result = extractPageMetadata();

      expect(result.favIconUrl).toBe("https://example.com/favicon.ico");
    });

    it("extracts favicon from link rel='shortcut icon'", () => {
      setupDOM(`
        <link rel="shortcut icon" href="https://example.com/shortcut-favicon.ico">
      `);

      const result = extractPageMetadata();

      expect(result.favIconUrl).toBe("https://example.com/shortcut-favicon.ico");
    });

    it("prefers rel=icon over rel='shortcut icon' (query order)", () => {
      setupDOM(`
        <link rel="icon" href="https://example.com/icon.ico">
        <link rel="shortcut icon" href="https://example.com/shortcut.ico">
      `);

      const result = extractPageMetadata();

      expect(result.favIconUrl).toBe("https://example.com/icon.ico");
    });

    it("returns null when no favicon is present", () => {
      setupDOM("");

      const result = extractPageMetadata();

      expect(result.favIconUrl).toBeNull();
    });

    it("resolves relative favicon URLs to absolute (via href property)", () => {
      setupDOM(`<link rel="icon" href="/favicon.png">`);

      const result = extractPageMetadata();

      // The href property of HTMLLinkElement returns absolute URL
      expect(result.favIconUrl).toContain("favicon.png");
    });
  });

  describe("content type detection", () => {
    describe("video detection", () => {
      it("detects video type from og:type containing 'video'", () => {
        setupDOM(`<meta property="og:type" content="video.movie">`);

        const result = extractPageMetadata();

        expect(result.type).toBe("video");
      });

      it("detects video type from YouTube URL", () => {
        mockLocation("https://www.youtube.com/watch?v=abc123");
        setupDOM("");

        const result = extractPageMetadata();

        expect(result.type).toBe("video");
      });

      it("detects video type from Vimeo URL", () => {
        mockLocation("https://vimeo.com/123456");
        setupDOM("");

        const result = extractPageMetadata();

        expect(result.type).toBe("video");
      });

      it("detects video type from URL containing 'video' word boundary", () => {
        mockLocation("https://example.com/video/123");
        setupDOM("");

        const result = extractPageMetadata();

        expect(result.type).toBe("video");
      });

      it("does not falsely detect video from 'videos' in hostname", () => {
        mockLocation("https://myvideosite.com/page");
        setupDOM("");

        const result = extractPageMetadata();

        // 'video' appears as part of 'myvideosite' but not as word boundary \bvideo\b
        // However the regex is /youtube|vimeo|\bvideo\b/i which would match 'video' inside
        // Let me check - 'myvideosite' contains 'video' but \bvideo\b requires word boundary
        // Actually \bvideo\b would NOT match 'myvideosite' because 's' comes after
        expect(result.type).toBe("other");
      });
    });

    describe("article detection", () => {
      it("detects article type from og:type containing 'article'", () => {
        setupDOM(`<meta property="og:type" content="article">`);

        const result = extractPageMetadata();

        expect(result.type).toBe("article");
      });

      it("detects article type from presence of <article> element", () => {
        setupDOM("", "<article><h1>Blog Post</h1></article>");

        const result = extractPageMetadata();

        expect(result.type).toBe("article");
      });

      it("video type takes precedence over article when both match", () => {
        mockLocation("https://youtube.com/article-about-cats");
        setupDOM(`<meta property="og:type" content="article">`);

        const result = extractPageMetadata();

        // Video check comes first in the code
        expect(result.type).toBe("video");
      });
    });

    describe("other type (default)", () => {
      it("returns 'other' when no type indicators are present", () => {
        mockLocation("https://example.com/random-page");
        setupDOM("");

        const result = extractPageMetadata();

        expect(result.type).toBe("other");
      });

      it("returns 'other' for og:type that is not article or video", () => {
        setupDOM(`<meta property="og:type" content="website">`);

        const result = extractPageMetadata();

        expect(result.type).toBe("other");
      });
    });
  });

  describe("edge cases and robustness", () => {
    it("handles completely empty document", () => {
      mockLocation("https://example.com/empty");
      document.head.innerHTML = "";
      document.body.innerHTML = "";
      document.title = "";

      const result = extractPageMetadata();

      expect(result).toEqual({
        url: "https://example.com/empty",
        title: "",
        canonicalUrl: null,
        description: null,
        ogImage: null,
        favIconUrl: null,
        type: "other",
      });
    });

    it("handles malformed meta tags gracefully", () => {
      setupDOM(`
        <meta property="og:title">
        <meta name="description">
        <meta property="og:image" content>
      `);

      // Should not throw
      expect(() => extractPageMetadata()).not.toThrow();
    });

    it("handles multiple og:image tags (takes first)", () => {
      setupDOM(`
        <meta property="og:image" content="https://example.com/first.jpg">
        <meta property="og:image" content="https://example.com/second.jpg">
      `);

      const result = extractPageMetadata();

      expect(result.ogImage).toBe("https://example.com/first.jpg");
    });

    it("handles unicode in metadata", () => {
      setupDOM(`
        <title>日本語タイトル</title>
        <meta name="description" content="Описание на русском языке">
        <meta property="og:image" content="https://example.com/图片.jpg">
      `);

      const result = extractPageMetadata();

      expect(result.title).toBe("日本語タイトル");
      expect(result.description).toBe("Описание на русском языке");
      expect(result.ogImage).toBe("https://example.com/图片.jpg");
    });

    it("handles very long content values", () => {
      const longDescription = "A".repeat(10000);
      setupDOM(`<meta name="description" content="${longDescription}">`);

      const result = extractPageMetadata();

      expect(result.description).toBe(longDescription);
      expect(result.description?.length).toBe(10000);
    });

    it("handles newlines and whitespace in content", () => {
      setupDOM(`
        <meta name="description" content="Line 1
        Line 2
        Line 3">
      `);

      const result = extractPageMetadata();

      expect(result.description).toContain("Line 1");
      expect(result.description).toContain("Line 2");
    });
  });

  describe("real-world page scenarios", () => {
    it("correctly extracts metadata from a typical blog post", () => {
      mockLocation("https://blog.example.com/posts/my-article");
      document.title = "My Article | Example Blog";
      setupDOM(
        `
        <meta property="og:title" content="My Article">
        <meta property="og:type" content="article">
        <meta property="og:image" content="https://blog.example.com/images/hero.jpg">
        <meta name="description" content="This is my article about testing.">
        <link rel="canonical" href="https://blog.example.com/posts/my-article">
        <link rel="icon" href="/favicon.ico">
      `,
        "<article><p>Content here</p></article>"
      );

      const result = extractPageMetadata();

      expect(result).toEqual({
        url: "https://blog.example.com/posts/my-article",
        title: "My Article",
        canonicalUrl: "https://blog.example.com/posts/my-article",
        description: "This is my article about testing.",
        ogImage: "https://blog.example.com/images/hero.jpg",
        favIconUrl: expect.stringContaining("favicon.ico"),
        type: "article",
      });
    });

    it("correctly extracts metadata from a YouTube video page", () => {
      mockLocation("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      document.title = "Rick Astley - Never Gonna Give You Up - YouTube";
      setupDOM(`
        <meta property="og:title" content="Rick Astley - Never Gonna Give You Up">
        <meta property="og:type" content="video.other">
        <meta property="og:image" content="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg">
        <meta name="description" content="Official music video">
        <link rel="shortcut icon" href="https://www.youtube.com/favicon.ico">
      `);

      const result = extractPageMetadata();

      expect(result.type).toBe("video");
      expect(result.title).toBe("Rick Astley - Never Gonna Give You Up");
      expect(result.ogImage).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg");
    });

    it("correctly extracts metadata from a minimal landing page", () => {
      mockLocation("https://startup.io");
      setupDOM("<title>Startup - The Future</title>");

      const result = extractPageMetadata();

      expect(result).toEqual({
        url: "https://startup.io",
        title: "Startup - The Future",
        canonicalUrl: null,
        description: null,
        ogImage: null,
        favIconUrl: null,
        type: "other",
      });
    });
  });
});
