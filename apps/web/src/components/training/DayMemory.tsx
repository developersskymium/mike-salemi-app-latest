"use client";

import { createContext, useContext, type ReactNode } from "react";

/** What the account remembers for this day: last bell per exercise (by key) and how the day felt. */
export interface DayMemory {
  lessonId: string;
  weights: Record<string, number>;
  feel: "easy" | "right" | "hard" | null;
}

const Ctx = createContext<DayMemory | null>(null);

export function DayMemoryProvider({ value, children }: { value: DayMemory; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useDayMemory = () => useContext(Ctx);
