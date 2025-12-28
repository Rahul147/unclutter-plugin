import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTheme } from "./useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset document theme
    delete document.documentElement.dataset.theme;
    // Mock matchMedia for system preference
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false, // Default to light mode
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("initial state", () => {
    it("defaults to light theme when no preference set", () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("light");
      expect(result.current.isDark).toBe(false);
    });

    it("respects stored light preference", () => {
      localStorage.setItem("unclutter.theme", "light");

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("light");
      expect(result.current.isDark).toBe(false);
    });

    it("respects stored dark preference", () => {
      localStorage.setItem("unclutter.theme", "dark");

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });

    it("uses system preference when no stored preference", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === "(prefers-color-scheme: dark)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });
  });

  describe("toggleTheme", () => {
    it("toggles from light to dark", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });

    it("toggles from dark to light", () => {
      localStorage.setItem("unclutter.theme", "dark");

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("light");
      expect(result.current.isDark).toBe(false);
    });

    it("persists theme to localStorage", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorage.getItem("unclutter.theme")).toBe("dark");
    });

    it("updates document theme attribute", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });
});
