export type ExtractedMetadata = {
  url: string;
  title: string;
  canonicalUrl: string | null;
  description: string | null;
  ogImage: string | null;
  favIconUrl: string | null;
  type: "article" | "video" | "other";
};

export function extractPageMetadata(): ExtractedMetadata {
  const doc = document;
  const title =
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    doc.title ||
    "";
  const description =
    doc
      .querySelector(
        'meta[name="description"], meta[property="og:description"]'
      )
      ?.getAttribute("content") || null;
  const canonicalUrl =
    doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || null;
  const ogImage =
    doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
    null;
  const favIconUrl =
    (
      doc.querySelector(
        'link[rel="icon"], link[rel="shortcut icon"]'
      ) as HTMLLinkElement | null
    )?.href || null;
  const href = location.href;

  let type: ExtractedMetadata["type"] = "other";
  const ogType =
    doc.querySelector('meta[property="og:type"]')?.getAttribute("content") ||
    "";
  if (ogType.includes("video") || /youtube|vimeo|\bvideo\b/.test(href))
    type = "video";
  else if (ogType.includes("article")) type = "article";
  else if (doc.querySelector("article")) type = "article";

  return {
    url: href,
    title,
    canonicalUrl,
    description,
    ogImage,
    favIconUrl,
    type,
  };
}
