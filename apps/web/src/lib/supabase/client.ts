"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

let browser: ReturnType<typeof createBrowserClient> | undefined;

/** Supabase client for Client Components (acts as the signed-in member). */
export function createClient() {
  browser ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return browser;
}
