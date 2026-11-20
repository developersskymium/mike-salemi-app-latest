import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MOCK, mockable } from "@/lib/mock";
import { createServiceClient } from "@/lib/supabase/admin";
import { mockDb } from "./mockdb";

/** Loosely typed client: studio tables are driven by configs, not generated types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = SupabaseClient<any, "public", any>;
export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const source = mockable("studio-db", async () => createServiceClient() as unknown as Db);

/** Service client (real) or the fixture-backed stand-in (local preview). Call only after studioAdmin(). */
export async function studioDb(): Promise<Db> {
  const s = await source();
  return (MOCK ? mockDb(s as unknown as Record<string, Row[]>) : s) as unknown as Db;
}

/** Wrap a page loader: guard, then run with the database. In preview the fixture comes from studio-db.json. */
export function studioLoader<A extends unknown[], R>(_name: string, fn: (db: Db, ...a: A) => Promise<R>) {
  return async (...a: A): Promise<R> => fn(await studioDb(), ...a);
}

export async function rows(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<Row[]> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as Row[]) ?? [];
}
