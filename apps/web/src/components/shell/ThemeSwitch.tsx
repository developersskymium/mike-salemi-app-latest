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
