import { describe, expect, it } from "vitest";

import { hashStringFNV1a, normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it("lowercases hostname", () => {
    expect(normalizeUrl("https://EXAMPLE.COM/path")).toBe(
      "https://example.com/path"
    );
  });

  it("removes utm tracking parameters", () => {
    const url =
      "https://example.com/article?utm_source=twitter&utm_medium=social&id=123";
    expect(normalizeUrl(url)).toBe("https://example.com/article?id=123");
  });

  it("removes all utm_ prefixed parameters", () => {
    const url = "https://example.com/?utm_custom=value&keep=yes";
    expect(normalizeUrl(url)).toBe("https://example.com/?keep=yes");
  });

  it("removes fbclid and gclid parameters", () => {
    const url = "https://example.com/?fbclid=abc&gclid=xyz&page=1";
    expect(normalizeUrl(url)).toBe("https://example.com/?page=1");
  });

  it("removes ref parameter", () => {
    const url = "https://example.com/post?ref=homepage";
    expect(normalizeUrl(url)).toBe("https://example.com/post");
  });

  it("removes hash fragments", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe(
      "https://example.com/page"
    );
  });

  it("removes default port 80 for http", () => {
    expect(normalizeUrl("http://example.com:80/path")).toBe(
      "http://example.com/path"
    );
  });

  it("removes default port 443 for https", () => {
    expect(normalizeUrl("https://example.com:443/path")).toBe(
      "https://example.com/path"
    );
  });

  it("keeps non-default ports", () => {
    expect(normalizeUrl("https://example.com:8080/path")).toBe(
      "https://example.com:8080/path"
    );
  });

  it("removes trailing slash for non-root paths", () => {
    expect(normalizeUrl("https://example.com/path/")).toBe(
      "https://example.com/path"
    );
  });

  it("keeps trailing slash for root path", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("returns original string for invalid URLs", () => {
    expect(normalizeUrl("not-a-valid-url")).toBe("not-a-valid-url");
  });

  it("handles complex URL with multiple normalizations", () => {
    const url =
      "https://EXAMPLE.COM:443/blog/post/?utm_source=test&id=1#comments";
    expect(normalizeUrl(url)).toBe("https://example.com/blog/post?id=1");
  });
});

describe("hashStringFNV1a", () => {
  it("returns consistent hash for same input", () => {
    const hash1 = hashStringFNV1a("example.com");
    const hash2 = hashStringFNV1a("example.com");
    expect(hash1).toBe(hash2);
  });

  it("returns different hashes for different inputs", () => {
    const hash1 = hashStringFNV1a("example.com");
    const hash2 = hashStringFNV1a("other.com");
    expect(hash1).not.toBe(hash2);
  });

  it("returns hexadecimal string", () => {
    const hash = hashStringFNV1a("test");
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("handles empty string", () => {
    const hash = hashStringFNV1a("");
    expect(hash).toBeTruthy();
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("handles unicode characters", () => {
    const hash = hashStringFNV1a("例え.com/café/日本語");
    expect(hash).toMatch(/^[0-9a-f]+$/);
    // Verify different unicode strings produce different hashes
    const hash2 = hashStringFNV1a("münchen.de/über");
    expect(hash).not.toBe(hash2);
  });
});
