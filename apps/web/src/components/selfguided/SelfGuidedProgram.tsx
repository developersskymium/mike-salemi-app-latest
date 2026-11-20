"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button, Glass, Icon, Sheet, useToast } from "@/components/ui";
import { quickSessionAction, repeatSessionAction } from "@/lib/actions/selfguided";
import type { ProgramPageData } from "@/lib/loaders/training";
import type { BoardData } from "@/lib/loaders/selfguided";
import { lessonLabel, lessonName } from "@/components/training/model";
import { LevelBadge } from "./parts";
import { levelDayTitle, levelOf } from "./level";
import { PlanWizard } from "./PlanWizard";
import "./selfguided.css";
import "./hub.css";
import "./sgprogram.css";

const WORD: Record<string, string> = { workout: "Workout", recovery: "Recovery", skill: "Skill", mobility: "Mobility", overview: "Overview" };
const TONE: Record<string, string> = { workout: "var(--accent)", recovery: "var(--ok)", skill: "var(--warm)", mobility: "var(--gold)" };
const PREVIEW = "Preview mode can't start sessions. They work on the live app.";

/**
 * Program page in Self-Guided mode — one mental model: "Train in any order."
 * Compact header → one Up next card (+ three small ways in) → the day browser → favourites and phase guides.
 */
