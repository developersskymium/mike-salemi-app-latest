import "server-only";
import { MOCK } from "@/lib/mock";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Is Google sign-in switched on in Supabase Auth? Reads the public auth settings (cached 1h).
 * NEXT_PUBLIC_AUTH_GOOGLE=1/0 overrides. Unknown → hidden (never a broken button).
 */
export async function googleEnabled(): Promise<boolean> {
  const o = process.env.NEXT_PUBLIC_AUTH_GOOGLE;
  if (o === "1" || o === "0") return o === "1";
  if (MOCK) return true;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(1500) });
    if (!r.ok) return false;
    const j = (await r.json()) as { external?: Record<string, boolean> };
    return Boolean(j.external?.google);
  } catch {
    return false;
  }
}

/** Retreat / coaching / application arrivals go straight to their application, never through onboarding. */
export function isApplicationPath(next: string) {
  return /^\/(experiences|coaching|retreats|apply)(\/|$|\?)/.test(next) || /apply/.test(next);
}
