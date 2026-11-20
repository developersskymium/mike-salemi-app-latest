"use client";

import type { ThemePreference } from "@ms/tokens";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Segmented } from "../ui/Segmented";
import { saveThemePreference } from "./actions";
import { applyTheme, isTheme, THEME_COOKIE } from "./theme";

const noop = () => () => {};

function readCookie(): ThemePreference {
  const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
  return m && isTheme(m[1]) ? m[1] : "system";
}

/** System / Light / Dark. Applies instantly, stores a cookie (no flash) and the profile preference. */
export function ThemeSwitch({ persist = true, size = "md" }: { persist?: boolean; size?: "sm" | "md" }) {
  const saved = useSyncExternalStore(noop, readCookie, () => "system" as ThemePreference);
  const [picked, setTheme] = useState<ThemePreference | null>(null);
  const theme = picked ?? saved;
  return (
    <Segmented
      label="Appearance"
      size={size}
      variant="fill"
      value={theme}
      options={[
        { value: "system", label: "System" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
      onChange={(t) => {
        setTheme(t);
        applyTheme(t);
        if (persist) void saveThemePreference(t);
      }}
    />
  );
}

/** Reconciles the cookie with the profile preference (e.g. a new device) once per load. */
export function ThemeSync({ preference }: { preference?: string | null }) {
  useEffect(() => {
    if (isTheme(preference) && preference !== readCookie()) applyTheme(preference);
  }, [preference]);
  return null;
}

/** The rail's theme button: flips between light and dark (saved like ThemeSwitch). */
export function ThemeToggle({ persist = true }: { persist?: boolean }) {
  const saved = useSyncExternalStore(noop, readCookie, () => "system" as ThemePreference);
  const [picked, setTheme] = useState<ThemePreference | null>(null);
  const pref = picked ?? saved;
  const isDark = () =>
    pref === "dark" || (pref === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return (
    <button
      type="button"
      className="lq-iconbtn lq-glass lq-press sm-theme"
      data-size="sm"
      aria-label="Switch light or dark"
      title="Switch light or dark"
      onClick={() => {
        const next: ThemePreference = isDark() ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
        if (persist) void saveThemePreference(next);
      }}
    >
      <svg viewBox="0 0 24 24" className="lq-icon sm-theme-moon" data-size="sm" aria-hidden>
        <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
      </svg>
      <svg viewBox="0 0 24 24" className="lq-icon sm-theme-sun" data-size="sm" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
}