export function SelfGuidedProgram({
  data,
  board,
  curriculum,
  immersionHref,
  openHref,
  photo,
}: {
  data: ProgramPageData;
  board: BoardData | null;
  curriculum: ReactNode;
  immersionHref: string | null;
  openHref: (lessonId: string, key: string | null) => string;
  photo: { src: string; position: string };
}) {
  const { program, path, sections, lessons, progress, resources } = data;
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [wizardOpen, setWizardOpen] = useState(false);
  const word = program.lessonLabel || "Day";
  const sectionWord = program.sectionLabel || "Phase";

  // Up next: the smart pick with its reason, else the first day not done.
  const next = board?.next ?? null;
  const done = new Set(progress.filter((r) => r.complete).map((r) => r.lessonId));
  const fallback = lessons.find((l) => l.dayNumber != null && !l.pageType && !done.has(l.id)) ?? lessons[0] ?? null;
  const started = progress.some((r) => r.doneSteps > 0);
  const upHref = next ? openHref(next.lessonId, next.key) : fallback ? openHref(fallback.id, fallback.key) : null;
  const upTitle = next ? levelDayTitle(levelOf(next.key), next.dayNumber, next.title) : fallback ? `${lessonLabel(fallback, word)} · ${lessonName(fallback)}` : program.name;
  const upReason = next?.reason ?? (started ? "The next day you haven't done yet." : "Every day is open — start at Day 1 or anywhere you like.");
  const poster = board?.continue?.poster && board.continue.lessonId === next?.lessonId ? board.continue.poster : null;

  const go = (fn: () => Promise<{ ok: true; sessionId: string | null } | { ok: false; code: string; message: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast(r.code === "offline" ? PREVIEW : r.message, { icon: "close" });
      if (r.sessionId) router.push(`/programs/${program.slug}/session/${r.sessionId}`);
    });

  const favs = board?.favourites.slice(0, 4) ?? [];

  return (
    <div className="sgp">
      {/* Header */}
      <header className="sgp-head">
        <p className="lq-eyebrow" data-tone="accent">
          {program.name} · Self-Guided
        </p>
        <h1 className="lq-d-lg sgp-title">Train in any order.</h1>
        <p className="lq-t15 lq-c2 sgp-lede">Pick any day, in any order. Your progress is kept per level.</p>
        {immersionHref && (
          <Link href={immersionHref} className="sgp-switch lq-link">
            <Icon name="compass" size="xs" /> Switch to Immersion (day by day)
          </Link>
        )}
      </header>

      {/* Up next */}
      <Glass as="section" radius="card" className="sgh-next sgp-next" aria-labelledby="sgp-next-t">
        <div className="sgh-next-photo">
          {poster && !poster.startsWith("http") ? (
            <Image src={poster} alt="" fill sizes="(min-width: 900px) 280px, 100vw" style={{ objectFit: "cover" }} />
          ) : (
            <Image src={photo.src} alt="" fill sizes="(min-width: 900px) 280px, 100vw" style={{ objectFit: "cover", objectPosition: photo.position }} />
          )}
          {next && (
            <span className="sgh-intent" style={{ ["--t" as string]: TONE[next.intent] ?? "var(--accent)" }}>
              {WORD[next.intent] ?? "Day"}
            </span>
          )}
        </div>
        <div className="sgh-next-b">
          <p className="lq-eyebrow" data-tone="accent">
            Up next <LevelBadge n={next ? levelOf(next.key) : levelOf(fallback?.key, path?.name)} />
          </p>
          <h2 id="sgp-next-t" className="lq-d-sm sgh-next-t">
            {upTitle}
          </h2>
          <p className="sgh-reason">{upReason}</p>
          <div className="sgh-next-acts">
            {upHref && (
              <Button icon="play" href={upHref}>
                {next?.completions ? "Do it again" : started ? "Continue" : "Start"}
              </Button>
            )}
          </div>
          <div className="sgp-ways" aria-label="Other ways in">
            <Link href={`/plan?program=${program.slug}`} className="sgp-chip lq-press">
              <Icon name="calendar" size="xs" /> Continue my order
            </Link>
            <span className="sgp-chip sgp-chip-quick">
              <Icon name="timer" size="xs" /> Quick session
              {[10, 20, 30].map((m) => (
                <button key={m} type="button" className="sgp-min lq-num" disabled={pending} onClick={() => go(() => quickSessionAction(program.id, m, null, path?.id ?? null))} aria-label={`${m} minute quick session`}>
                  {m}
                </button>
              ))}
            </span>
            <button type="button" className="sgp-chip lq-press" onClick={() => setWizardOpen(true)}>
              <Icon name="sparkle" size="xs" /> Plan my weeks
            </button>
          </div>
        </div>
      </Glass>

      {/* Day browser */}
      <div className="sgp-body">{curriculum}</div>

      {/* Favourites + phase guides */}
      {(favs.length > 0 || resources.length > 0) && (
        <div className="sgp-extras">
          {favs.length > 0 && (
            <section className="sgp-box" aria-labelledby="sgp-fav-h">
              <h2 id="sgp-fav-h" className="sgp-box-h">
                <Icon name="heart" size="xs" /> Favourites
              </h2>
              {favs.map((f) => (
                <button
                  key={f.sessionId}
                  type="button"
                  className="sgp-row lq-press"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await repeatSessionAction(f.sessionId);
                      if (!r.ok) return void toast(r.code === "offline" ? PREVIEW : r.message, { icon: "close" });
                      router.push(r.sessionId ? `/programs/${program.slug}/session/${r.sessionId}` : `/programs/${program.slug}/guide/${encodeURIComponent(r.lessonKey ?? r.lessonId ?? "")}`);
                    })
                  }
                >
                  <LevelBadge n={levelOf(f.lessonKey)} />
                  <b>{f.dayNumber != null ? levelDayTitle(levelOf(f.lessonKey), f.dayNumber, f.title) : f.title}</b>
                  {f.minutes ? <small className="lq-num">{f.minutes} min</small> : null}
                  <Icon name="repeat" size="xs" className="lq-c3" />
                </button>
              ))}
            </section>
          )}
          {resources.length > 0 && (
            <section className="sgp-box" aria-labelledby="sgp-res-h">
              <h2 id="sgp-res-h" className="sgp-box-h">
                <Icon name="download" size="xs" /> {sectionWord} guides (PDF)
              </h2>
              {resources.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="sgp-row lq-press">
                  <b>{r.title}</b>
                  <small>{sections.find((s) => s.id === r.sectionId)?.subtitle ?? "Printable"}</small>
                  <Icon name="download" size="xs" className="lq-c3" />
                </a>
              ))}
            </section>
          )}
        </div>
      )}

      <Sheet open={wizardOpen} onClose={() => setWizardOpen(false)} title="Plan your weeks" description={`Pick your days and we lay ${program.name} out on your calendar.`} detents={["large"]}>
        {wizardOpen && <PlanWizard data={data} board={board} onDone={() => setWizardOpen(false)} />}
      </Sheet>
    </div>
  );
}
