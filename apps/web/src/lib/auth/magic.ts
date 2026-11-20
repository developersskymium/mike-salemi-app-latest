"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { MOCK } from "@/lib/mock";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "./actions";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/today";
};
const email = z.string().trim().toLowerCase().email("That email looks incomplete. Check for a typo?");

/**
 * Magic link for sign in AND sign up (spec 12 › Sign in 2): one email field, no password.
 * New members get their name + referral code on the account; existing members just sign in.
 */
export async function emailLink(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({ email, name: z.string().trim().max(80).optional(), ref: z.string().trim().max(32).optional(), mode: z.enum(["signin", "signup"]) })
    .safeParse({ email: form.get("email"), name: form.get("name") || undefined, ref: form.get("ref") || undefined, mode: form.get("mode") || "signin" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parsed.data.mode === "signup" && !parsed.data.name) return { error: "Please add your first name." };
  const next = safeNext(form.get("next"));
  if (MOCK) return { message: `Check ${parsed.data.email} — your sign-in link is on its way.` };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: parsed.data.mode === "signup",
      data: parsed.data.mode === "signup" ? { full_name: parsed.data.name, referral_code: parsed.data.ref ?? null } : undefined,
    },
  });
  if (error) {
    if (parsed.data.mode === "signin" && /signups not allowed|not found/i.test(error.message)) return { error: "We don't know that email yet. Create a free account instead?" };
    return { error: "We couldn't send a link just now. Try again in a minute." };
  }
  return { message: `Check ${parsed.data.email} — your sign-in link is on its way.` };
}
