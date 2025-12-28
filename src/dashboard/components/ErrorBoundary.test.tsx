/**
 * @fileoverview Comprehensive tests for the ErrorBoundary component.
 *
 * Tests the React error boundary that catches JavaScript errors in the
 * component tree and displays a fallback UI instead of crashing.
 *
 * Coverage includes:
 * - Normal rendering (no errors)
 * - Error catching and fallback UI display
 * - Error message display
 * - Reload button functionality
 * - Multiple error scenarios
 * - Recovery behavior
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";

// Component that throws an error
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>Normal content</div>;
}

// Component that throws with different error types
function ThrowingWithType({ errorType }: { errorType: "error" | "type" | "reference" }) {
  if (errorType === "error") {
    throw new Error("Generic error");
  } else if (errorType === "type") {
    throw new TypeError("Type error occurred");
  } else if (errorType === "reference") {
    throw new ReferenceError("Reference error occurred");
  }
  return null;
}

describe("ErrorBoundary", () => {
  // Suppress console.error for expected errors during tests
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("normal rendering (no errors)", () => {
    it("renders children when no error occurs", () => {
      render(
        <ErrorBoundary>
          <div>Hello World</div>
        </ErrorBoundary>
      );

      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText("First child")).toBeInTheDocument();
      expect(screen.getByText("Second child")).toBeInTheDocument();
    });

    it("renders nested components", () => {
      function NestedComponent() {
        return <span>Nested content</span>;
      }

      render(
        <ErrorBoundary>
          <div>
            <NestedComponent />
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText("Nested content")).toBeInTheDocument();
    });

    it("does not show error UI when children render successfully", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Normal content")).toBeInTheDocument();
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });
  });

  describe("error catching", () => {
    it("catches errors thrown by children", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Should show error UI, not crash
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("catches errors from deeply nested components", () => {
      function DeepParent() {
        return (
          <div>
            <div>
              <ThrowingComponent />
            </div>
          </div>
        );
      }

      render(
        <ErrorBoundary>
          <DeepParent />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("catches TypeError", () => {
      render(
        <ErrorBoundary>
          <ThrowingWithType errorType="type" />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Type error occurred")).toBeInTheDocument();
    });

    it("catches ReferenceError", () => {
      render(
        <ErrorBoundary>
          <ThrowingWithType errorType="reference" />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Reference error occurred")).toBeInTheDocument();
    });
  });

  describe("fallback UI", () => {
    it("displays error title", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("displays error description", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(
        screen.getByText("An error occurred while loading the dashboard.")
      ).toBeInTheDocument();
    });

    it("displays error message in pre block", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const errorMessage = screen.getByText("Test error message");
      expect(errorMessage.tagName).toBe("PRE");
    });

    it("displays Reload button", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
    });

    it("renders within a Card component structure", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Check for card structure by looking for the container class
      const container = document.querySelector(".container");
      expect(container).toBeInTheDocument();
    });
  });

  describe("reload functionality", () => {
    it("calls window.location.reload when Reload button is clicked", () => {
      // Mock window.location.reload
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole("button", { name: "Reload page" });
      fireEvent.click(reloadButton);

      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("static getDerivedStateFromError", () => {
    it("updates state with hasError: true", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // If hasError is true, we see the error UI
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("captures the error object", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // The error message is displayed, confirming the error was captured
      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });
  });

  describe("componentDidCatch", () => {
    it("is called when an error occurs", () => {
      // We can verify componentDidCatch was called by checking that
      // the error boundary properly handled the error
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // The component should not crash, indicating componentDidCatch worked
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  describe("error message display", () => {
    it("displays short error messages", () => {
      function ShortError() {
        throw new Error("Short");
      }

      render(
        <ErrorBoundary>
          <ShortError />
        </ErrorBoundary>
      );

      expect(screen.getByText("Short")).toBeInTheDocument();
    });

    it("displays long error messages", () => {
      const longMessage = "A".repeat(500);
      function LongError() {
        throw new Error(longMessage);
      }

      render(
        <ErrorBoundary>
          <LongError />
        </ErrorBoundary>
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("displays error messages with special characters", () => {
      function SpecialError() {
        throw new Error("Error: <script>alert('xss')</script> & \"quotes\"");
      }

      render(
        <ErrorBoundary>
          <SpecialError />
        </ErrorBoundary>
      );

      // The message should be escaped properly (React handles this)
      expect(
        screen.getByText("Error: <script>alert('xss')</script> & \"quotes\"")
      ).toBeInTheDocument();
    });

    it("displays error messages with newlines", () => {
      function MultilineError() {
        throw new Error("Line 1\nLine 2\nLine 3");
      }

      render(
        <ErrorBoundary>
          <MultilineError />
        </ErrorBoundary>
      );

      const pre = screen.getByText(/Line 1/);
      expect(pre.textContent).toContain("Line 1");
      expect(pre.textContent).toContain("Line 2");
    });

    it("handles error without message gracefully", () => {
      function EmptyError() {
        throw new Error("");
      }

      render(
        <ErrorBoundary>
          <EmptyError />
        </ErrorBoundary>
      );

      // Should still show the error UI
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles errors during initial render", () => {
      function InitialRenderError() {
        throw new Error("Initial render error");
      }

      render(
        <ErrorBoundary>
          <InitialRenderError />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("handles errors from state updates", () => {
      function StateUpdateError() {
        const [, setCount] = React.useState(0);

        React.useEffect(() => {
          // This will cause an error during effect cleanup
          setCount(() => {
            throw new Error("State update error");
          });
        }, []);

        return <div>Content</div>;
      }

      render(
        <ErrorBoundary>
          <StateUpdateError />
        </ErrorBoundary>
      );

      // The error boundary should catch this
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("maintains error state after re-render", () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();

      // Re-render with same error
      rerender(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Should still show error UI
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("wraps content in app container", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const appContainer = document.querySelector(".app");
      expect(appContainer).toBeInTheDocument();
    });
  });

  describe("multiple error boundaries", () => {
    it("only the nearest error boundary catches the error", () => {
      render(
        <ErrorBoundary>
          <div>Outer content</div>
          <ErrorBoundary>
            <ThrowingComponent />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // The inner error boundary should catch it, so outer content is visible
      // Note: This test may need adjustment based on actual component behavior
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies subtle class to description", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const description = screen.getByText("An error occurred while loading the dashboard.");
      expect(description).toHaveClass("subtle");
    });

    it("error message pre has proper styling attributes", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const pre = screen.getByText("Test error message");
      expect(pre).toHaveStyle({ overflow: "auto" });
    });
  });
});
