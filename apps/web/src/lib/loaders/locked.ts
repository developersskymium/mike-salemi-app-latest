import "server-only";
import { hasAccess, type WeekEntry } from "@ms/api";
import { getAccessMap } from "@/lib/access";

/**
 * Programs the member has lost access to (plan lapsed, grant ended). Their plan items stay on the schedule
 * but are marked `locked`: greyed with an unlock link, and kept out of today's pick, missed counts,
 * clashes and calendar files. Unknown programs are never treated as locked.
 */
export async function lockedSlugs(): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    for (const [key, a] of await getAccessMap()) if (key === a.slug && !hasAccess(a)) out.add(a.slug);
  } catch {
    /* access unknown: lock nothing */
  }
  return out;
}

export async function markLockedEntries(entries: WeekEntry[]): Promise<WeekEntry[]> {
  const locked = await lockedSlugs();
  if (!locked.size) return entries;
  return entries.map((e) => (e.kind === "plan" && e.program_slug && locked.has(e.program_slug) ? { ...e, locked: true } : e));
}
