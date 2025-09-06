const STRIP_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref",
]);

export function normalizeUrl(input: string): string {
  try {
    const u = new URL(input);
    // Lowercase host
    u.hostname = u.hostname.toLowerCase();
    // Remove tracking params
    for (const key of Array.from(u.searchParams.keys())) {
      if (STRIP_PARAMS.has(key) || key.startsWith("utm_"))
        u.searchParams.delete(key);
    }
    // Remove hash fragments for canonical URL
    u.hash = "";
    // Remove default ports
    if (
      (u.protocol === "http:" && u.port === "80") ||
      (u.protocol === "https:" && u.port === "443")
    ) {
      u.port = "";
    }
    // Remove trailing slash for non-root paths
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return input;
  }
}

// Simple FNV-1a hash for domain hashing
export function hashStringFNV1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash >>> 0) * 0x01000193;
  }
  return (hash >>> 0).toString(16);
}
