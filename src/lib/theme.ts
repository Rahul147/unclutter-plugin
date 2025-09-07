export type ThemePreference = "light" | "dark" | null;

const STORAGE_KEY = "unclutter.theme";

export function getTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // ignore storage access errors
  }
  return null;
}

export function applyTheme(theme: ThemePreference): void {
  try {
    if (theme === "light" || theme === "dark") {
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // ignore storage write errors
      }
    } else {
      delete document.documentElement.dataset.theme;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore storage write errors
      }
    }
  } catch {
    // ignore DOM access errors
  }
}

export function initTheme(): void {
  const pref = getTheme();
  if (pref === "light" || pref === "dark") {
    try {
      document.documentElement.dataset.theme = pref;
    } catch {
      // ignore DOM access errors
    }
  } else {
    try {
      delete document.documentElement.dataset.theme;
    } catch {
      // ignore DOM access errors
    }
  }
}

