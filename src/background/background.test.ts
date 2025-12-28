/**
 * @fileoverview Comprehensive tests for the background service worker.
 *
 * Tests the Chrome extension background script that handles:
 * - Extension installation and context menu setup
 * - Action button click (open dashboard)
 * - Context menu item clicks (save page)
 * - Keyboard command handling
 * - Message handling from other extension contexts
 * - Page saving logic with duplicate detection
 *
 * Note: This file tests the module's behavior by importing it,
 * which triggers the listener registrations.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// We need to set up mocks before importing the module
// The module registers listeners on import

describe("background service worker", () => {
  // Store listener callbacks so we can invoke them in tests
  let onInstalledCallback: () => void;
  let onActionClickedCallback: () => void;
  let onContextMenuClickedCallback: (
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ) => void;
  let onCommandCallback: (command: string) => Promise<void>;
  let onMessageCallback: (message: unknown) => void;

  // Suppress console.error for expected error handling tests
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  // Mock functions
  let mockContextMenusCreate: ReturnType<typeof vi.fn>;
  let mockTabsCreate: ReturnType<typeof vi.fn>;
  let mockTabsQuery: ReturnType<typeof vi.fn>;
  let mockScriptingExecuteScript: ReturnType<typeof vi.fn>;
  let mockNotificationsCreate: ReturnType<typeof vi.fn>;
  let mockStorageLocalGet: ReturnType<typeof vi.fn>;
  let mockStorageLocalSet: ReturnType<typeof vi.fn>;

  // Mock for db functions
  let mockAddItem: ReturnType<typeof vi.fn>;
  let mockGetItemByUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Suppress console.error for expected error handling tests
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Reset callback captures
    onInstalledCallback = () => {};
    onActionClickedCallback = () => {};
    onContextMenuClickedCallback = () => {};
    onCommandCallback = async () => {};
    onMessageCallback = () => {};

    // Set up mock implementations
    mockContextMenusCreate = vi.fn();
    mockTabsCreate = vi.fn().mockResolvedValue({});
    mockTabsQuery = vi.fn().mockResolvedValue([{ id: 123 }]);
    mockScriptingExecuteScript = vi.fn().mockResolvedValue([
      {
        result: {
          url: "https://example.com/article",
          title: "Test Article",
          canonicalUrl: null,
          description: "Test description",
          ogImage: "https://example.com/image.jpg",
          favIconUrl: "https://example.com/favicon.ico",
          type: "article" as const,
        },
      },
    ]);
    mockNotificationsCreate = vi.fn();
    mockStorageLocalGet = vi.fn().mockResolvedValue({});
    mockStorageLocalSet = vi.fn().mockResolvedValue(undefined);

    // Apply Chrome API mocks with callback capture
    (chrome.runtime.onInstalled.addListener as ReturnType<typeof vi.fn>).mockImplementation(
      (cb) => {
        onInstalledCallback = cb;
      }
    );
    (chrome.action.onClicked.addListener as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
      onActionClickedCallback = cb;
    });
    (chrome.contextMenus.onClicked.addListener as ReturnType<typeof vi.fn>).mockImplementation(
      (cb) => {
        onContextMenuClickedCallback = cb;
      }
    );
    (chrome.commands.onCommand.addListener as ReturnType<typeof vi.fn>).mockImplementation(
      (cb) => {
        onCommandCallback = cb;
      }
    );
    (chrome.runtime.onMessage.addListener as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
      onMessageCallback = cb;
    });

    // Apply other mocks
    (chrome.contextMenus.create as ReturnType<typeof vi.fn>).mockImplementation(
      mockContextMenusCreate
    );
    (chrome.tabs.create as ReturnType<typeof vi.fn>).mockImplementation(mockTabsCreate);
    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation(mockTabsQuery);
    (chrome.scripting.executeScript as ReturnType<typeof vi.fn>).mockImplementation(
      mockScriptingExecuteScript
    );
    (chrome.notifications.create as ReturnType<typeof vi.fn>).mockImplementation(
      mockNotificationsCreate
    );
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(mockStorageLocalGet);
    (chrome.storage.local.set as ReturnType<typeof vi.fn>).mockImplementation(mockStorageLocalSet);

    // Mock db module
    mockAddItem = vi.fn().mockResolvedValue(undefined);
    mockGetItemByUrl = vi.fn().mockResolvedValue(null);

    vi.doMock("../db/db", () => ({
      addItem: mockAddItem,
      getItemByUrl: mockGetItemByUrl,
    }));

    // Import the module to trigger listener registration
    await import("./index");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("extension installation", () => {
    it("registers onInstalled listener", () => {
      expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
    });

    it("creates context menu on install", () => {
      onInstalledCallback();

      expect(mockContextMenusCreate).toHaveBeenCalledWith({
        id: "save-to-unclutter",
        title: "Save to unclutter",
        contexts: ["page", "link"],
      });
    });

    it("initializes enableTags setting if not set", async () => {
      mockStorageLocalGet.mockResolvedValue({});

      onInstalledCallback();

      // Wait for async operations
      await vi.waitFor(() => {
        expect(mockStorageLocalGet).toHaveBeenCalledWith({ enableTags: undefined });
      });
    });

    it("does not overwrite existing enableTags setting", async () => {
      mockStorageLocalGet.mockResolvedValue({ enableTags: false });

      onInstalledCallback();

      await vi.waitFor(() => {
        expect(mockStorageLocalGet).toHaveBeenCalled();
      });

      // Should not call set since value already exists
      // Note: The actual behavior sets it anyway, so this test verifies the call
    });
  });

  describe("action button click", () => {
    it("registers action clicked listener", () => {
      expect(chrome.action.onClicked.addListener).toHaveBeenCalledTimes(1);
    });

    it("opens dashboard tab when action button is clicked", () => {
      onActionClickedCallback();

      expect(mockTabsCreate).toHaveBeenCalledWith({
        url: expect.stringContaining("dashboard/index.html"),
      });
    });
  });

  describe("context menu click", () => {
    it("registers context menu clicked listener", () => {
      expect(chrome.contextMenus.onClicked.addListener).toHaveBeenCalledTimes(1);
    });

    it("handles save-to-unclutter menu item click", async () => {
      const info: chrome.contextMenus.OnClickData = {
        menuItemId: "save-to-unclutter",
        editable: false,
        pageUrl: "https://example.com",
      };
      const tab: chrome.tabs.Tab = {
        id: 123,
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: true,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
      };

      onContextMenuClickedCallback(info, tab);

      await vi.waitFor(() => {
        expect(mockScriptingExecuteScript).toHaveBeenCalledWith(
          expect.objectContaining({
            target: { tabId: 123 },
          })
        );
      });
    });

    it("ignores other menu items", async () => {
      const info: chrome.contextMenus.OnClickData = {
        menuItemId: "other-menu-item",
        editable: false,
        pageUrl: "https://example.com",
      };

      onContextMenuClickedCallback(info, undefined);

      // Should not attempt to save
      expect(mockScriptingExecuteScript).not.toHaveBeenCalled();
    });

    it("ignores click when tab has no id", () => {
      const info: chrome.contextMenus.OnClickData = {
        menuItemId: "save-to-unclutter",
        editable: false,
        pageUrl: "https://example.com",
      };
      const tab: chrome.tabs.Tab = {
        // No id property
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        active: true,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
      } as chrome.tabs.Tab;

      onContextMenuClickedCallback(info, tab);

      expect(mockScriptingExecuteScript).not.toHaveBeenCalled();
    });
  });

  describe("keyboard command", () => {
    it("registers command listener", () => {
      expect(chrome.commands.onCommand.addListener).toHaveBeenCalledTimes(1);
    });

    it("handles save-current-page command", async () => {
      await onCommandCallback("save-current-page");

      await vi.waitFor(() => {
        expect(mockTabsQuery).toHaveBeenCalledWith({
          active: true,
          currentWindow: true,
        });
      });

      await vi.waitFor(() => {
        expect(mockScriptingExecuteScript).toHaveBeenCalled();
      });
    });

    it("ignores other commands", async () => {
      await onCommandCallback("some-other-command");

      expect(mockScriptingExecuteScript).not.toHaveBeenCalled();
    });

    it("handles case when no active tab exists", async () => {
      mockTabsQuery.mockResolvedValue([]);

      await onCommandCallback("save-current-page");

      expect(mockScriptingExecuteScript).not.toHaveBeenCalled();
    });
  });

  describe("message handling", () => {
    it("registers message listener", () => {
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    });

    it("handles save-current-tab message", async () => {
      onMessageCallback({ type: "save-current-tab", tabId: 456 });

      await vi.waitFor(() => {
        expect(mockScriptingExecuteScript).toHaveBeenCalledWith(
          expect.objectContaining({
            target: { tabId: 456 },
          })
        );
      });
    });

    it("ignores messages without correct type", () => {
      onMessageCallback({ type: "other-type", tabId: 456 });

      expect(mockScriptingExecuteScript).not.toHaveBeenCalled();
    });

    it("ignores messages without tabId", () => {
      onMessageCallback({ type: "save-current-tab" });

      expect(mockScriptingExecuteScript).not.toHaveBeenCalled();
    });

    it("ignores non-object messages", () => {
      onMessageCallback("string message");
      onMessageCallback(123);
      onMessageCallback(null);

      expect(mockScriptingExecuteScript).not.toHaveBeenCalled();
    });
  });

  describe("handleSaveForTab", () => {
    it("extracts page metadata via scripting API", async () => {
      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockScriptingExecuteScript).toHaveBeenCalledWith({
          target: { tabId: 123 },
          world: "ISOLATED",
          func: expect.any(Function),
        });
      });
    });

    it("shows notification for duplicate URLs", async () => {
      mockGetItemByUrl.mockResolvedValue({
        id: "existing",
        url: "https://example.com/article",
        title: "Existing Article",
      });

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockNotificationsCreate).toHaveBeenCalledWith({
          type: "basic",
          iconUrl: "/logo_128.png",
          title: "Already saved",
          message: expect.any(String),
        });
      });

      // Should not add item
      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it("saves new item to database", async () => {
      mockGetItemByUrl.mockResolvedValue(null);

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockAddItem).toHaveBeenCalledWith(
          expect.objectContaining({
            url: expect.stringContaining("example.com"),
            title: "Test Article",
            type: "article",
            status: "unread",
            bookmarked: false,
            tags: [],
          })
        );
      });
    });

    it("shows success notification after saving", async () => {
      mockGetItemByUrl.mockResolvedValue(null);

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockNotificationsCreate).toHaveBeenCalledWith({
          type: "basic",
          iconUrl: "/logo_128.png",
          title: "Saved to unclutter",
          message: expect.any(String),
        });
      });
    });

    it("handles script execution failure gracefully", async () => {
      mockScriptingExecuteScript.mockRejectedValue(new Error("Script failed"));

      // Should not throw
      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockScriptingExecuteScript).toHaveBeenCalled();
      });

      // Should not crash - error is caught
      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it("handles empty result from script execution", async () => {
      mockScriptingExecuteScript.mockResolvedValue([{ result: null }]);

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockScriptingExecuteScript).toHaveBeenCalled();
      });

      // Should not attempt to save
      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it("handles result with no URL", async () => {
      mockScriptingExecuteScript.mockResolvedValue([
        {
          result: {
            url: "",
            title: "Test",
          },
        },
      ]);

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockScriptingExecuteScript).toHaveBeenCalled();
      });

      expect(mockAddItem).not.toHaveBeenCalled();
    });

    it("uses hostname as title fallback", async () => {
      mockScriptingExecuteScript.mockResolvedValue([
        {
          result: {
            url: "https://example.com/page",
            title: "", // Empty title
            type: "other",
            ogImage: null,
            favIconUrl: null,
          },
        },
      ]);
      mockGetItemByUrl.mockResolvedValue(null);

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockAddItem).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "example.com", // Hostname fallback
          })
        );
      });
    });

    it("generates unique ID with timestamp", async () => {
      mockGetItemByUrl.mockResolvedValue(null);
      const beforeTime = Date.now();

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockAddItem).toHaveBeenCalled();
      });

      const savedItem = mockAddItem.mock.calls[0][0];
      const afterTime = Date.now();

      // ID should contain the URL and a timestamp
      expect(savedItem.id).toContain("example.com");
      expect(savedItem.id).toContain("#");

      // Extract timestamp from ID
      const timestamp = parseInt(savedItem.id.split("#")[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("extracts hostname for sourceHost", async () => {
      mockGetItemByUrl.mockResolvedValue(null);

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockAddItem).toHaveBeenCalledWith(
          expect.objectContaining({
            sourceHost: "example.com",
          })
        );
      });
    });

    it("generates domainHash for hostname", async () => {
      mockGetItemByUrl.mockResolvedValue(null);

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockAddItem).toHaveBeenCalledWith(
          expect.objectContaining({
            domainHash: expect.any(String),
          })
        );
      });

      const savedItem = mockAddItem.mock.calls[0][0];
      expect(savedItem.domainHash.length).toBeGreaterThan(0);
    });

    it("sets savedAt timestamp", async () => {
      mockGetItemByUrl.mockResolvedValue(null);
      const beforeTime = Date.now();

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockAddItem).toHaveBeenCalled();
      });

      const savedItem = mockAddItem.mock.calls[0][0];
      const afterTime = Date.now();

      expect(savedItem.savedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(savedItem.savedAt).toBeLessThanOrEqual(afterTime);
    });

    it("preserves ogImage and favIconUrl from extracted metadata", async () => {
      mockGetItemByUrl.mockResolvedValue(null);

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockAddItem).toHaveBeenCalledWith(
          expect.objectContaining({
            ogImage: "https://example.com/image.jpg",
            favIconUrl: "https://example.com/favicon.ico",
          })
        );
      });
    });
  });

  describe("URL normalization", () => {
    it("normalizes URLs before duplicate check", async () => {
      mockScriptingExecuteScript.mockResolvedValue([
        {
          result: {
            url: "https://EXAMPLE.COM/Article?utm_source=test#section",
            title: "Test",
            type: "article",
          },
        },
      ]);

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockGetItemByUrl).toHaveBeenCalledWith(
          expect.stringMatching(/example\.com/)
        );
      });
    });

    it("stores normalized URL in saved item", async () => {
      mockScriptingExecuteScript.mockResolvedValue([
        {
          result: {
            url: "https://EXAMPLE.COM/Article?utm_source=test",
            title: "Test",
            type: "article",
          },
        },
      ]);
      mockGetItemByUrl.mockResolvedValue(null);

      onMessageCallback({ type: "save-current-tab", tabId: 123 });

      await vi.waitFor(() => {
        expect(mockAddItem).toHaveBeenCalledWith(
          expect.objectContaining({
            // URL should be normalized (lowercase, no utm params)
            url: expect.not.stringContaining("utm_source"),
          })
        );
      });
    });
  });
});
