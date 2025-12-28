/**
 * @fileoverview Comprehensive tests for the className utility function.
 *
 * The `cn` function is a utility for composing CSS class names from various
 * input types: strings, numbers, booleans, arrays, and objects (conditional classes).
 *
 * Coverage includes:
 * - Primitive inputs (strings, numbers, booleans)
 * - Falsy value handling (null, undefined, false, 0, "")
 * - Object/dictionary inputs for conditional classes
 * - Array inputs (flat and nested)
 * - Mixed input combinations
 * - Edge cases and real-world usage patterns
 */

import { describe, expect, it } from "vitest";

import { cn, type ClassValue } from "./utils";

describe("cn (className utility)", () => {
  describe("primitive string inputs", () => {
    it("returns a single string unchanged", () => {
      expect(cn("foo")).toBe("foo");
    });

    it("joins multiple strings with spaces", () => {
      expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
    });

    it("handles strings with existing spaces", () => {
      expect(cn("foo bar", "baz")).toBe("foo bar baz");
    });

    it("handles empty string input", () => {
      expect(cn("")).toBe("");
    });

    it("filters out empty strings from multiple inputs", () => {
      expect(cn("foo", "", "bar")).toBe("foo bar");
    });

    it("handles strings with special characters", () => {
      expect(cn("hover:bg-blue-500", "md:text-lg", "dark:bg-gray-800")).toBe(
        "hover:bg-blue-500 md:text-lg dark:bg-gray-800"
      );
    });

    it("preserves CSS class naming conventions", () => {
      expect(cn("btn", "btn--primary", "btn__icon")).toBe("btn btn--primary btn__icon");
    });
  });

  describe("number inputs", () => {
    it("converts numbers to strings", () => {
      expect(cn(123)).toBe("123");
    });

    it("handles zero (truthy in cn context, converted to string)", () => {
      // Note: 0 is falsy but gets converted via String(0) = "0"
      // However, looking at the code: if (!value) return "" - so 0 returns ""
      expect(cn(0)).toBe("");
    });

    it("handles negative numbers", () => {
      expect(cn(-1)).toBe("-1");
    });

    it("mixes numbers with strings", () => {
      expect(cn("class", 42)).toBe("class 42");
    });
  });

  describe("boolean inputs", () => {
    it("ignores true (returns empty)", () => {
      // true is truthy but typeof true !== 'string' && !== 'number'
      // and !Array.isArray && typeof !== 'object' so returns ""
      expect(cn(true)).toBe("");
    });

    it("ignores false", () => {
      expect(cn(false)).toBe("");
    });

    it("filters booleans from mixed inputs", () => {
      expect(cn("foo", true, "bar", false)).toBe("foo bar");
    });
  });

  describe("null and undefined inputs", () => {
    it("ignores null", () => {
      expect(cn(null)).toBe("");
    });

    it("ignores undefined", () => {
      expect(cn(undefined)).toBe("");
    });

    it("filters null/undefined from mixed inputs", () => {
      expect(cn("foo", null, "bar", undefined, "baz")).toBe("foo bar baz");
    });

    it("returns empty string for all falsy inputs", () => {
      expect(cn(null, undefined, false, "", 0)).toBe("");
    });
  });

  describe("object/dictionary inputs (conditional classes)", () => {
    it("includes keys with truthy values", () => {
      expect(cn({ foo: true, bar: true })).toBe("foo bar");
    });

    it("excludes keys with falsy values", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("handles all falsy value types", () => {
      expect(
        cn({
          included: true,
          falseVal: false,
          nullVal: null,
          undefinedVal: undefined,
        })
      ).toBe("included");
    });

    it("handles empty object", () => {
      expect(cn({})).toBe("");
    });

    it("handles object with all falsy values", () => {
      expect(cn({ foo: false, bar: null, baz: undefined })).toBe("");
    });

    it("preserves key order (as per Object.entries)", () => {
      const result = cn({ alpha: true, beta: true, gamma: true });
      expect(result).toBe("alpha beta gamma");
    });

    it("works with complex class names as keys", () => {
      expect(
        cn({
          "hover:bg-blue-500": true,
          "focus:ring-2": true,
          "disabled:opacity-50": false,
        })
      ).toBe("hover:bg-blue-500 focus:ring-2");
    });

    it("supports dynamic conditional classes", () => {
      const isActive = true;
      const isDisabled = false;
      const hasError = true;

      expect(
        cn({
          "btn-active": isActive,
          "btn-disabled": isDisabled,
          "btn-error": hasError,
        })
      ).toBe("btn-active btn-error");
    });
  });

  describe("array inputs", () => {
    it("flattens simple arrays", () => {
      expect(cn(["foo", "bar", "baz"])).toBe("foo bar baz");
    });

    it("filters falsy values from arrays", () => {
      expect(cn(["foo", null, "bar", undefined, "baz"])).toBe("foo bar baz");
    });

    it("handles empty arrays", () => {
      expect(cn([])).toBe("");
    });

    it("handles nested arrays", () => {
      expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz");
    });

    it("handles deeply nested arrays", () => {
      expect(cn(["a", ["b", ["c", ["d"]]]])).toBe("a b c d");
    });

    it("handles arrays with objects", () => {
      expect(cn(["foo", { bar: true, baz: false }])).toBe("foo bar");
    });

    it("handles mixed nested content", () => {
      expect(
        cn([
          "base",
          ["variant-1", { active: true }],
          null,
          ["variant-2", { disabled: false }],
        ])
      ).toBe("base variant-1 active variant-2");
    });
  });

  describe("mixed input combinations", () => {
    it("handles strings, objects, and arrays together", () => {
      expect(cn("base", { modifier: true }, ["extra", "classes"])).toBe(
        "base modifier extra classes"
      );
    });

    it("handles complex real-world button styling", () => {
      const variant = "primary";
      const size = "lg";
      const isLoading = true;
      const isDisabled = false;

      expect(
        cn(
          "btn",
          `btn-${variant}`,
          `btn-${size}`,
          {
            "btn-loading": isLoading,
            "btn-disabled": isDisabled,
          },
          ["rounded-md", "shadow-sm"]
        )
      ).toBe("btn btn-primary btn-lg btn-loading rounded-md shadow-sm");
    });

    it("handles conditional rendering patterns", () => {
      const isOpen = true;
      const hasItems = false;

      expect(
        cn(
          "dropdown",
          isOpen && "dropdown-open",
          hasItems && "dropdown-has-items",
          !hasItems && "dropdown-empty"
        )
      ).toBe("dropdown dropdown-open dropdown-empty");
    });

    it("handles Tailwind-style utility class composition", () => {
      const result = cn(
        "flex items-center",
        "px-4 py-2",
        {
          "bg-blue-500 text-white": true,
          "bg-gray-200 text-gray-800": false,
        },
        ["hover:bg-blue-600", "transition-colors"]
      );

      expect(result).toBe(
        "flex items-center px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 transition-colors"
      );
    });
  });

  describe("edge cases", () => {
    it("handles no arguments", () => {
      expect(cn()).toBe("");
    });

    it("handles single falsy argument", () => {
      expect(cn(null)).toBe("");
      expect(cn(undefined)).toBe("");
      expect(cn(false)).toBe("");
      expect(cn("")).toBe("");
    });

    it("handles whitespace-only strings", () => {
      expect(cn("   ")).toBe("   ");
    });

    it("does not collapse multiple spaces between classes", () => {
      expect(cn("foo  bar")).toBe("foo  bar");
    });

    it("handles very long class lists", () => {
      const classes = Array.from({ length: 100 }, (_, i) => `class-${i}`);
      const result = cn(...classes);
      expect(result.split(" ")).toHaveLength(100);
    });

    it("handles objects with numeric keys", () => {
      expect(cn({ 0: true, 1: false, 2: true })).toBe("0 2");
    });

    it("handles unicode class names", () => {
      expect(cn("日本語", "中文", "한국어")).toBe("日本語 中文 한국어");
    });
  });

  describe("type safety scenarios", () => {
    it("properly types return value as string", () => {
      const result: string = cn("foo", "bar");
      expect(typeof result).toBe("string");
    });

    it("accepts ClassValue type parameter", () => {
      const classValue: ClassValue = ["foo", { bar: true }];
      expect(cn(classValue)).toBe("foo bar");
    });

    it("handles tuple-like arrays", () => {
      const tuple: [string, string] = ["first", "second"];
      expect(cn(tuple)).toBe("first second");
    });
  });

  describe("real-world component patterns", () => {
    it("button component with variants", () => {
      type ButtonProps = {
        variant?: "primary" | "secondary" | "ghost";
        size?: "sm" | "md" | "lg";
        isLoading?: boolean;
        isDisabled?: boolean;
        className?: string;
      };

      function getButtonClasses(props: ButtonProps): string {
        const { variant = "primary", size = "md", isLoading, isDisabled, className } = props;

        return cn(
          // Base styles
          "inline-flex items-center justify-center font-medium",
          // Variant styles
          {
            "bg-blue-600 text-white hover:bg-blue-700": variant === "primary",
            "bg-gray-200 text-gray-800 hover:bg-gray-300": variant === "secondary",
            "bg-transparent hover:bg-gray-100": variant === "ghost",
          },
          // Size styles
          {
            "px-2 py-1 text-sm": size === "sm",
            "px-4 py-2 text-base": size === "md",
            "px-6 py-3 text-lg": size === "lg",
          },
          // State styles
          {
            "opacity-50 cursor-wait": isLoading,
            "opacity-50 cursor-not-allowed": isDisabled && !isLoading,
          },
          // Custom classes
          className
        );
      }

      expect(getButtonClasses({ variant: "primary", size: "lg" })).toContain("bg-blue-600");
      expect(getButtonClasses({ variant: "primary", size: "lg" })).toContain("px-6 py-3");
      expect(getButtonClasses({ isLoading: true })).toContain("cursor-wait");
      expect(getButtonClasses({ className: "custom-class" })).toContain("custom-class");
    });

    it("card component with conditional styling", () => {
      const isHovered = true;
      const isSelected = false;
      const elevation = 2;

      const result = cn(
        "card",
        "rounded-lg",
        `shadow-${elevation}`,
        {
          "ring-2 ring-blue-500": isSelected,
          "transform scale-105": isHovered,
        }
      );

      expect(result).toBe("card rounded-lg shadow-2 transform scale-105");
    });
  });
});
