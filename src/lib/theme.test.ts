/**
 * @fileoverview Comprehensive tests for theme preference utilities.
 *
 * Tests the theme management functions that handle light/dark mode preferences
 * with safe DOM and localStorage access.
 *
 * Coverage includes:
 * - getTheme: Reading stored theme preference
 * - applyTheme: Setting theme on document and persisting to storage
 * - initTheme: Initializing theme on page load
 * - Error handling for storage/DOM access failures
 * - Edge cases and browser compatibility
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyTheme, getTheme, initTheme, type ThemePreference } from "./theme";

describe("theme utilities", () => {
  // Store original implementations
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset document theme
    delete document.documentElement.dataset.theme;
    // Store reference to original localStorage
    originalLocalStorage = window.localStorage;
  });

  afterEach(() => {
    // Restore original localStorage if it was replaced
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  describe("getTheme", () => {
    it("returns null when no theme is stored", () => {
      expect(getTheme()).toBeNull();
    });

    it("returns 'light' when light theme is stored", () => {
      localStorage.setItem("unclutter.theme", "light");
      expect(getTheme()).toBe("light");
    });

    it("returns 'dark' when dark theme is stored", () => {
      localStorage.setItem("unclutter.theme", "dark");
      expect(getTheme()).toBe("dark");
    });

    it("returns null for invalid stored values", () => {
      localStorage.setItem("unclutter.theme", "invalid");
      expect(getTheme()).toBeNull();
    });

    it("returns null for empty string stored value", () => {
      localStorage.setItem("unclutter.theme", "");
      expect(getTheme()).toBeNull();
    });

    it("returns null for 'system' stored value (not supported)", () => {
      localStorage.setItem("unclutter.theme", "system");
      expect(getTheme()).toBeNull();
    });

    it("is case-sensitive (returns null for 'Light')", () => {
      localStorage.setItem("unclutter.theme", "Light");
      expect(getTheme()).toBeNull();
    });

    it("is case-sensitive (returns null for 'DARK')", () => {
      localStorage.setItem("unclutter.theme", "DARK");
      expect(getTheme()).toBeNull();
    });

    it("handles localStorage access errors gracefully", () => {
      // Mock localStorage to throw
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("localStorage is not available");
        },
        configurable: true,
      });

      // Should not throw, returns null
      expect(() => getTheme()).not.toThrow();
      expect(getTheme()).toBeNull();
    });

    it("handles localStorage.getItem throwing", () => {
      const mockStorage = {
        getItem: vi.fn().mockImplementation(() => {
          throw new Error("Access denied");
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };
      Object.defineProperty(window, "localStorage", {
        value: mockStorage,
        writable: true,
      });

      expect(() => getTheme()).not.toThrow();
      expect(getTheme()).toBeNull();
    });
  });

  describe("applyTheme", () => {
    describe("with valid theme values", () => {
      it("applies light theme to document", () => {
        applyTheme("light");

        expect(document.documentElement.dataset.theme).toBe("light");
      });

      it("applies dark theme to document", () => {
        applyTheme("dark");

        expect(document.documentElement.dataset.theme).toBe("dark");
      });

      it("persists light theme to localStorage", () => {
        applyTheme("light");

        expect(localStorage.getItem("unclutter.theme")).toBe("light");
      });

      it("persists dark theme to localStorage", () => {
        applyTheme("dark");

        expect(localStorage.getItem("unclutter.theme")).toBe("dark");
      });

      it("overwrites existing theme preference", () => {
        localStorage.setItem("unclutter.theme", "light");
        document.documentElement.dataset.theme = "light";

        applyTheme("dark");

        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(localStorage.getItem("unclutter.theme")).toBe("dark");
      });
    });

    describe("with null (reset theme)", () => {
      it("removes theme from document when null is passed", () => {
        document.documentElement.dataset.theme = "dark";

        applyTheme(null);

        expect(document.documentElement.dataset.theme).toBeUndefined();
      });

      it("removes theme from localStorage when null is passed", () => {
        localStorage.setItem("unclutter.theme", "dark");

        applyTheme(null);

        expect(localStorage.getItem("unclutter.theme")).toBeNull();
      });

      it("handles null when no theme was previously set", () => {
        // Should not throw
        expect(() => applyTheme(null)).not.toThrow();
        expect(document.documentElement.dataset.theme).toBeUndefined();
      });
    });

    describe("error handling", () => {
      it("handles localStorage write errors gracefully", () => {
        const mockStorage = {
          getItem: vi.fn().mockReturnValue(null),
          setItem: vi.fn().mockImplementation(() => {
            throw new Error("QuotaExceededError");
          }),
          removeItem: vi.fn(),
          clear: vi.fn(),
          length: 0,
          key: vi.fn(),
        };
        Object.defineProperty(window, "localStorage", {
          value: mockStorage,
          writable: true,
        });

        // Should not throw, but theme should still be applied to DOM
        expect(() => applyTheme("dark")).not.toThrow();
        expect(document.documentElement.dataset.theme).toBe("dark");
      });

      it("handles localStorage removeItem errors gracefully", () => {
        const mockStorage = {
          getItem: vi.fn().mockReturnValue("dark"),
          setItem: vi.fn(),
          removeItem: vi.fn().mockImplementation(() => {
            throw new Error("Access denied");
          }),
          clear: vi.fn(),
          length: 0,
          key: vi.fn(),
        };
        Object.defineProperty(window, "localStorage", {
          value: mockStorage,
          writable: true,
        });

        // Should not throw
        expect(() => applyTheme(null)).not.toThrow();
      });

      it("handles document access errors gracefully", () => {
        // Mock document.documentElement.dataset to be read-only
        const originalDataset = document.documentElement.dataset;
        Object.defineProperty(document.documentElement, "dataset", {
          get() {
            throw new Error("DOM access error");
          },
          configurable: true,
        });

        // Should not throw
        expect(() => applyTheme("dark")).not.toThrow();

        // Restore
        Object.defineProperty(document.documentElement, "dataset", {
          value: originalDataset,
          writable: true,
          configurable: true,
        });
      });
    });
  });

  describe("initTheme", () => {
    it("applies stored light theme on initialization", () => {
      localStorage.setItem("unclutter.theme", "light");

      initTheme();

      expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("applies stored dark theme on initialization", () => {
      localStorage.setItem("unclutter.theme", "dark");

      initTheme();

      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    it("removes theme attribute when no valid theme is stored", () => {
      document.documentElement.dataset.theme = "stale";

      initTheme();

      expect(document.documentElement.dataset.theme).toBeUndefined();
    });

    it("removes theme attribute for invalid stored value", () => {
      localStorage.setItem("unclutter.theme", "invalid");
      document.documentElement.dataset.theme = "stale";

      initTheme();

      expect(document.documentElement.dataset.theme).toBeUndefined();
    });

    it("does not persist to localStorage (read-only operation)", () => {
      localStorage.setItem("unclutter.theme", "dark");
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

      initTheme();

      // initTheme should not call setItem (only reads and applies to DOM)
      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it("handles localStorage errors gracefully", () => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("localStorage is not available");
        },
        configurable: true,
      });

      // Should not throw
      expect(() => initTheme()).not.toThrow();
    });

    it("handles DOM errors gracefully", () => {
      localStorage.setItem("unclutter.theme", "dark");

      const originalDataset = document.documentElement.dataset;
      Object.defineProperty(document.documentElement, "dataset", {
        get() {
          throw new Error("DOM access error");
        },
        configurable: true,
      });

      // Should not throw
      expect(() => initTheme()).not.toThrow();

      // Restore
      Object.defineProperty(document.documentElement, "dataset", {
        value: originalDataset,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("integration scenarios", () => {
    it("full lifecycle: init -> apply dark -> apply light -> reset", () => {
      // 1. Initial state - no theme
      expect(getTheme()).toBeNull();

      // 2. Apply dark theme
      applyTheme("dark");
      expect(getTheme()).toBe("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");

      // 3. Simulate page reload - init should restore dark
      initTheme();
      expect(document.documentElement.dataset.theme).toBe("dark");

      // 4. Switch to light
      applyTheme("light");
      expect(getTheme()).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("light");

      // 5. Reset theme
      applyTheme(null);
      expect(getTheme()).toBeNull();
      expect(document.documentElement.dataset.theme).toBeUndefined();
    });

    it("persists across simulated page reloads", () => {
      // First "session"
      applyTheme("dark");
      expect(localStorage.getItem("unclutter.theme")).toBe("dark");

      // Simulate reload by clearing DOM state
      delete document.documentElement.dataset.theme;

      // Second "session" - init should restore
      initTheme();
      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    it("handles rapid theme switching", () => {
      for (let i = 0; i < 10; i++) {
        applyTheme(i % 2 === 0 ? "dark" : "light");
      }

      // Final state should be light (last iteration: i=9, 9%2=1, so "light")
      expect(getTheme()).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("light");
    });
  });

  describe("storage key isolation", () => {
    it("uses the correct storage key", () => {
      applyTheme("dark");

      // Verify it's stored under the correct key
      expect(localStorage.getItem("unclutter.theme")).toBe("dark");

      // Verify other keys are not affected
      expect(localStorage.getItem("theme")).toBeNull();
      expect(localStorage.getItem("unclutter-theme")).toBeNull();
    });

    it("does not interfere with other localStorage items", () => {
      localStorage.setItem("other-app.theme", "blue");
      localStorage.setItem("someOtherKey", "someValue");

      applyTheme("dark");

      expect(localStorage.getItem("other-app.theme")).toBe("blue");
      expect(localStorage.getItem("someOtherKey")).toBe("someValue");
    });
  });

  describe("type safety", () => {
    it("getTheme returns correct type", () => {
      const result: ThemePreference = getTheme();
      expect(result === "light" || result === "dark" || result === null).toBe(true);
    });

    it("applyTheme accepts all valid ThemePreference values", () => {
      const preferences: ThemePreference[] = ["light", "dark", null];

      preferences.forEach((pref) => {
        expect(() => applyTheme(pref)).not.toThrow();
      });
    });
  });
});
