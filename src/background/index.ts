// Background service worker (MV3)
import { addItem, getItemByUrl, type SavedItem } from "../db/db";
import { hashStringFNV1a, normalizeUrl } from "../utils/url";

type PageMetadata = {
  url: string;
  title: string;
  canonicalUrl: string | null;
  description: string | null;
  ogImage: string | null;
  favIconUrl: string | null;
  type: "article" | "video" | "other";
};

type SaveMessage = {
  type: "save-current-tab";
  tabId: number;
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-unclutter",
    title: "Save to unclutter",
    contexts: ["page", "link"],
  });

  chrome.storage.local.get({ enableTags: undefined }).then((data) => {
    if (typeof data.enableTags === "undefined") {
      chrome.storage.local.set({ enableTags: true });
    }
  });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("src/dashboard/index.html"),
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "save-to-unclutter" && tab?.id) {
    void handleSaveForTab(tab.id);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-current-page") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      void handleSaveForTab(tab.id);
    }
  }
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as SaveMessage;
  if (msg?.type === "save-current-tab" && typeof msg.tabId === "number") {
    void handleSaveForTab(msg.tabId);
  }
});

function extractPageMetadata(): PageMetadata {
  const doc = document;

  const title =
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    doc.title ||
    "";

  const description =
    doc
      .querySelector('meta[name="description"], meta[property="og:description"]')
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
  const ogType =
    doc.querySelector('meta[property="og:type"]')?.getAttribute("content") || "";

  let type: PageMetadata["type"] = "other";
  if (ogType.includes("video") || /youtube|vimeo|\bvideo\b/i.test(href)) {
    type = "video";
  } else if (ogType.includes("article") || doc.querySelector("article")) {
    type = "article";
  }

  return { url: href, title, canonicalUrl, description, ogImage, favIconUrl, type };
}

async function handleSaveForTab(tabId: number): Promise<void> {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "ISOLATED",
      func: extractPageMetadata,
    });

    if (!result?.url) return;

    const normalizedUrl = normalizeUrl(result.url);

    // Check for duplicates
    const existing = await getItemByUrl(normalizedUrl);
    if (existing) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "/logo_128.png",
        title: "Already saved",
        message: existing.title || existing.url,
      });
      return;
    }

    const urlObj = new URL(normalizedUrl);
    const now = Date.now();

    const item: SavedItem = {
      id: `${normalizedUrl}#${now}`,
      url: normalizedUrl,
      title: result.title || urlObj.hostname,
      sourceHost: urlObj.hostname,
      type: result.type,
      tags: [],
      category: null,
      status: "unread",
      savedAt: now,
      lastOpenedAt: null,
      estReadMins: null,
      bookmarked: false,
      favIconUrl: result.favIconUrl,
      ogImage: result.ogImage,
      notes: null,
      domainHash: hashStringFNV1a(urlObj.hostname),
    };

    await addItem(item);

    chrome.notifications.create({
      type: "basic",
      iconUrl: "/logo_128.png",
      title: "Saved to unclutter",
      message: item.title || item.url,
    });
  } catch (err) {
    console.error("Failed to save tab", err);
  }
}
