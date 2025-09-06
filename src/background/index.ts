// Background service worker (MV3)
import { addItem, type SavedItem } from "../db/db";
import { normalizeUrl, hashStringFNV1a } from "../utils/url";

chrome.runtime.onInstalled.addListener(() => {
  // Set up context menu
  chrome.contextMenus.create({
    id: "save-to-unclutter",
    title: "Save to unclutter",
    contexts: ["page", "link"],
  });
});

chrome.action.onClicked.addListener(async () => {
  await chrome.tabs.create({
    url: chrome.runtime.getURL("src/dashboard/index.html"),
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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

chrome.runtime.onMessage.addListener((message) => {
  if (
    message?.type === "save-current-tab" &&
    typeof message.tabId === "number"
  ) {
    void handleSaveForTab(message.tabId);
  }
});

async function handleSaveForTab(tabId: number): Promise<void> {
  try {
    const [{ result } = {} as any] = await chrome.scripting.executeScript<{
      [k: string]: any;
    }>({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const doc = document;
        const title =
          doc
            .querySelector('meta[property="og:title"]')
            ?.getAttribute("content") ||
          doc.title ||
          "";
        const description =
          doc
            .querySelector(
              'meta[name="description"], meta[property="og:description"]'
            )
            ?.getAttribute("content") || null;
        const canonicalUrl =
          doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ||
          null;
        const ogImage =
          doc
            .querySelector('meta[property="og:image"]')
            ?.getAttribute("content") || null;
        const favIconUrl =
          (
            doc.querySelector(
              'link[rel="icon"], link[rel="shortcut icon"]'
            ) as HTMLLinkElement | null
          )?.href || null;
        const href = location.href;
        let type: "article" | "video" | "other" = "other";
        const ogType =
          doc
            .querySelector('meta[property="og:type"]')
            ?.getAttribute("content") || "";
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
      },
    });

    if (!result || !result.url) return;

    const normalizedUrl = normalizeUrl(result.url);
    const urlObj = new URL(normalizedUrl);
    const now = Date.now();
    const item: SavedItem = {
      id: `${normalizedUrl}#${now}`,
      url: normalizedUrl,
      title: result.title ?? urlObj.hostname,
      sourceHost: urlObj.hostname,
      type: result.type ?? "other",
      tags: [],
      category: null,
      status: "unread",
      savedAt: now,
      lastOpenedAt: null,
      estReadMins: null,
      favIconUrl: result.favIconUrl ?? null,
      ogImage: result.ogImage ?? null,
      notes: null,
      domainHash: hashStringFNV1a(urlObj.hostname),
    };

    await addItem(item);
    // Optionally notify user
    try {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: "/logo_128.png",
        title: "Saved to unclutter",
        message: item.title || item.url,
      });
    } catch {
      // notifications permission may not be granted; ignore
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to save tab", err);
  }
}
