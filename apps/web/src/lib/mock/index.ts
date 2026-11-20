import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local preview mode. The build sandbox cannot reach Supabase, so in local development
 * with MOCK_DATA=1 page loaders read JSON snapshots of real data from apps/web/fixtures/.
 * Never active in production builds.
 */
export const MOCK = process.env.NODE_ENV === "development" && process.env.MOCK_DATA === "1";

export const MOCK_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "member.test@example.com",
  user_metadata: { full_name: "Daniel Test" },
} as const;

/** Reads apps/web/fixtures/<name>.json. */
export async function fixture<T>(name: string): Promise<T> {
  const file = path.join(process.cwd(), "fixtures", `${name}.json`);
  return JSON.parse(await readFile(file, "utf8")) as T;
}

/**
 * Wrap a loader: in mock mode return the fixture, otherwise run the real loader.
 * Usage: export const loadToday = mockable("today", async (sb, user) => { ... });
 */
export function mockable<A extends unknown[], R>(name: string, real: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => (MOCK ? fixture<R>(name) : real(...args));
}
