"use client";

import { useState, type PointerEvent } from "react";
import type { BadgeProgress } from "@ms/api";
import { Medal, MEDAL_TIERS, type MedalTier } from "@/components/graphics";
import { Button, Chip, Glass, ProgressBar, Sheet } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import type { Badge } from "@/lib/loaders/today-plan-you";
import { celebrate } from "./CelebrationHost";
import { fmtDay, fmtLong } from "./format";
import { medalArt } from "./MedalArt";

const TIER_LABEL: Record<MedalTier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum" };

/** What a badge's progress counts, from its id family. */
export function unitFor(id: string, n: number) {
  if (id.startsWith("streak")) return n === 1 ? "day in a row" : "days in a row";
  if (id.startsWith("tool")) return n === 1 ? "tool" : "tools";
  if (id.startsWith("referral")) return n === 1 ? "friend" : "friends";
  return n === 1 ? "day" : "days";
}

/** The unearned medal the member is closest to (highest share done, then fewest left). */
export function nextMedal(badges: Badge[], progress: BadgeProgress[]) {
  const by = new Map(progress.map((p) => [p.id, p]));
  return badges
    .map((b) => ({ b, p: by.get(b.id) }))
    .filter((x): x is { b: Badge; p: BadgeProgress } => !!x.p && !x.p.earned && x.p.current < x.p.target)
    .sort((a, z) => z.p.current / z.p.target - a.p.current / a.p.target || a.p.target - a.p.current - (z.p.target - z.p.current))[0] ?? null;
}

/** Pointer tilt + sheen for a medal on the shelf (desktop pointer only; still on touch and reduced motion). */
function tilt(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty("--rx", `${(-y * 22).toFixed(2)}deg`);
  el.style.setProperty("--ry", `${(x * 26).toFixed(2)}deg`);
  el.style.setProperty("--sx", `${((x + 0.5) * 100).toFixed(1)}%`);
  el.style.setProperty("--sy", `${((y + 0.5) * 100).toFixed(1)}%`);
}
function untilt(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.style.removeProperty("--rx");
  el.style.removeProperty("--ry");
}

/**
 * Signature: the medal cabinet. Glass shelves per tier; earned medals stand lit with a sheen that follows
 * the pointer, unearned ones wait as debossed outlines with their progress. Tap for the detail sheet.
 */
