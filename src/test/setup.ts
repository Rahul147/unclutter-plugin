import "fake-indexeddb/auto";
import { vi } from "vitest";

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
  },
  tabs: {
    create: vi.fn().mockResolvedValue({}),
    query: vi.fn().mockResolvedValue([]),
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: { addListener: vi.fn() },
  },
  commands: {
    onCommand: { addListener: vi.fn() },
  },
  action: {
    onClicked: { addListener: vi.fn() },
  },
  scripting: {
    executeScript: vi.fn().mockResolvedValue([{ result: null }]),
  },
  notifications: {
    create: vi.fn(),
  },
};

// @ts-expect-error - mocking chrome global
globalThis.chrome = mockChrome;

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
