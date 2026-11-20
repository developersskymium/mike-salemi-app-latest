"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Icon } from "@/components/ui";
import { Field } from "@/components/ui/form";
import { signInWithPassword, signUp, type AuthState } from "@/lib/auth/actions";
import { emailLink } from "@/lib/auth/magic";
import { createClient } from "@/lib/supabase/client";

function Submit({ children, variant = "filled" }: { children: React.ReactNode; variant?: "filled" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block size="lg" variant={variant} disabled={pending} aria-busy={pending}>
      {pending ? "One moment…" : children}
    </Button>
  );
}

function Status({ state }: { state: AuthState }) {
  if (!state?.error && !state?.message) return null;
  return state.error ? (
    <p className="au-msg" role="alert" data-tone="error"><Icon name="info" size="xs" /> {state.error}</p>
  ) : (
    <p className="au-msg" role="status" data-tone="ok"><Icon name="check" size="xs" /> {state.message}</p>
  );
}

function GoogleButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className="au-google lq-press"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
          if (error) {
            setErr("Google sign-in isn't available right now. Use your email instead.");
            setBusy(false);
          }
        }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {err && <p className="au-msg" role="alert" data-tone="error">{err}</p>}
    </>
  );
}

/** Sign in: magic link first, Google second, password third. */
export function SignIn({ next, google }: { next: string; google: boolean }) {
  const [pwMode, setPwMode] = useState(false);
  const [ml, mlAction] = useActionState(emailLink, undefined);
  const [pw, pwAction] = useActionState(signInWithPassword, undefined);
  const [emailVal, setEmail] = useState("");
  return (
    <div className="au-forms">
      {!pwMode ? (
        <form action={mlAction} className="au-form" noValidate>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="mode" value="signin" />
          <Field label="Email">{(ids) => <input {...ids} name="email" type="email" required autoComplete="email" inputMode="email" value={emailVal} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Status state={ml} />
          <Submit>Email me a sign-in link</Submit>
        </form>
      ) : (
        <form action={pwAction} className="au-form">
          <input type="hidden" name="next" value={next} />
          <Field label="Email">{(ids) => <input {...ids} name="email" type="email" required autoComplete="email" inputMode="email" value={emailVal} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Password" aside={<Link href="/auth/reset" className="fm-link au-aside">Forgot?</Link>}>{(ids) => <input {...ids} name="password" type="password" required autoComplete="current-password" />}</Field>
          <Status state={pw} />
          <Submit>Sign in</Submit>
        </form>
      )}
      {google && (
        <>
          <span className="au-or">or</span>
          <GoogleButton next={next} />
        </>
      )}
      <button type="button" className="au-switch" onClick={() => setPwMode((m) => !m)}>{pwMode ? "Email me a link instead" : "Use a password instead"}</button>
    </div>
  );
}

/** Sign up: name + email → magic link; Google; password third. Referral-aware. */
export function SignUp({ next, google, refCode }: { next: string; google: boolean; refCode: string | null }) {
  const [pwMode, setPwMode] = useState(false);
  const [ml, mlAction] = useActionState(emailLink, undefined);
  const [pw, pwAction] = useActionState(signUp, undefined);
  const [ref, setRef] = useState(refCode);
  useEffect(() => {
    if (refCode) window.localStorage.setItem("ms-ref", refCode);
    // Keep the referral across a detour; restore once after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else setRef(window.localStorage.getItem("ms-ref"));
  }, [refCode]);
  return (
    <div className="au-forms">
      <form action={pwMode ? pwAction : mlAction} className="au-form">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="mode" value="signup" />
        {ref && <input type="hidden" name="ref" value={ref} />}
        <Field label="First name">{(ids) => <input {...ids} name="name" required maxLength={80} autoComplete="given-name" />}</Field>
        <Field label="Email">{(ids) => <input {...ids} name="email" type="email" required autoComplete="email" inputMode="email" />}</Field>
        {pwMode && <Field label="Password" hint="At least 8 characters.">{(ids) => <input {...ids} name="password" type="password" required minLength={8} autoComplete="new-password" />}</Field>}
        <Status state={pwMode ? pw : ml} />
        <Submit>{pwMode ? "Create account" : "Email me a sign-up link"}</Submit>
      </form>
      {google && (
        <>
          <span className="au-or">or</span>
          <GoogleButton next={next} />
        </>
      )}
      <button type="button" className="au-switch" onClick={() => setPwMode((m) => !m)}>{pwMode ? "Email me a link instead" : "Use a password instead"}</button>
    </div>
  );
}
