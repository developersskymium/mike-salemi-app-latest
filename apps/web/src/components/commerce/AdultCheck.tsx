"use client";

import "./commerce.css";

/** "I'm 18 or older" confirmation, same wording as the Swing Set-Up Coach. `what` names the thing that's adults only. */
export function AdultCheck({ checked, onChange, what }: { checked: boolean; onChange: (v: boolean) => void; what: string }) {
  return (
    <label className="com-adult">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span><b>I&rsquo;m 18 or older.</b> {what} is for adults only.</span>
    </label>
  );
}