export function MedalCabinet({ badges, progress, earned, compact }: { badges: Badge[]; progress: BadgeProgress[]; earned: Record<string, string>; compact?: boolean }) {
  const [open, setOpen] = useState<Badge | null>(null);
  const by = new Map(progress.map((p) => [p.id, p]));
  const tiers = MEDAL_TIERS.filter((t) => badges.some((b) => b.tier === t));
  const isEarned = open ? !!earned[open.id] : false;
  const op = open ? by.get(open.id) : undefined;
  return (
    <>
      <div className="yu-cabinet" data-compact={compact ? "" : undefined}>
        {tiers.map((t) => {
          const list = badges.filter((b) => b.tier === t);
          const n = list.filter((b) => earned[b.id]).length;
          return (
            <section key={t} className="yu-shelf" aria-labelledby={`yu-tier-${t}`} data-tier={t}>
              <header className="yu-shelf-head">
                <h3 id={`yu-tier-${t}`}>{TIER_LABEL[t]}</h3>
                <span className="lq-num">{n} of {list.length}</span>
              </header>
              <div className="yu-shelf-row">
                {list.map((b) => {
                  const p = by.get(b.id);
                  const got = !!earned[b.id];
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className="yu-medal"
                      data-earned={got ? "" : undefined}
                      onPointerMove={tilt}
                      onPointerLeave={untilt}
                      onClick={() => {
                        haptic(6);
                        setOpen(b);
                      }}
                      aria-label={`${b.name}, ${TIER_LABEL[b.tier]}${got ? ", earned" : p ? `, ${p.current} of ${p.target}` : ", not earned yet"}`}
                    >
                      <span className="yu-medal-3d">
                        <Medal tier={b.tier} size={compact ? 64 : 84} locked={!got} title="">{medalArt(b.icon)}</Medal>
                        {got && <i className="yu-medal-sheen" aria-hidden />}
                      </span>
                      <span className="yu-medal-name">{b.name}</span>
                      {got ? (
                        <small className="lq-num">{fmtDay(earned[b.id]!)}</small>
                      ) : p ? (
                        <span className="yu-medal-prog" aria-hidden>
                          <i style={{ width: `${Math.round((p.current / p.target) * 100)}%` }} />
                        </span>
                      ) : (
                        <small>Not earned yet</small>
                      )}
                    </button>
                  );
                })}
              </div>
              <i className="yu-shelf-board" aria-hidden />
            </section>
          );
        })}
      </div>

      <Sheet
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.name ?? ""}
        detents={["medium", "large"]}
        footer={
          isEarned && open ? (
            <Button
              block
              variant="fill"
              icon="sparkle"
              onClick={() => {
                const b = open;
                setOpen(null);
                window.setTimeout(
                  () =>
                    celebrate({
                      id: `replay:${b.id}:${Date.now()}`,
                      kind: "badge",
                      eyebrow: "Badge unlocked",
                      title: b.name,
                      body: b.description,
                      medal: { tier: b.tier, icon: b.icon },
                    }),
                  250,
                );
              }}
            >
              Relive the moment
            </Button>
          ) : (
            <Button block variant="fill" onClick={() => setOpen(null)}>Done</Button>
          )
        }
      >
        {open && (
          <div className="yu-medal-detail">
            <span className="yu-medal-3d" data-big="">
              <Medal tier={open.tier} size={176} locked={!isEarned} animated={isEarned} title={`${open.name} medal`}>{medalArt(open.icon)}</Medal>
            </span>
            <Chip variant="fill">{TIER_LABEL[open.tier]}</Chip>
            <p className="lq-t17">{open.description}</p>
            {isEarned ? (
              <p className="lq-t15 lq-c2">Earned {fmtLong(earned[open.id]!)}{open.points > 0 ? ` · ${open.points} points` : ""}</p>
            ) : op ? (
              <Glass radius="inner" className="yu-medal-detail-prog">
                <div className="lq-t15 lq-num"><b>{op.current}</b> of {op.target} {unitFor(open.id, op.target)}</div>
                <ProgressBar value={op.current / op.target} tone="accent" label={`${open.name} progress`} />
                <div className="lq-t13 lq-c2">{op.target - op.current > 0 ? `${op.target - op.current} to go. It lands here on its own.` : "Almost there: it lands with your next completed day."}</div>
              </Glass>
            ) : (
              <p className="lq-t15 lq-c2">Not earned yet. Keep training and it lands here on its own.</p>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

/** "Next medal" card: the closest unearned medal with its progress. */
export function NextMedalCard({ badges, progress }: { badges: Badge[]; progress: BadgeProgress[] }) {
  const n = nextMedal(badges, progress);
  if (!n) return null;
  const left = n.p.target - n.p.current;
  return (
    <Glass as="section" radius="card" className="yu-next" aria-labelledby="yu-next-t">
      <span className="yu-next-medal" aria-hidden>
        <Medal tier={n.b.tier} size={72} locked title="">{medalArt(n.b.icon)}</Medal>
        <svg viewBox="0 0 80 80" className="yu-next-ring">
          <circle cx="40" cy="40" r="37" pathLength={100} />
          <circle cx="40" cy="40" r="37" pathLength={100} style={{ strokeDasharray: `${(n.p.current / n.p.target) * 100} 100` }} />
        </svg>
      </span>
      <span className="yu-next-main">
        <span className="lq-t13 yu-eyebrow" id="yu-next-t">Next medal</span>
        <span className="lq-t17" style={{ fontWeight: 600 }}>{n.b.name}</span>
        <span className="lq-t13 lq-c2">{n.b.description}</span>
        <span className="lq-t13 lq-num yu-next-count">
          <b>{n.p.current}</b>/{n.p.target} {unitFor(n.b.id, n.p.target)}{left > 0 ? ` · ${left} to go` : ""}
        </span>
      </span>
    </Glass>
  );
}
