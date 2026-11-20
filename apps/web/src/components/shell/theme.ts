import type { ThemePreference } from "@ms/tokens";

export const THEME_COOKIE = "ms-theme";
export const THEMES: readonly ThemePreference[] = ["system", "light", "dark"] as const;

export function isTheme(v: unknown): v is ThemePreference {
  return v === "system" || v === "light" || v === "dark";
}

/**
 * Runs in <head> before first paint: applies the saved theme (cookie) to <html data-theme>.
 * "system" leaves it to prefers-color-scheme in tokens.css.
 */
export const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark|system)/);document.documentElement.setAttribute("data-theme",m?m[1]:"system")}catch(e){}})()`;

export function applyTheme(t: ThemePreference) {
  document.documentElement.setAttribute("data-theme", t);
  document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=31536000; samesite=lax`;
}
