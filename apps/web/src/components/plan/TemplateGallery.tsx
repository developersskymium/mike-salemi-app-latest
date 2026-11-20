"use client";

import type { IsoDate } from "@ms/core";
import Link from "next/link";
import { useState } from "react";
import { Card, Chip, Glass, Icon, Sheet } from "@/components/ui";
import type { Template } from "@/lib/loaders/today-plan-you";
import { defaultDays } from "@/components/today/dates";
import { GOAL_PHOTO } from "@/components/today/model";
import { PHOTOS } from "@/components/today/photos";
import { StartPlanForm } from "./StartPlan";
import "@/components/today/tpy.css";

const GOAL_LABEL: Record<string, string> = {
  strength: "Strength", technique: "Technique", mobility: "Mobility", conditioning: "Conditioning", mindset: "Mindset", retreat_prep: "Retreat prep", custom: "Custom",
};

/** Mike's plan templates as photo cards; choosing one opens the days sheet that starts it. */
export function TemplateGallery({ templates, goalKind, today, preferredDays }: { templates: Template[]; goalKind: string | null; today: IsoDate; preferredDays?: number[] }) {
  const [open, setOpen] = useState<Template | null>(null);
  const sorted = [...templates].sort((a, b) => Number(b.goal_kind === goalKind) - Number(a.goal_kind === goalKind));
  return (
    <>
      <div className="tpy-templates">
        {sorted.map((t) => {
          const photo = PHOTOS[GOAL_PHOTO[t.goal_kind] ?? "coaching"];
          return (
            <button key={t.id} type="button" className="tpy-tplbtn" onClick={() => setOpen(t)} aria-label={`${t.name}, ${t.weeks} weeks, ${t.days_per_week} days a week`}>
              <Card
                as="div"
                height={236}
                image={{ src: photo.src, alt: "", position: photo.position }}
                footer={
                  <div>
                    <div className="lq-t13" style={{ fontWeight: 600, opacity: 0.9 }}>{t.weeks} weeks · {t.days_per_week} days a week</div>
                    <div className="lq-t20">{t.name}</div>
                  </div>
                }
              >
                <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
                  <Chip variant="clear">{GOAL_LABEL[t.goal_kind] ?? t.goal_kind}</Chip>
                  {t.goal_kind === goalKind && <Chip variant="clear" icon="sparkle">For your goal</Chip>}
                </div>
              </Card>
            </button>
          );
        })}
        <Link className="tpy-tplbtn" href="/plan?build=1">
          <Glass radius="card" interactive className="tpy-buildown">
            <span className="tpy-goal-icon" aria-hidden><Icon name="plus" /></span>
            <div>
              <div className="lq-t20">Build my own</div>
              <div className="lq-t13 lq-c2">Pick lessons from any program you can open and place them on your days.</div>
            </div>
          </Glass>
        </Link>
      </div>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} description={open ? `${open.weeks} weeks · ${open.sessions} sessions` : undefined} detents={["large"]}>
        {open && (
          <div style={{ display: "grid", gap: 20 }}>
            {open.description && <p className="lq-t15">{open.description}</p>}
            <StartPlanForm templateId={open.id} initialDays={preferredDays?.length ? preferredDays : defaultDays(open.days_per_week)} today={today} />
          </div>
        )}
      </Sheet>
    </>
  );
}
