/**
 * @fileoverview Comprehensive tests for the TagEditor component.
 *
 * Tests the tag input component with autocomplete functionality for
 * adding, removing, and managing tags on saved items.
 *
 * Coverage includes:
 * - Adding tags via Enter, Tab, comma
 * - Removing tags via × button and Backspace
 * - Autocomplete suggestions and keyboard navigation
 * - Validation (max length, max count, duplicates)
 * - Paste handling for bulk tag input
 * - Accessibility (ARIA attributes, live regions)
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TagEditor, type TagEditorProps } from "./TagEditor";

describe("TagEditor", () => {
  const defaultProps: TagEditorProps = {
    value: [],
    suggestions: ["react", "typescript", "javascript", "testing", "vitest"],
    onChange: vi.fn(),
  };

  const createProps = (overrides: Partial<TagEditorProps> = {}): TagEditorProps => ({
    ...defaultProps,
    ...overrides,
    onChange: overrides.onChange ?? vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders input with placeholder", () => {
      render(<TagEditor {...createProps()} />);

      expect(screen.getByPlaceholderText("Add a tag…")).toBeInTheDocument();
    });

    it("renders existing tags as chips", () => {
      render(<TagEditor {...createProps({ value: ["react", "typescript"] })} />);

      expect(screen.getByText("react")).toBeInTheDocument();
      expect(screen.getByText("typescript")).toBeInTheDocument();
    });

    it("renders remove button for each tag", () => {
      render(<TagEditor {...createProps({ value: ["react", "typescript"] })} />);

      const removeButtons = screen.getAllByRole("button", { name: /Remove/ });
      expect(removeButtons).toHaveLength(2);
    });

    it("renders empty state when no tags", () => {
      render(<TagEditor {...createProps({ value: [] })} />);

      expect(screen.queryByText("react")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Add a tag…")).toBeInTheDocument();
    });
  });

  describe("adding tags", () => {
    it("adds tag on Enter key", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "newtag{Enter}");

      expect(onChange).toHaveBeenCalledWith(["newtag"]);
    });

    it("adds tag on Tab key", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "newtag");
      await userEvent.tab();

      expect(onChange).toHaveBeenCalledWith(["newtag"]);
    });

    it("adds tag on comma key", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "newtag,");

      expect(onChange).toHaveBeenCalledWith(["newtag"]);
    });

    it("trims whitespace from tag", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "  newtag  {Enter}");

      expect(onChange).toHaveBeenCalledWith(["newtag"]);
    });

    it("does not add empty tag", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "   {Enter}");

      expect(onChange).not.toHaveBeenCalled();
    });

    it("clears input after adding tag", async () => {
      render(<TagEditor {...createProps()} />);

      const input = screen.getByPlaceholderText("Add a tag…") as HTMLInputElement;
      await userEvent.type(input, "newtag{Enter}");

      expect(input.value).toBe("");
    });

    it("adds to existing tags", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ value: ["existing"], onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "newtag{Enter}");

      expect(onChange).toHaveBeenCalledWith(["existing", "newtag"]);
    });
  });

  describe("removing tags", () => {
    it("removes tag when × button is clicked", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ value: ["react", "typescript"], onChange })} />);

      const removeButton = screen.getByRole("button", { name: "Remove react" });
      await userEvent.click(removeButton);

      expect(onChange).toHaveBeenCalledWith(["typescript"]);
    });

    it("removes last tag on Backspace when input is empty", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ value: ["react", "typescript"], onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.click(input);
      await userEvent.keyboard("{Backspace}");

      expect(onChange).toHaveBeenCalledWith(["react"]);
    });

    it("does not remove tag on Backspace when input has text", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ value: ["react"], onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "test");
      await userEvent.keyboard("{Backspace}");

      // Should only delete the 't' from 'test', not remove a tag
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("prevents duplicate tags (case-insensitive)", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ value: ["React"], onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "react{Enter}");

      expect(onChange).not.toHaveBeenCalled();
      // Should show hint message
      await waitFor(() => {
        expect(screen.getByText("Tag already added.")).toBeInTheDocument();
      });
    });

    it("enforces maximum tag length of 30 characters", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      const longTag = "a".repeat(31);
      await userEvent.type(input, `${longTag}{Enter}`);

      expect(onChange).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText("Tag too long (max 30 characters).")).toBeInTheDocument();
      });
    });

    it("allows tag with exactly 30 characters", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      const exactTag = "a".repeat(30);
      await userEvent.type(input, `${exactTag}{Enter}`);

      expect(onChange).toHaveBeenCalledWith([exactTag]);
    });

    it("enforces maximum of 20 tags per item", async () => {
      const onChange = vi.fn();
      const existingTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
      render(<TagEditor {...createProps({ value: existingTags, onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "onemore{Enter}");

      expect(onChange).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText("Maximum 20 tags per item.")).toBeInTheDocument();
      });
    });
  });

  describe("autocomplete suggestions", () => {
    it("shows suggestions when typing", async () => {
      render(<TagEditor {...createProps()} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "re");

      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "react" })).toBeInTheDocument();
      });
    });

    it("filters suggestions based on input", async () => {
      render(<TagEditor {...createProps()} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "type");

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "typescript" })).toBeInTheDocument();
        expect(screen.queryByRole("option", { name: "react" })).not.toBeInTheDocument();
      });
    });

    it("excludes already selected tags from suggestions", async () => {
      render(<TagEditor {...createProps({ value: ["react"] })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "re");

      await waitFor(() => {
        // 'react' should not appear since it's already selected
        expect(screen.queryByRole("option", { name: "react" })).not.toBeInTheDocument();
      });
    });

    it("selects suggestion on click", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "re");

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "react" })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("option", { name: "react" }));

      expect(onChange).toHaveBeenCalledWith(["react"]);
    });

    it("navigates suggestions with ArrowDown/ArrowUp", async () => {
      render(<TagEditor {...createProps()} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "t");

      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });

      // Navigate down
      await userEvent.keyboard("{ArrowDown}");

      // First option should be active
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");

      // Navigate down again
      await userEvent.keyboard("{ArrowDown}");
      expect(options[1]).toHaveAttribute("aria-selected", "true");

      // Navigate up
      await userEvent.keyboard("{ArrowUp}");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
    });

    it("selects highlighted suggestion on Enter", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "type");

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "typescript" })).toBeInTheDocument();
      });

      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{Enter}");

      expect(onChange).toHaveBeenCalledWith(["typescript"]);
    });

    it("closes suggestions on Escape", async () => {
      render(<TagEditor {...createProps()} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "re");

      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });

      await userEvent.keyboard("{Escape}");

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("limits suggestions to 8 items", async () => {
      const manySuggestions = Array.from({ length: 20 }, (_, i) => `tag${i}`);
      render(<TagEditor {...createProps({ suggestions: manySuggestions })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "tag");

      await waitFor(() => {
        const options = screen.getAllByRole("option");
        expect(options.length).toBeLessThanOrEqual(8);
      });
    });
  });

  describe("paste handling", () => {
    it("handles pasting comma-separated tags", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");

      // Simulate paste event
      const pasteData = "react, typescript, testing";
      const clipboardData = {
        getData: () => pasteData,
      };

      fireEvent.paste(input, { clipboardData });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
        const calledWith = onChange.mock.calls[onChange.mock.calls.length - 1][0];
        expect(calledWith).toContain("react");
        expect(calledWith).toContain("typescript");
        expect(calledWith).toContain("testing");
      });
    });

    it("handles pasting semicolon-separated tags", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");

      const pasteData = "react; typescript; testing";
      const clipboardData = {
        getData: () => pasteData,
      };

      fireEvent.paste(input, { clipboardData });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });
    });

    it("filters empty entries from pasted content", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");

      const pasteData = "react,,, typescript,  , testing";
      const clipboardData = {
        getData: () => pasteData,
      };

      fireEvent.paste(input, { clipboardData });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
        const calledWith = onChange.mock.calls[onChange.mock.calls.length - 1][0];
        // Should not include empty strings
        expect(calledWith.every((t: string) => t.length > 0)).toBe(true);
      });
    });
  });

  describe("accessibility", () => {
    it("input has combobox role", () => {
      render(<TagEditor {...createProps()} />);

      const input = screen.getByRole("combobox");
      expect(input).toBeInTheDocument();
    });

    it("input has aria-expanded attribute", async () => {
      render(<TagEditor {...createProps()} />);

      const input = screen.getByRole("combobox");
      expect(input).toHaveAttribute("aria-expanded", "false");

      await userEvent.type(input, "re");

      await waitFor(() => {
        expect(input).toHaveAttribute("aria-expanded", "true");
      });
    });

    it("input has aria-autocomplete attribute", () => {
      render(<TagEditor {...createProps()} />);

      const input = screen.getByRole("combobox");
      expect(input).toHaveAttribute("aria-autocomplete", "list");
    });

    it("input has aria-controls pointing to listbox", async () => {
      render(<TagEditor {...createProps()} />);

      const input = screen.getByRole("combobox");
      const controlsId = input.getAttribute("aria-controls");
      expect(controlsId).toBeTruthy();

      await userEvent.type(input, "re");

      await waitFor(() => {
        const listbox = screen.getByRole("listbox");
        expect(listbox).toHaveAttribute("id", controlsId);
      });
    });

    it("has aria-activedescendant when option is highlighted", async () => {
      render(<TagEditor {...createProps()} />);

      const input = screen.getByRole("combobox");
      await userEvent.type(input, "re");

      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });

      await userEvent.keyboard("{ArrowDown}");

      expect(input.getAttribute("aria-activedescendant")).toBeTruthy();
    });

    it("remove buttons have accessible labels", () => {
      render(<TagEditor {...createProps({ value: ["react", "typescript"] })} />);

      expect(screen.getByRole("button", { name: "Remove react" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove typescript" })).toBeInTheDocument();
    });

    it("has live region for announcements", () => {
      render(<TagEditor {...createProps()} />);

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles empty suggestions array", async () => {
      render(<TagEditor {...createProps({ suggestions: [] })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "anything");

      // Should not show listbox when no suggestions
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("handles unicode tags", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "日本語{Enter}");

      expect(onChange).toHaveBeenCalledWith(["日本語"]);
    });

    it("handles tags with special characters", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "c++{Enter}");

      expect(onChange).toHaveBeenCalledWith(["c++"]);
    });

    it("handles rapid tag addition", async () => {
      const onChange = vi.fn();
      render(<TagEditor {...createProps({ onChange })} />);

      const input = screen.getByPlaceholderText("Add a tag…");

      // Type multiple tags quickly
      await userEvent.type(input, "tag1{Enter}");
      await userEvent.type(input, "tag2{Enter}");
      await userEvent.type(input, "tag3{Enter}");

      expect(onChange).toHaveBeenCalledTimes(3);
    });

    it("maintains focus on input after adding tag", async () => {
      render(<TagEditor {...createProps()} />);

      const input = screen.getByPlaceholderText("Add a tag…");
      await userEvent.type(input, "newtag{Enter}");

      expect(document.activeElement).toBe(input);
    });

    it("maintains focus on input after removing tag via button", async () => {
      render(<TagEditor {...createProps({ value: ["react"] })} />);

      const removeButton = screen.getByRole("button", { name: "Remove react" });
      await userEvent.click(removeButton);

      const input = screen.getByPlaceholderText("Add a tag…");
      expect(document.activeElement).toBe(input);
    });
  });
});
