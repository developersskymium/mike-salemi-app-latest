"use client";

import { useState, useTransition } from "react";
import { Button, Glass, useToast } from "@/components/ui";
import { updateDisplayName } from "@/lib/actions/today-plan-you";

/** Legacy Overview › Details: display name (edit), email, program level. */
export function DetailsCard({ name, email, level }: { name: string; email: string; level: string | null }) {
  const [value, setValue] = useState(name);
  const [saved, setSaved] = useState(name);
  const [pending, start] = useTransition();
  const toast = useToast();
  const dirty = value.trim() && value.trim() !== saved;
  return (
    <Glass as="section" radius="card" className="yu-card" aria-labelledby="yu-details">
      <header className="yu-card-head">
        <h2 id="yu-details" className="lq-t17">Details</h2>
      </header>
      <form
        className="yu-form"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await updateDisplayName(value);
            if (r.ok) {
              setSaved(value.trim());
              toast("Name updated", { tone: "success", icon: "check" });
            } else toast(r.error === "offline" ? "Preview mode can't save. It works on the live app." : r.error, { icon: "close" });
          });
        }}
      >
        <label className="yu-field">
          <span className="yu-overline">Display name</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} autoComplete="name" placeholder="Your name" />
          <small className="lq-t13 lq-c2">Printed on your certificates.</small>
        </label>
        <label className="yu-field">
          <span className="yu-overline">Email</span>
          <input value={email} readOnly aria-readonly />
        </label>
        <label className="yu-field">
          <span className="yu-overline">Program level</span>
          <input value={level ?? "Not set — complete onboarding"} readOnly aria-readonly />
        </label>
        <Button type="submit" size="md" disabled={!dirty || pending} className="yu-card-cta">
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Glass>
  );
}
