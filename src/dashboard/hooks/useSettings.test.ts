/**
 * @fileoverview Comprehensive tests for the useSettings hook.
 *
 * Tests the settings management hook that interfaces with Chrome storage API
 * to read and react to extension settings changes.
 *
 * Coverage includes:
 * - Initial state loading from chrome.storage.local
 * - Default value handling when no settings exist
 * - Reactive updates when storage changes externally
 * - Cleanup of storage change listeners
 * - Error handling for storage API failures
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSettings } from "./useSettings";

describe("useSettings", () => {
  // Store the original chrome mock from setup.ts
  let mockStorageGet: ReturnType<typeof vi.fn>;
  let mockAddListener: ReturnType<typeof vi.fn>;
  let mockRemoveListener: ReturnType<typeof vi.fn>;
  let storageChangeListeners: Array<
    (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: chrome.storage.AreaName
    ) => void
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    storageChangeListeners = [];

    // Set up mock implementations
    mockStorageGet = vi.fn().mockResolvedValue({ enableTags: true });
    mockAddListener = vi.fn().mockImplementation((listener) => {
      storageChangeListeners.push(listener);
    });
    mockRemoveListener = vi.fn().mockImplementation((listener) => {
      const index = storageChangeListeners.indexOf(listener);
      if (index > -1) storageChangeListeners.splice(index, 1);
    });

    // Apply mocks to chrome global
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockImplementation(mockStorageGet);
    (chrome.storage.onChanged.addListener as ReturnType<typeof vi.fn>).mockImplementation(
      mockAddListener
    );
    (chrome.storage.onChanged.removeListener as ReturnType<typeof vi.fn>).mockImplementation(
      mockRemoveListener
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    storageChangeListeners = [];
  });

  /**
   * Helper to simulate a storage change event
   */
  function simulateStorageChange(
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: chrome.storage.AreaName = "local"
  ): void {
    storageChangeListeners.forEach((listener) => {
      listener(changes, areaName);
    });
  }

  describe("initial state", () => {
    it("starts with enableTags defaulting to true", () => {
      const { result } = renderHook(() => useSettings());

      // Initial synchronous state before storage loads
      expect(result.current.enableTags).toBe(true);
    });

    it("loads enableTags from chrome.storage.local on mount", async () => {
      mockStorageGet.mockResolvedValue({ enableTags: false });

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.enableTags).toBe(false);
      });

      expect(mockStorageGet).toHaveBeenCalledWith({ enableTags: true });
    });

    it("uses default value when storage returns undefined", async () => {
      mockStorageGet.mockResolvedValue({});

      const { result } = renderHook(() => useSettings());

      // When storage returns {} (no enableTags key), Boolean(undefined) = false
      await waitFor(() => {
        expect(result.current.enableTags).toBe(false);
      });
    });

    it("handles storage.get rejection gracefully", async () => {
      mockStorageGet.mockRejectedValue(new Error("Storage access denied"));

      const { result } = renderHook(() => useSettings());

      // Should fall back to true on error - wait for rejection to be handled
      await waitFor(() => {
        expect(mockStorageGet).toHaveBeenCalled();
      });
      // Initial state is true, and error handler keeps it true
      expect(result.current.enableTags).toBe(true);
    });
  });

  describe("storage change listener", () => {
    it("registers a storage change listener on mount", async () => {
      renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalledTimes(1);
      });

      expect(typeof storageChangeListeners[0]).toBe("function");
    });

    it("removes the storage change listener on unmount", async () => {
      const { unmount } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalled();
      });

      const listenerCountBefore = storageChangeListeners.length;
      expect(listenerCountBefore).toBe(1);

      unmount();

      expect(mockRemoveListener).toHaveBeenCalledTimes(1);
      expect(storageChangeListeners.length).toBe(0);
    });

    it("updates enableTags when storage changes to false", async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalled();
      });

      // Simulate storage change
      act(() => {
        simulateStorageChange({
          enableTags: { oldValue: true, newValue: false },
        });
      });

      expect(result.current.enableTags).toBe(false);
    });

    it("updates enableTags when storage changes to true", async () => {
      mockStorageGet.mockResolvedValue({ enableTags: false });

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.enableTags).toBe(false);
      });

      // Simulate storage change
      act(() => {
        simulateStorageChange({
          enableTags: { oldValue: false, newValue: true },
        });
      });

      expect(result.current.enableTags).toBe(true);
    });

    it("ignores storage changes from sync area", async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalled();
      });

      const initialValue = result.current.enableTags;

      // Simulate storage change from sync area (should be ignored)
      act(() => {
        simulateStorageChange(
          {
            enableTags: { oldValue: true, newValue: false },
          },
          "sync"
        );
      });

      // Value should remain unchanged
      expect(result.current.enableTags).toBe(initialValue);
    });

    it("ignores storage changes for other keys", async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalled();
      });

      const initialValue = result.current.enableTags;

      // Simulate storage change for a different key
      act(() => {
        simulateStorageChange({
          someOtherSetting: { oldValue: "old", newValue: "new" },
        });
      });

      // Value should remain unchanged
      expect(result.current.enableTags).toBe(initialValue);
    });

    it("handles multiple rapid storage changes", async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalled();
      });

      // Rapid changes
      act(() => {
        simulateStorageChange({ enableTags: { oldValue: true, newValue: false } });
        simulateStorageChange({ enableTags: { oldValue: false, newValue: true } });
        simulateStorageChange({ enableTags: { oldValue: true, newValue: false } });
      });

      // Final state should be false
      expect(result.current.enableTags).toBe(false);
    });
  });

  describe("type coercion", () => {
    it("coerces truthy non-boolean values to true", async () => {
      mockStorageGet.mockResolvedValue({ enableTags: "yes" });

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockStorageGet).toHaveBeenCalled();
      });

      expect(result.current.enableTags).toBe(true);
    });

    it("coerces falsy non-boolean values to false", async () => {
      mockStorageGet.mockResolvedValue({ enableTags: 0 });

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.enableTags).toBe(false);
      });
    });

    it("coerces null to false", async () => {
      mockStorageGet.mockResolvedValue({ enableTags: null });

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.enableTags).toBe(false);
      });
    });

    it("handles storage change with non-boolean newValue", async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalled();
      });

      act(() => {
        simulateStorageChange({
          enableTags: { oldValue: true, newValue: 1 },
        });
      });

      expect(result.current.enableTags).toBe(true);

      act(() => {
        simulateStorageChange({
          enableTags: { oldValue: 1, newValue: "" },
        });
      });

      expect(result.current.enableTags).toBe(false);
    });
  });

  describe("return value structure", () => {
    it("returns an object with enableTags property", () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current).toHaveProperty("enableTags");
      expect(typeof result.current.enableTags).toBe("boolean");
    });

    it("return value is stable between re-renders when state unchanged", async () => {
      const { result, rerender } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockStorageGet).toHaveBeenCalled();
      });

      const firstEnableTags = result.current.enableTags;

      rerender();

      expect(result.current.enableTags).toBe(firstEnableTags);
    });
  });

  describe("multiple instances", () => {
    it("multiple hook instances share the same storage state", async () => {
      const { result: result1 } = renderHook(() => useSettings());
      const { result: result2 } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockStorageGet).toHaveBeenCalled();
      });

      // Both should have the same initial value
      expect(result1.current.enableTags).toBe(result2.current.enableTags);

      // Simulate storage change
      act(() => {
        simulateStorageChange({
          enableTags: { oldValue: true, newValue: false },
        });
      });

      // Both should update
      expect(result1.current.enableTags).toBe(false);
      expect(result2.current.enableTags).toBe(false);
    });

    it("each instance registers its own listener", async () => {
      renderHook(() => useSettings());
      renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalledTimes(2);
      });

      expect(storageChangeListeners.length).toBe(2);
    });

    it("unmounting one instance does not affect others", async () => {
      const { result: result1 } = renderHook(() => useSettings());
      const { result: _result2, unmount: unmount2 } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(storageChangeListeners.length).toBe(2);
      });

      unmount2();

      expect(storageChangeListeners.length).toBe(1);

      // First instance should still receive updates
      act(() => {
        simulateStorageChange({
          enableTags: { oldValue: true, newValue: false },
        });
      });

      expect(result1.current.enableTags).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles undefined changes object in storage event", async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalled();
      });

      const initialValue = result.current.enableTags;

      // Simulate empty changes
      act(() => {
        simulateStorageChange({});
      });

      expect(result.current.enableTags).toBe(initialValue);
    });

    it("handles storage change with undefined newValue", async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalled();
      });

      act(() => {
        simulateStorageChange({
          enableTags: { oldValue: true, newValue: undefined },
        });
      });

      // Boolean(undefined) = false
      expect(result.current.enableTags).toBe(false);
    });
  });
});
