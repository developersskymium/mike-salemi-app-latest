"use client";

import { useEffect, useRef } from "react";

/**
 * Mirrors a view into the URL without a server round trip: filter changes push a history entry (so back
 * and forward walk through them), typing replaces it, and popstate hands the restored query back.
 */
export function useUrlState(path: string, query: string, searchKey: string, onPop: (search: string) => void) {
  const prev = useRef<URLSearchParams | null>(null);
  const pop = useRef(onPop);
  pop.current = onPop;
  useEffect(() => {
    const next = `${path}${query ? `?${query}` : ""}`;
    if (next === window.location.pathname + window.location.search) {
      prev.current = new URLSearchParams(query);
      return;
    }
    const before = prev.current ?? new URLSearchParams(window.location.search);
    const after = new URLSearchParams(query);
    // Only the search box changed: replace, so typing doesn't flood history.
    const typing = before.get(searchKey) !== after.get(searchKey) && [...new Set([...before.keys(), ...after.keys()])].every((k) => k === searchKey || before.get(k) === after.get(k));
    const t = window.setTimeout(() => {
      window.history[typing ? "replaceState" : "pushState"](window.history.state, "", next);
      prev.current = after;
    }, typing ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [path, query, searchKey]);
  useEffect(() => {
    const on = () => pop.current(window.location.search);
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
}
