"use client";

import { useState } from "react";
import { Medal, MEDAL_TIERS, type MedalTier } from "@/components/graphics";
import { Button, Chip, Glass, Sheet } from "@/components/ui";
import type { Badge } from "@/lib/loaders/today-plan-you";
import { medalArt } from "./MedalArt";
import "@/components/today/tpy.css";

const TIER_LABEL: Record<MedalTier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum" };
const shortFmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso));
const dateFmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

/** Medals grouped by tier; earned ones shine, the rest wait as quiet outlines. Tap for the detail sheet. */
export function MedalCase({ badges, earned }: { badges: Badge[]; earned: Record<string, string> }) {
  const [open, setOpen] = useState<Badge | null>(null);
  const tiers = MEDAL_TIERS.filter((t) => badges.some((b) => b.tier === t));
  const isEarned = open ? !!earned[open.id] : false;
  return (
    <>
      {tiers.map((t) => {
        const list = badges.filter((b) => b.tier === t);
        const n = list.filter((b) => earned[b.id]).length;
        return (
          <section key={t} aria-labelledby={`tier-${t}`}>
            <div className="tpy-section-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 id={`tier-${t}`}>{TIER_LABEL[t]}</h2>
              <span className="lq-num">{n} of {list.length}</span>
            </div>
            <Glass radius="card" className="tpy-pad">
              <div className="tpy-medals">
                {list.map((b) => (
                  <button key={b.id} type="button" className="tpy-medal lq-press" onClick={() => setOpen(b)} aria-label={`${b.name}, ${TIER_LABEL[b.tier]}${earned[b.id] ? ", earned" : ", not earned yet"}`}>
                    <Medal tier={b.tier} size={76} locked={!earned[b.id]} title="">{medalArt(b.icon)}</Medal>
                    <span>{b.name}</span>
                    <small>{earned[b.id] ? `Earned ${shortFmt(earned[b.id]!)}` : b.description}</small>
                  </button>
                ))}
              </div>
            </Glass>
          </section>
        );
      })}
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} detents={["medium", "large"]} footer={<Button block variant="fill" onClick={() => setOpen(null)}>Done</Button>}>
        {open && (
          <div style={{ display: "grid", justifyItems: "center", gap: 12, textAlign: "center", padding: "8px 0 4px" }}>
            <Medal tier={open.tier} size={168} locked={!isEarned} animated={isEarned} title={`${open.name} medal`}>{medalArt(open.icon)}</Medal>
            <Chip variant="fill">{TIER_LABEL[open.tier]}</Chip>
            <p className="lq-t17">{open.description}</p>
            <p className="lq-t15 lq-c2">
              {isEarned ? `Earned ${dateFmt(earned[open.id]!)}` : "Not earned yet. Keep training and it lands here on its own."}
              {open.points > 0 ? ` · ${open.points} points` : ""}
            </p>
          </div>
        )}
      </Sheet>
    </>
  );
}
