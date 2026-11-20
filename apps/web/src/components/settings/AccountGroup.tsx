"use client";

import { useState } from "react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { Button, Segmented, Toggle } from "@/components/ui";
import { Field, validate } from "@/components/ui/form";
import { saveAutoplay, saveName, saveReducedMotion, saveUnits } from "@/lib/settings/actions";
import type { SettingsHub, Units } from "@/lib/settings/model";
import { Group, Row, useSave } from "./parts";

export function applyReducedMotion(on: boolean) {
  try {
    window.localStorage.setItem("ms-reduced-motion", on ? "1" : "0");
  } catch {}
  if (on) document.documentElement.setAttribute("data-reduced-motion", "");
  else document.documentElement.removeAttribute("data-reduced-motion");
}

/** Account: name, email, password, appearance (Light/Dark/System + reduced motion), units, playback. */
export function AccountGroup({ d, units, setUnits }: { d: SettingsHub; units: Units; setUnits: (u: Units) => void }) {
  const [name, setName] = useState(d.account.name);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [rm, setRm] = useState(d.settings.reducedMotion);
  const [autoplay, setAutoplay] = useState(d.account.autoplay);
  const { save, pending } = useSave();
  const dirty = name.trim() !== d.account.name;

  return (
    <Group id="account" title="Account">
      <form
        className="st-row st-form-row"
        onSubmit={(e) => {
          e.preventDefault();
          const err = validate.required(name.trim(), "your name");
          setNameErr(err);
          if (!err) save(() => {}, () => setName(d.account.name), () => saveName(name), "Name updated");
        }}
      >
        <Field label="Name" hint="Shown on your certificates." error={nameErr}>
          {(ids) => <input {...ids} value={name} onChange={(e) => { setName(e.target.value); setNameErr(null); }} autoComplete="name" maxLength={80} />}
        </Field>
        {dirty && <Button size="md" type="submit" disabled={pending}>Save name</Button>}
      </form>
      <Row label="Email" detail="Your sign-in email. Contact us from Help to change it.">
        <span className="st-value">{d.account.email}</span>
      </Row>
      <Row label="Password" detail="Optional. Sign-in links and Google work without one.">
        <Button size="sm" variant="secondary" href="/auth/reset?mode=update">Set password</Button>
      </Row>
      <Row label="Appearance" id="st-theme" stack>
        <ThemeSwitch size="sm" />
      </Row>
      <Row label="Reduce motion" detail="Calmer screens: no slides, rises or celebrations." id="st-rm">
        <Toggle aria-labelledby="st-rm" checked={rm} onChange={(v) => save(() => { setRm(v); applyReducedMotion(v); }, () => { setRm(!v); applyReducedMotion(!v); }, () => saveReducedMotion(v))} />
      </Row>
      <Row label="Units" detail="Bell weights and logs." id="st-units">
        <Segmented<Units>
          label="Units"
          size="sm"
          variant="fill"
          value={units}
          options={[{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]}
          onChange={(u) => save(() => setUnits(u), () => setUnits(units), () => saveUnits(u))}
        />
      </Row>
      <Row label="Autoplay next clip" detail="In a day player, the next clip starts after 5 seconds." id="st-auto">
        <Toggle aria-labelledby="st-auto" checked={autoplay} onChange={(v) => save(() => setAutoplay(v), () => setAutoplay(!v), () => saveAutoplay(v))} />
      </Row>
    </Group>
  );
}
