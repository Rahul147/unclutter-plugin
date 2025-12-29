import React from "react";

import { applyTheme, getTheme } from "../../lib/theme";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const pref = getTheme();
  if (pref === "light" || pref === "dark") return pref;

  const systemDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;

  return systemDark ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>(getInitialTheme);

  const toggleTheme = React.useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  return {
    theme,
    toggleTheme,
    isDark: theme === "dark",
  };
}
