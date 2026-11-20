"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, Chip, Icon } from "@/components/ui";
import {
  requestPasswordReset, signInWithMagicLink, signInWithPassword, signUp, updatePassword, type AuthState,
} from "@/lib/auth/actions";

function Field({ label, children, hint, aside }: { label: string; children: ReactNode; hint?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="pub-af-field">
      <span className="pub-af-row">
        <label htmlFor={`f-${label.replace(/\s+/g, "-")}`}>{label}</label>
        {aside}
      </span>
      <span className="pub-af-input">{children}</span>
      {hint}
    </div>
  );
}

function Submit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block size="lg" disabled={pending} aria-busy={pending}>
      {pending ? "One moment…" : children}
    </Button>
  );
}

function Status({ state }: { state: AuthState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className="pub-af-msg" role="alert" data-tone="error">
        <Icon name="close" size="xs" /> {state.error}
      </p>
    );
  if (state.message)
    return (
      <p className="pub-af-msg" role="status" data-tone="ok">
        <Icon name="check" size="xs" /> {state.message}
      </p>
    );
  return null;
}

function Password({ autoComplete = "current-password", id = "f-Password" }: { autoComplete?: string; id?: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <input id={id} name="password" type={show ? "text" : "password"} required minLength={autoComplete === "new-password" ? 8 : 1} autoComplete={autoComplete} />
      <button type="button" className="pub-af-eye" onClick={() => setShow((s) => !s)} aria-pressed={show}>
        {show ? "Hide" : "Show"}
      </button>
    </>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [pw, pwAction] = useActionState(signInWithPassword, undefined);
  const [ml, mlAction] = useActionState(signInWithMagicLink, undefined);
  return (
    <div className="pub-af">
      {mode === "password" ? (
        <form action={pwAction} className="pub-af">
          <input type="hidden" name="next" value={next} />
          <Field label="Email">
            <input id="f-Email" name="email" type="email" required autoComplete="email" inputMode="email" />
          </Field>
          <Field label="Password" aside={<Link href="/auth/reset" className="pub-link lq-t13">Forgot password?</Link>}>
            <Password />
          </Field>
          <Status state={pw} />
          <Submit>Sign in</Submit>
          <span className="pub-af-or">or</span>
          <button type="button" className="pub-af-switch" onClick={() => setMode("link")}>Email me a sign-in link instead</button>
        </form>
      ) : (
        <form action={mlAction} className="pub-af">
          <input type="hidden" name="next" value={next} />
          <Field label="Email">
            <input id="f-Email" name="email" type="email" required autoComplete="email" inputMode="email" />
          </Field>
          <p className="pub-af-hint">We’ll send a one-tap sign-in link. No password needed.</p>
          <Status state={ml} />
          <Submit>Send link</Submit>
          <button type="button" className="pub-af-switch" onClick={() => setMode("password")}>Use my password instead</button>
        </form>
      )}
    </div>
  );
}

export function SignUpForm({ next, refCode, plan }: { next: string; refCode: string | null; plan: string | null }) {
  const [state, formAction] = useActionState(signUp, undefined);
  const ref = refCode;
  // Keep the referral code across a reload or a detour to sign in; use the stored one when the link didn't carry it.
  useEffect(() => {
    if (refCode) window.localStorage.setItem("ms-ref", refCode);
  }, [refCode]);
  const action = (fd: FormData) => {
    if (!fd.get("ref")) {
      const stored = window.localStorage.getItem("ms-ref");
      if (stored) fd.set("ref", stored);
    }
    return formAction(fd);
  };
  return (
    <form action={action} className="pub-af">
      <input type="hidden" name="next" value={next} />
      {ref && <input type="hidden" name="ref" value={ref} />}
      {(ref || plan) && (
        <div className="pub-af-chips">
          {ref && <Chip variant="tint" icon="people">Invited with code {ref}</Chip>}
          {plan && <Chip variant="fill">{plan[0]!.toUpperCase() + plan.slice(1)} plan next</Chip>}
        </div>
      )}
      <Field label="Name">
        <input id="f-Name" name="name" required maxLength={80} autoComplete="name" />
      </Field>
      <Field label="Email">
        <input id="f-Email" name="email" type="email" required autoComplete="email" inputMode="email" />
      </Field>
      <Field label="Password" hint={<span className="pub-af-hint">At least 8 characters.</span>}>
        <Password autoComplete="new-password" id="f-Password" />
      </Field>
      <Status state={state} />
      <Submit>Create account</Submit>
    </form>
  );
}

export function ResetForm({ signedIn }: { signedIn: boolean }) {
  const [req, reqAction] = useActionState(requestPasswordReset, undefined);
  const [upd, updAction] = useActionState(updatePassword, undefined);
  if (signedIn)
    return (
      <form action={updAction} className="pub-af">
        <Field label="New password" hint={<span className="pub-af-hint">At least 8 characters.</span>}>
          <Password autoComplete="new-password" id="f-New-password" />
        </Field>
        <Status state={upd} />
        <Submit>Update password</Submit>
      </form>
    );
  return (
    <form action={reqAction} className="pub-af">
      <Field label="Email">
        <input id="f-Email" name="email" type="email" required autoComplete="email" inputMode="email" />
      </Field>
      <Status state={req} />
      <Submit>Send reset link</Submit>
    </form>
  );
}
