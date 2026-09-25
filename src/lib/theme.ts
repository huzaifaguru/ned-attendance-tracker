export type Theme = "light" | "dark";

/** Only the light/dark preference is stored — never any attendance data. */
export const THEME_KEY = "ned-attendance-tracker:theme";

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme:
 * the saved choice wins, otherwise the system preference.
 */
export const themeInitScript = `(function(){var t;try{t=localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch(e){}
if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}
document.documentElement.dataset.theme=t})()`;

export function applyTheme(theme: Theme, persist: boolean) {
  document.documentElement.dataset.theme = theme;
  if (!persist) return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage unavailable — the choice still applies for this visit
  }
}

export function savedTheme(): Theme | null {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}
