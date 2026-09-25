"use client";

import { useEffect, useState } from "react";
import { applyTheme, savedTheme, type Theme } from "@/lib/theme";

const SunIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the theme the head script applied
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    // Until the user picks a theme, keep following the system setting.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      if (savedTheme()) return;
      const next: Theme = e.matches ? "dark" : "light";
      applyTheme(next, false);
      setTheme(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => { applyTheme(next, true); setTheme(next); }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="btn btn-secondary min-h-11 px-2 text-small"
      // Hidden until mounted so the icon never disagrees with the applied theme.
      style={theme ? undefined : { visibility: "hidden" }}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
