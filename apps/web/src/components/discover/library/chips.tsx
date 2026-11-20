"use client";

import { useEffect, useRef } from "react";
import { Chip, Icon } from "@/components/ui";

export function ChipBtn({ on, onClick, children, icon }: { on: boolean; onClick: () => void; children: React.ReactNode; icon?: "bookmark" | "kettlebell" }) {
  return (
    <button type="button" className="w1-lib-chipbtn" aria-pressed={on} onClick={onClick}>
      <Chip variant="fill" selected={on} icon={icon}>{children}</Chip>
    </button>
  );
}

export type ProgramOption = { key: string; label: string };

/** Program names across the top: "All" plus every program with content. One scrollable row on phones, never wraps. */
export function ProgramChips({ options, value, onChange, label = "Program" }: { options: ProgramOption[]; value: string; onChange: (key: string) => void; label?: string }) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = row.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    const el = row.current;
    if (!on || !el) return;
    const left = on.offsetLeft - 16;
    if (left > 0 && (left + on.offsetWidth > el.scrollLeft + el.clientWidth || left < el.scrollLeft)) el.scrollTo({ left });
  }, [value]);
  return (
    <div ref={row} className="w1-lib-programs" role="group" aria-label={label}>
      <ChipBtn on={value === "all"} onClick={() => onChange("all")}>All</ChipBtn>
      {options.map((o) => (
        <ChipBtn key={o.key} on={value === o.key} onClick={() => onChange(o.key)}>{o.label}</ChipBtn>
      ))}
    </div>
  );
}

/** A compact filter: a native select dressed as a pill (best phone picker, keyboard and screen-reader friendly). */
export function SelectPill({ label, value, onChange, all, options }: { label: string; value: string; onChange: (v: string) => void; all: string; options: { value: string; label: string }[] }) {
  return (
    <label className="w1-lib-sel" data-on={value !== "all" ? "" : undefined}>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="lq-t13">
        <option value="all">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <Icon name="down" size="xs" />
    </label>
  );
}
