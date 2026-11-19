import { useCallback, useEffect, useState } from "react";

/** A saved snapshot of the Library filter controls. */
export type LibraryPreset = {
  id: string;
  name: string;
  state: LibraryFilterState;
};

export type LibraryFilterState = {
  level: string;
  cats: string[];
  tagList: string[];
  sort: string;
  inProgramOnly: boolean;
  savedOnly: boolean;
  query: string;
};

const KEY = "kbl:library:presets";

function read(): LibraryPreset[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LibraryPreset[]) : [];
  } catch {
    return [];
  }
}

/** Persisted, cross-tab list of the user's favourite Library filter combinations. */
export function useLibraryPresets() {
  const [presets, setPresets] = useState<LibraryPreset[]>([]);

  useEffect(() => {
    setPresets(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setPresets(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: LibraryPreset[]) => {
    setPresets(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — presets just don't persist */
    }
  }, []);

  const save = useCallback(
    (name: string, state: LibraryFilterState) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const existing = presets.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
      const next = existing
        ? presets.map((p) => (p.id === existing.id ? { ...p, state } : p))
        : [...presets, { id: `${Date.now()}`, name: trimmed, state }];
      persist(next);
    },
    [presets, persist],
  );

  const remove = useCallback(
    (id: string) => persist(presets.filter((p) => p.id !== id)),
    [presets, persist],
  );

  return { presets, save, remove };
}
