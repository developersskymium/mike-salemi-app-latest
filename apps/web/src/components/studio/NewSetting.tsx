"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { saveSetting } from "@/lib/studio/actions";
import { useRun } from "./forms";

export function NewSetting() {
  const [k, setK] = useState(""), [v, setV] = useState("{}");
  const { run, pending } = useRun();
  return (
    <form className="st-form" data-cols="1" onSubmit={(e) => { e.preventDefault(); run(() => saveSetting(k, v), "Setting saved", () => { setK(""); setV("{}"); }); }}>
      <div className="st-field"><label className="st-label" htmlFor="nk">Key</label><input id="nk" className="st-in" value={k} onChange={(e) => setK(e.target.value)} /></div>
      <div className="st-field"><label className="st-label" htmlFor="nv">Value (JSON)</label><textarea id="nv" className="st-in" data-mono="" rows={5} value={v} onChange={(e) => setV(e.target.value)} /></div>
      <div className="st-bar"><Button type="submit" variant="filled" size="md" disabled={pending || !k.trim()}>Save setting</Button></div>
    </form>
  );
}
