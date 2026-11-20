"use client";

import { useSyncExternalStore } from "react";

/**
 * The shop cart: variant ids and quantities only, persisted on this device (localStorage) and synced
 * across tabs. Prices are never stored here; they are read from the catalog and re-priced on the server.
 */
export type CartLine = { variant: string; product: string; qty: number };

const KEY = "ms:shop:cart:v1";
const MAX_QTY = 10;
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;
const EMPTY: CartLine[] = [];

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
    cache = Array.isArray(raw)
      ? (raw as CartLine[]).filter((l) => l && typeof l.variant === "string" && typeof l.product === "string").map((l) => ({ ...l, qty: clamp(l.qty) }))
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

const clamp = (n: unknown) => Math.max(1, Math.min(MAX_QTY, Math.floor(Number(n) || 1)));

function write(next: CartLine[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: the cart still works for this visit */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const cart = {
  add(product: string, variant: string, qty = 1) {
    const lines = read();
    const hit = lines.find((l) => l.variant === variant);
    write(hit ? lines.map((l) => (l.variant === variant ? { ...l, qty: clamp(l.qty + qty) } : l)) : [...lines, { product, variant, qty: clamp(qty) }]);
  },
  set(variant: string, qty: number) {
    write(qty <= 0 ? read().filter((l) => l.variant !== variant) : read().map((l) => (l.variant === variant ? { ...l, qty: clamp(qty) } : l)));
  },
  remove(variant: string) {
    write(read().filter((l) => l.variant !== variant));
  },
  /** Drop lines whose variant no longer exists in the catalog. */
  prune(valid: Set<string>) {
    const lines = read();
    if (lines.some((l) => !valid.has(l.variant))) write(lines.filter((l) => valid.has(l.variant)));
  },
  clear() {
    write([]);
  },
  MAX_QTY,
};
