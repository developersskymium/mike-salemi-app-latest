"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, Chip, Glass, Icon, Segmented } from "@/components/ui";
import {
  requestPasswordReset, signInWithMagicLink, signInWithPassword, signUp, updatePassword, type AuthState,
} from "@/lib/auth/actions";

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="dsc-af-field">
      <span className="lq-t13 lq-c2">{label}</span>
      <Glass radius="control" className="dsc-field">{children}</Glass>
      {hint}
    </label>
  );
}

function Submit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block disabled={pending} aria-busy={pending}>
      {pending ? "One moment…" : children}
    </Button>
  );
}

function Status({ state }: { state: AuthState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className="dsc-af-msg lq-t15" role="alert" data-tone="error">
        <Icon name="close" size="xs" /> {state.error}
      </p>
    );
  if (state.message)
    return (
      <p className="dsc-af-msg lq-t15" role="status" data-tone="ok">
        <Icon name="check" size="xs" /> {state.message}
      </p>
    );
  return null;
}

function Password({ autoComplete = "current-password" }: { autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <input name="password" type={show ? "text" : "password"} required minLength={autoComplete === "new-password" ? 8 : 1} autoComplete={autoComplete} className="lq-t17" />
      <button type="button" className="dsc-af-eye lq-t13" onClick={() => setShow((s) => !s)} aria-pressed={show}>
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
    <div className="dsc-af">
      <Segmented
        label="Sign-in method"
        options={[
          { value: "password", label: "Password" },
          { value: "link", label: "Email me a link" },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === "password" ? (
        <form action={pwAction} className="dsc-af-form">
          <input type="hidden" name="next" value={next} />
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" inputMode="email" className="lq-t17" />
          </Field>
          <Field label="Password" hint={<Link href="/auth/reset" className="lq-t13 dsc-link dsc-af-forgot">Forgot password?</Link>}>
            <Password />
          </Field>
          <Status state={pw} />
          <Submit>Sign in</Submit>
        </form>
      ) : (
        <form action={mlAction} className="dsc-af-form">
          <input type="hidden" name="next" value={next} />
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" inputMode="email" className="lq-t17" />
          </Field>
          <p className="lq-t13 lq-c2">We’ll send a one-tap sign-in link. No password needed.</p>
          <Status state={ml} />
          <Submit>Send link</Submit>
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
    <form action={action} className="dsc-af dsc-af-form">
      <input type="hidden" name="next" value={next} />
      {ref && <input type="hidden" name="ref" value={ref} />}
      {(ref || plan) && (
        <div className="dsc-af-chips">
          {ref && <Chip variant="tint" icon="people">Invited with code {ref}</Chip>}
          {plan && <Chip variant="fill">{plan[0]!.toUpperCase() + plan.slice(1)} plan next</Chip>}
        </div>
      )}
      <Field label="Name">
        <input name="name" required maxLength={80} autoComplete="name" className="lq-t17" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" inputMode="email" className="lq-t17" />
      </Field>
      <Field label="Password" hint={<span className="lq-t12 lq-c3">At least 8 characters.</span>}>
        <Password autoComplete="new-password" />
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
      <form action={updAction} className="dsc-af dsc-af-form">
        <Field label="New password" hint={<span className="lq-t12 lq-c3">At least 8 characters.</span>}>
          <Password autoComplete="new-password" />
        </Field>
        <Status state={upd} />
        <Submit>Update password</Submit>
      </form>
    );
  return (
    <form action={reqAction} className="dsc-af dsc-af-form">
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" inputMode="email" className="lq-t17" />
      </Field>
      <Status state={req} />
      <Submit>Send reset link</Submit>
    </form>
  );
}
