// Theme preference helpers for light/dark mode.
export type ThemePreference = "light" | "dark" | null;

const STORAGE_KEY = "unclutter.theme";

export function getTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // localStorage may be disabled in private browsing
  }
  return null;
}

export function applyTheme(theme: ThemePreference): void {
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage may be disabled in private browsing
    }
  } else {
    delete document.documentElement.dataset.theme;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage may be disabled in private browsing
    }
  }
}

export function initTheme(): void {
  const pref = getTheme();
  if (pref === "light" || pref === "dark") {
    document.documentElement.dataset.theme = pref;
  } else {
    delete document.documentElement.dataset.theme;
  }
}
