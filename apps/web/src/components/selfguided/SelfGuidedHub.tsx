"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { SafeImage } from "@/components/discover/library/SafeImage";
import { Button, Glass, Icon, useToast } from "@/components/ui";
import { quickSessionAction, repeatSessionAction } from "@/lib/actions/selfguided";
import type { BoardData } from "@/lib/loaders/selfguided";
import { continueHref, hm, LevelBadge } from "./parts";
import { levelDayTitle, levelOf } from "./level";
import "./selfguided.css";
import "./hub.css";

const WORD: Record<string, string> = { workout: "Workout", recovery: "Recovery", skill: "Skill", mobility: "Mobility", overview: "Overview" };
const TONE: Record<string, string> = { workout: "var(--accent)", recovery: "var(--ok)", skill: "var(--warm)", mobility: "var(--gold)" };
const PREVIEW = "Preview mode can't start sessions. They work on the live app.";

export interface HubProps {
  slug: string;
  programId: string;
  pathId: string | null;
  programName: string;
  board: BoardData;
  /** This program's missed sessions on the one schedule (last 14 days). */
  missed: number;
  /** Where the photo for "Up next" comes from when the continue point has no poster. */
  photo: { src: string; position: string };
  graduation: { a4l: boolean; mtk: boolean } | null;
}

/**
 * Self-Guided, calm (spec 11 #3, spec 12 Self-Guided): ONE "Up next" card with its reason → three ways in
 * (Continue plan · Quick session · Build a plan) → one-line missed-days fix → stats with a 12-week map you can
 * tap → balance ring → favourites → graduation prompt. Every capability stays; none of it shouts.
 */
