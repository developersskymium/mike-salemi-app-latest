"use client";

import { useState } from "react";
import type { BadgeDefinition, BadgeProgress } from "@ms/api";
import { Button, Chip, ProgressBar, Sheet } from "@/components/ui";
import { FAMILIES, PROGRAM_MEDAL, familyOf, medalColorOf, type BadgeFamily } from "./catalog";
import { MedalPin } from "./MedalPin";
import "./badges.css";

const fmt = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
const PERK_ICON: Record<string, string> = { bonus_video: "Bonus video", discount: "Discount", free_month: "Free month", coaching_credit: "Coaching" };

/**
 * Badges across every program, by family: Consistency · Program milestones (one row per program, its own
 * enamel colour) · Mastery · Explorer. Earned medals are lit; the rest wait in plain metal with progress.
 * Tap a medal for its detail and any perk it unlocks. (Moments with Mike is its own grid.)
 */
export function BadgesCabinet({ defs, earned, progress, only }: { defs: BadgeDefinition[]; earned: Record<string, string>; progress: BadgeProgress[]; only?: BadgeFamily[] }) {
  const [open, setOpen] = useState<BadgeDefinition | null>(null);
  const by = new Map(progress.map((p) => [p.id, p]));
  const fams = FAMILIES.filter((f) => !only || only.includes(f.id));
  const op = open ? by.get(open.id) : undefined;
  const got = open ? earned[open.id] : undefined;

  const tile = (b: BadgeDefinition, label?: string) => {
    const p = by.get(b.id);
    const e = !!earned[b.id];
    return (
      <button key={b.id} type="button" className="bd-tile lq-press" data-earned={e ? "" : undefined} onClick={() => setOpen(b)} aria-label={`${b.name}${e ? ", earned" : p ? `, ${p.current} of ${p.target}` : ", not earned yet"}`}>
        <MedalPin tier={b.tier} icon={b.icon} color={medalColorOf(b)} size={60} locked={!e} />
        <span className="bd-tile-n">{label ?? b.name}</span>
        {e ? (
          <small className="lq-num">{fmt(earned[b.id]!)}</small>
        ) : p && p.target > 1 ? (
          <span className="bd-tile-bar" aria-hidden>
            <i style={{ width: `${Math.round((p.current / p.target) * 100)}%` }} />
          </span>
        ) : (
          <small>Not yet</small>
        )}
        {b.perk && <span className="bd-perk-dot" title={b.perk.label} aria-hidden />}
      </button>
    );
  };

  return (
    <>
      <div className="bd-fams">
        {fams.map((f) => {
          const list = defs.filter((b) => familyOf(b) === f.id);
          if (!list.length) return null;
          const n = list.filter((b) => earned[b.id]).length;
          return (
            <section key={f.id} className="bd-fam" aria-labelledby={`bd-${f.id}`}>
              <header className="bd-fam-h">
                <div>
                  <h3 id={`bd-${f.id}`} className="lq-d-xs">
                    {f.title}
                  </h3>
                  <p className="lq-t13 lq-c3">{f.lede}</p>
                </div>
                <span className="lq-t13 lq-c2 lq-num">
                  {n} of {list.length}
                </span>
              </header>
              {f.id === "program" ? <ProgramRows list={list} earned={earned} tile={tile} /> : <div className="bd-grid">{list.map((b) => tile(b))}</div>}
            </section>
          );
        })}
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} detents={["medium"]} footer={<Button block variant="fill" onClick={() => setOpen(null)}>Done</Button>}>
        {open && (
          <div className="bd-detail">
            <MedalPin tier={open.tier} icon={open.icon} color={medalColorOf(open)} size={150} locked={!got} animated={!!got} />
            <p className="lq-t17">{open.description}</p>
            {got ? (
              <p className="lq-t15 lq-c2">
                Earned {fmt(got)}
                {open.points > 0 ? ` · ${open.points} points` : ""}
              </p>
            ) : op ? (
              <div className="bd-detail-prog">
                <ProgressBar value={op.current / op.target} tone="warm" label={`${open.name} progress`} />
                <span className="lq-t13 lq-c2 lq-num">
                  {op.current} of {op.target}
                  {open.family === "program" && op.target === 50 ? "% of the way to halfway" : ""}
                </span>
              </div>
            ) : null}
            {open.perk && (
              <div className="bd-detail-perk">
                <Chip variant="warm" size="sm">
                  {PERK_ICON[open.perk.kind] ?? "Reward"}
                </Chip>
                <b className="lq-t15">{open.perk.label}</b>
                {open.perk.detail && <span className="lq-t13 lq-c2">{open.perk.detail}</span>}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

const STAGE_LABEL: Record<string, string> = { start: "Start", halfway: "Halfway", complete: "Finish" };

/** Program milestones: one row per program (start · halfway · finish), most progressed first. */
function ProgramRows({ list, earned, tile }: { list: BadgeDefinition[]; earned: Record<string, string>; tile: (b: BadgeDefinition, label?: string) => React.ReactNode }) {
  const groups = new Map<string, BadgeDefinition[]>();
  for (const b of list) {
    const k = b.program_slug ?? "other";
    groups.set(k, [...(groups.get(k) ?? []), b]);
  }
  const rows = [...groups].sort((a, z) => z[1].filter((b) => earned[b.id]).length - a[1].filter((b) => earned[b.id]).length);
  return (
    <div className="bd-progs">
      {rows.map(([slug, bs]) => {
        const stages = bs.filter((b) => b.id.startsWith("prog-"));
        const extra = bs.filter((b) => !b.id.startsWith("prog-"));
        const color = PROGRAM_MEDAL[slug]?.color;
        return (
          <div key={slug} className="bd-prog" style={color ? ({ ["--bd-c" as string]: color } as React.CSSProperties) : undefined}>
            <b className="bd-prog-n">{PROGRAM_MEDAL[slug]?.short ?? slug.replace(/-/g, " ")}</b>
            <div className="bd-prog-row">
              {stages.map((b) => tile(b, STAGE_LABEL[b.id.split("-").at(-1) ?? ""] ?? b.name))}
              {extra.map((b) => tile(b))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
