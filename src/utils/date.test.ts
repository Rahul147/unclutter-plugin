import { describe, expect, it } from "vitest";

import { formatIST, formatRelativeAgo, formatRelativeDays } from "./date";

describe("formatRelativeDays", () => {
  const now = 1700000000000; // Fixed timestamp for testing

  it("returns 'Today' for same day", () => {
    expect(formatRelativeDays(now, now)).toBe("Today");
    expect(formatRelativeDays(now - 1000, now)).toBe("Today"); // 1 second ago
    expect(formatRelativeDays(now - 3600000, now)).toBe("Today"); // 1 hour ago
  });

  it("returns '1 day ago' for yesterday", () => {
    const yesterday = now - 86400000;
    expect(formatRelativeDays(yesterday, now)).toBe("1 day ago");
  });

  it("returns 'X days ago' for multiple days", () => {
    expect(formatRelativeDays(now - 86400000 * 2, now)).toBe("2 days ago");
    expect(formatRelativeDays(now - 86400000 * 7, now)).toBe("7 days ago");
    expect(formatRelativeDays(now - 86400000 * 30, now)).toBe("30 days ago");
  });

  it("handles future timestamps as 'Today'", () => {
    expect(formatRelativeDays(now + 86400000, now)).toBe("Today");
  });

  it("returns empty string for non-finite values", () => {
    expect(formatRelativeDays(NaN, now)).toBe("");
    expect(formatRelativeDays(Infinity, now)).toBe("");
  });
});

describe("formatRelativeAgo", () => {
  const now = 1700000000000;
  const minute = 60000;
  const hour = 3600000;
  const day = 86400000;

  it("returns '1 minute ago' for very recent times", () => {
    expect(formatRelativeAgo(now, now)).toBe("1 minute ago");
    expect(formatRelativeAgo(now - 1000, now)).toBe("1 minute ago"); // 1 second
    expect(formatRelativeAgo(now - 30000, now)).toBe("1 minute ago"); // 30 seconds
  });

  it("returns minutes for times under an hour", () => {
    expect(formatRelativeAgo(now - minute, now)).toBe("1 minute ago");
    expect(formatRelativeAgo(now - minute * 2, now)).toBe("2 minutes ago");
    expect(formatRelativeAgo(now - minute * 30, now)).toBe("30 minutes ago");
    expect(formatRelativeAgo(now - minute * 59, now)).toBe("59 minutes ago");
  });

  it("returns hours for times under a day", () => {
    expect(formatRelativeAgo(now - hour, now)).toBe("1 hour ago");
    expect(formatRelativeAgo(now - hour * 2, now)).toBe("2 hours ago");
    expect(formatRelativeAgo(now - hour * 12, now)).toBe("12 hours ago");
    expect(formatRelativeAgo(now - hour * 23, now)).toBe("23 hours ago");
  });

  it("returns days for times over a day", () => {
    expect(formatRelativeAgo(now - day, now)).toBe("1 day ago");
    expect(formatRelativeAgo(now - day * 2, now)).toBe("2 days ago");
    expect(formatRelativeAgo(now - day * 7, now)).toBe("7 days ago");
    expect(formatRelativeAgo(now - day * 365, now)).toBe("365 days ago");
  });

  it("returns empty string for non-finite values", () => {
    expect(formatRelativeAgo(NaN, now)).toBe("");
    expect(formatRelativeAgo(Infinity, now)).toBe("");
  });
});

describe("formatIST", () => {
  it("formats timestamp in IST timezone with exact time conversion", () => {
    // Use a known timestamp: Jan 15, 2024 at 10:30:00 UTC
    // IST is UTC+5:30, so 10:30 UTC = 16:00 IST (4:00 PM)
    const timestamp = Date.UTC(2024, 0, 15, 10, 30, 0);
    const result = formatIST(timestamp);

    // Assert exact formatted output
    expect(result).toBe("15th Jan 2024, 04:00PM IST");
  });

  it("returns empty string for non-finite values", () => {
    expect(formatIST(NaN)).toBe("");
    expect(formatIST(Infinity)).toBe("");
  });

  it("includes ordinal suffix correctly", () => {
    // 1st
    const first = Date.UTC(2024, 0, 1, 0, 0, 0);
    expect(formatIST(first)).toContain("1st");

    // 2nd
    const second = Date.UTC(2024, 0, 2, 0, 0, 0);
    expect(formatIST(second)).toContain("2nd");

    // 3rd
    const third = Date.UTC(2024, 0, 3, 0, 0, 0);
    expect(formatIST(third)).toContain("3rd");

    // 4th
    const fourth = Date.UTC(2024, 0, 4, 0, 0, 0);
    expect(formatIST(fourth)).toContain("4th");

    // 11th (special case)
    const eleventh = Date.UTC(2024, 0, 11, 0, 0, 0);
    expect(formatIST(eleventh)).toContain("11th");

    // 21st
    const twentyFirst = Date.UTC(2024, 0, 21, 0, 0, 0);
    expect(formatIST(twentyFirst)).toContain("21st");
  });
});