export function SelfGuidedHub(p: HubProps) {
  const { board } = p;
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const next = board.next;
  const c = board.continue;
  const low = next?.readiness && next.readiness.band !== "green" && next.intent === "workout";

  const go = (fn: () => Promise<{ ok: true; sessionId: string | null } | { ok: false; code: string; message: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast(r.code === "offline" ? PREVIEW : r.message, { icon: "close" });
      if (r.sessionId) router.push(`/programs/${p.slug}/session/${r.sessionId}`);
    });
  const quickGo = (min: number, intent: "workout" | "recovery" | "mobility" | null = null) => go(() => quickSessionAction(p.programId, min, intent, p.pathId));

  const upHref = next ? `/programs/${p.slug}/session/open?lesson=${next.lessonId}&key=${encodeURIComponent(next.key ?? next.lessonId)}` : c ? continueHref(c) : `/programs/${p.slug}?mode=self-guided`;
  const poster = c?.poster && c.lessonId === next?.lessonId ? c.poster : null;

  return (
    <div className="sgh">
      {/* 1 · Up next, with the reason */}
      <Glass as="section" radius="card" className="sgh-next" aria-labelledby="sgh-next-t">
        <div className="sgh-next-photo">
          {poster ? (
            <SafeImage
              src={poster}
              alt=""
              fill
              sizes="(min-width: 900px) 320px, 100vw"
              unoptimized={poster.startsWith("http")}
              style={{ objectFit: "cover" }}
              fallback={<Image src={p.photo.src} alt="" fill sizes="(min-width: 900px) 320px, 100vw" style={{ objectFit: "cover", objectPosition: p.photo.position }} />}
            />
          ) : (
            <Image src={p.photo.src} alt="" fill sizes="(min-width: 900px) 320px, 100vw" style={{ objectFit: "cover", objectPosition: p.photo.position }} />
          )}
          {next && <span className="sgh-intent" style={{ ["--t" as string]: TONE[next.intent] ?? "var(--accent)" }}>{WORD[next.intent] ?? "Day"}</span>}
        </div>
        <div className="sgh-next-b">
          <p className="lq-eyebrow" data-tone="accent">Up next <LevelBadge n={next ? levelOf(next.key) : c ? levelOf(c.lessonKey, c.pathName) : null} /></p>
          <h2 id="sgh-next-t" className="lq-d-sm sgh-next-t">{next ? levelDayTitle(levelOf(next.key), next.dayNumber, next.title) : c ? levelDayTitle(levelOf(c.lessonKey, c.pathName), c.dayNumber, c.lessonTitle ?? "") : `Start ${p.programName}`}</h2>
          <p className="sgh-reason">{next?.reason ?? (c ? "Pick up exactly where you left off." : "Every day is open — start at Day 1 or anywhere you like.")}</p>
          <div className="sgh-next-acts">
            <Button icon="play" href={upHref}>{next?.completions ? "Do it again" : c && c.lessonId === next?.lessonId ? "Resume" : "Start"}</Button>
            {low && (
              <Button variant="plain" size="md" onClick={() => quickGo(20, "recovery")} disabled={pending}>
                Readiness is {next!.readiness!.band === "red" ? "low" : "so-so"} — lighter day
              </Button>
            )}
          </div>
        </div>
      </Glass>

      {/* 2 · Three ways in */}
      <div className="sgh-ways" role="list">
        <Link role="listitem" href={`/plan?program=${p.slug}`} className="sgh-way lq-press">
          <Icon name="calendar" size="sm" />
          <span><b>Continue plan</b><small>Your days on the one schedule</small></span>
        </Link>
        <div role="listitem" className="sgh-way sgh-way-quick">
          <div className="sgh-way-btn">
            <Icon name="timer" size="sm" />
            <span><b>Quick session</b><small>Warm-up, main, stretch</small></span>
          </div>
          <div className="sgh-mins" aria-label="Minutes">
            {[10, 20, 30].map((m) => (
              <button key={m} type="button" className="sgh-min lq-num" disabled={pending} onClick={() => quickGo(m)}>{m}<small>min</small></button>
            ))}
          </div>
        </div>
        <Link role="listitem" href={`/programs/${p.slug}/session/wizard`} className="sgh-way lq-press">
          <Icon name="sparkle" size="sm" />
          <span><b>Build a plan</b><small>From the day plan, 3 questions</small></span>
        </Link>
      </div>

      {/* 4 · Missed days, one line */}
      {p.missed > 0 && (
        <p className="sgh-line">
          <Icon name="repeat" size="xs" /> {p.missed === 1 ? "One session" : `${p.missed} sessions`} slipped this fortnight.{" "}
          <Link href={`/plan?program=${p.slug}`}>Slide {p.missed === 1 ? "it" : "them"} forward</Link>
        </p>
      )}

      {/* 6 / 7 · Progress: 12-week map + balance */}
      {board.stats && (
        <section className="sgh-track" aria-label="Your training">
          <Glass radius="card" className="sgh-card">
            <div className="sgh-stats">
              <div><b className="lq-num">{board.stats.sessions}</b><span>sessions</span></div>
              <div><b className="lq-num">{hm(board.stats.minutes)}</b><span>trained</span></div>
              <div><b className="lq-num">{board.stats.streak.current}</b><span>day streak</span></div>
            </div>
            <WeekMap stats={board.stats} history={board.history} slug={p.slug} />
          </Glass>
          <Glass radius="card" className="sgh-card sgh-balance">
            <Balance intents={board.stats.intents} />
          </Glass>
        </section>
      )}

      {/* 8 · Favourites → quick start */}
      {board.favourites.length > 0 && (
        <section aria-label="Favourite days" className="sgh-favs">
          <span className="sgh-favs-l"><Icon name="heart" size="xs" /> Favourites</span>
          {board.favourites.slice(0, 4).map((f) => (
            <button
              key={f.sessionId}
              type="button"
              className="sgh-fav"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await repeatSessionAction(f.sessionId);
                  if (!r.ok) return void toast(r.code === "offline" ? PREVIEW : r.message, { icon: "close" });
                  router.push(r.sessionId ? `/programs/${p.slug}/session/${r.sessionId}` : `/programs/${p.slug}/guide/${encodeURIComponent(r.lessonKey ?? r.lessonId ?? "")}`);
                })
              }
            >
              <LevelBadge n={levelOf(f.lessonKey)} />
              {f.dayNumber != null ? levelDayTitle(levelOf(f.lessonKey), f.dayNumber, f.title) : f.title}
              {f.minutes ? <small className="lq-num"> · {f.minutes} min</small> : null}
            </button>
          ))}
        </section>
      )}

      {/* 10 · Graduation */}
      {p.graduation && (
        <Glass as="section" radius="card" className="sgh-grad" aria-label="Ready for the next step">
          <Icon name="medal" size="sm" />
          <div>
            <b>Eight steady weeks. You&apos;re ready for more.</b>
            <p>Build strength in blocks with Athleticism 4 Life, or sharpen every lift with Mastering the Kettlebell.</p>
          </div>
          <div className="sgh-grad-acts">
            <Button size="sm" variant="tint" href={p.graduation.a4l ? "/programs/athleticism-4-life" : "/explore/athleticism-4-life"}>A4L</Button>
            <Button size="sm" variant="plain" href={p.graduation.mtk ? "/programs/mastering-the-kettlebell" : "/explore/mastering-the-kettlebell"}>MTK</Button>
          </div>
        </Glass>
      )}
    </div>
  );
}

