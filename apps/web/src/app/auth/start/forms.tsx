"use client";
import { useActionState, useState } from "react";
import { signUp, signInWithPassword, type AuthState } from "@/lib/auth/actions";

const field: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(127,127,127,.3)", background: "transparent", font: "inherit", color: "inherit", marginTop: 10 };
const btn: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 999, border: 0, background: "#1f6fe0", color: "#fff", font: "inherit", fontWeight: 600, marginTop: 14, cursor: "pointer" };

export function StartForms() {
  const [mode, setMode] = useState<"up" | "in">("up");
  const [upState, up, upPending] = useActionState<AuthState, FormData>(signUp, undefined);
  const [inState, inn, inPending] = useActionState<AuthState, FormData>(signInWithPassword, undefined);
  const s = mode === "up" ? upState : inState;
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ opacity: 0.7, margin: 0 }}>{mode === "up" ? "Create your account" : "Sign in"}</p>
      <form action={mode === "up" ? up : inn}>
        <input type="hidden" name="next" value="/auth/start" />
        {mode === "up" && <input style={field} name="name" placeholder="Name" autoComplete="name" required />}
        <input style={field} name="email" type="email" placeholder="Email" autoComplete="email" required />
        <input style={field} name="password" type="password" placeholder="Password (8+ characters)" autoComplete={mode === "up" ? "new-password" : "current-password"} required />
        <button style={btn} disabled={upPending || inPending}>{mode === "up" ? "Create account" : "Sign in"}</button>
      </form>
      {s?.error && <p style={{ color: "#d33", marginTop: 10 }}>{s.error}</p>}
      {s?.message && <p style={{ marginTop: 10 }}>{s.message}</p>}
      <button onClick={() => setMode(mode === "up" ? "in" : "up")} style={{ ...btn, background: "transparent", color: "inherit", border: "1px solid rgba(127,127,127,.3)" }}>
        {mode === "up" ? "I already have an account" : "Create an account instead"}
      </button>
    </div>
  );
}