/** 12 weeks of training days; tap a day to see what you did. */
function WeekMap({ stats, history, slug }: { stats: NonNullable<BoardData["stats"]>; history: BoardData["history"]; slug: string }) {
  const [pick, setPick] = useState<string | null>(null);
  const cells = useMemo(() => {
    const byDate = new Map(stats.heatmap.map((h) => [h.date, h]));
    const today = new Date(`${stats.today}T12:00:00Z`);
    const dow = (today.getUTCDay() + 6) % 7; // Monday = 0
    const startMs = today.getTime() - (11 * 7 + dow) * 86400000;
    return Array.from({ length: 84 }, (_, i) => {
      const d = new Date(startMs + i * 86400000).toISOString().slice(0, 10);
      const h = byDate.get(d);
      const min = h?.minutes ?? 0;
      return { d, future: d > stats.today, today: d === stats.today, l: h && (h.sessions || h.steps) ? (min >= 45 ? 3 : min >= 20 ? 2 : 1) : 0, min, s: h?.sessions ?? 0 };
    });
  }, [stats]);
  const picked = pick ? cells.find((c) => c.d === pick) : null;
  const rows = pick ? history.filter((h) => h.startedAt.slice(0, 10) === pick) : [];
  return (
    <div className="sgh-map">
      <div className="sgh-map-grid" role="grid" aria-label="Last 12 weeks">
        {cells.map((c) => (
          <button
            key={c.d}
            type="button"
            className="sgh-cell"
            data-l={c.l || undefined}
            data-f={c.future ? "" : undefined}
            data-t={c.today ? "" : undefined}
            aria-pressed={pick === c.d}
            disabled={c.future}
            aria-label={`${c.d}: ${c.l ? `${c.min} min` : "rest"}`}
            onClick={() => setPick((x) => (x === c.d ? null : c.d))}
          />
        ))}
      </div>
      <p className="sgh-map-line" aria-live="polite">
        {picked ? (
          <>
            <b>{new Date(`${picked.d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</b>
            {" · "}
            {rows.length ? (
              rows.map((r, i) => (
                <span key={r.sessionId}>
                  {i > 0 && ", "}
                  {r.lessonKey ? <Link href={`/programs/${slug}/guide/${encodeURIComponent(r.lessonKey)}`}>{levelDayTitle(levelOf(r.lessonKey), r.dayNumber, r.title)}</Link> : r.title}
                  {r.minutes ? ` (${r.minutes} min)` : ""}
                </span>
              ))
            ) : picked.l ? `${picked.min} min trained` : "Rest day"}
          </>
        ) : (
          <>Last 12 weeks · {stats.activeDays} active days. Tap a day.</>
        )}
      </p>
    </div>
  );
}

/** Balance ring: how your sessions split across workout / recovery / skill / mobility. */
function Balance({ intents }: { intents: Partial<Record<string, number>> }) {
  const parts = (["workout", "recovery", "skill", "mobility"] as const).map((k) => ({ k, n: intents[k] ?? 0 }));
  const total = parts.reduce((s, x) => s + x.n, 0) || 1;
  const r = 34;
  const len = 2 * Math.PI * r;
  let acc = 0;
  const top = [...parts].sort((a, b) => b.n - a.n)[0]!;
  const lowest = [...parts].sort((a, b) => a.n - b.n)[0]!;
  return (
    <div className="sgh-bal">
      <svg viewBox="0 0 84 84" width="84" height="84" aria-hidden>
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--surface-sunk)" strokeWidth="9" />
        {parts.map((x) => {
          const seg = (x.n / total) * len;
          const el = x.n ? (
            <circle key={x.k} cx="42" cy="42" r={r} fill="none" stroke={TONE[x.k]} strokeWidth="9" strokeDasharray={`${Math.max(0, seg - 2)} ${len}`} strokeDashoffset={-acc} transform="rotate(-90 42 42)" />
          ) : null;
          acc += seg;
          return el;
        })}
      </svg>
      <div className="sgh-bal-b">
        <b>Balance</b>
        <ul>
          {parts.map((x) => (
            <li key={x.k}><i style={{ background: TONE[x.k] }} />{WORD[x.k]} <span className="lq-num">{Math.round((x.n / total) * 100)}%</span></li>
          ))}
        </ul>
        {top.n > 0 && lowest.k !== top.k && <small>Mostly {WORD[top.k]!.toLowerCase()}. Add a {WORD[lowest.k]!.toLowerCase()} day this week.</small>}
      </div>
    </div>
  );
}
