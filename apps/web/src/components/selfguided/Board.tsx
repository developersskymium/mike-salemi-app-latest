"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { assembleQuickSession, INTENT_LABEL, QUICK_MINUTES, totalMinutes, type Intent, type StepRole } from "@ms/core";
import type { HistoryRow } from "@ms/api";
import { Button, Glass, Icon, Segmented, Sheet, useToast } from "@/components/ui";
import type { BoardData } from "@/lib/loaders/selfguided";
import { customSessionAction, quickSessionAction, repeatSessionAction } from "@/lib/actions/selfguided";
import { dayTypeShort } from "@/components/training/model";
import { ContinueCard, IntentTag, LevelBadge, dayOf, hm } from "./parts";
import { levelLong, levelOf } from "./level";

const SLOT_LABEL = { warmup: "Warm-up", main: "Main", stretch: "Stretch" } as const;
const ROLE_LABEL: Record<StepRole, string> = { warmup: "Warm-ups", workout: "Workouts", skill: "Skill work", mobility: "Mobility", recovery: "Recovery" };

/**
 * The Self-Guided board under the level hero: Continue (exact lesson, step and video position),
 * Up next with the reason, and Quick session (10/20/30/45 by intent, live preview, build your own).
 */
export function SelfGuidedBoard({
  board, programId, pathId, slug, lessonWord, openHref, startHref, startLabel,
}: {
  board: BoardData;
  programId: string;
  pathId: string | null;
  slug: string;
  lessonWord: string;
  openHref: (lessonId: string, key: string | null) => string;
  startHref: string | null;
  startLabel: string;
}) {
  const n = board.next;
  return (
    <div className="sg-board" aria-label="Your Self-Guided board">
      {board.continue ? (
        <ContinueCard c={board.continue} />
      ) : (
        <Glass radius="card" className="sg-card">
          <p className="sg-eyebrow" data-tone="now">
            Start here
          </p>
          <p className="lq-t17" style={{ fontWeight: 650 }}>
            Every {lessonWord.toLowerCase()} is open
          </p>
          <p className="lq-t13 lq-c2">Begin at the start, jump to any phase below, or let a quick session pick for you.</p>
          {startHref && (
            <Button size="md" icon="play" href={startHref}>
              {startLabel}
            </Button>
          )}
        </Glass>
      )}

      {n && (
        <Glass radius="card" className="sg-card">
          <div className="sg-card-h">
            <p className="sg-eyebrow">Up next</p>
            <IntentTag intent={n.intent} />
          </div>
          <p className="lq-t17" style={{ fontWeight: 650 }}>
            <LevelBadge n={levelOf(n.key)} />{levelOf(n.key) ? " " : null}
            {n.dayNumber != null ? `${levelOf(n.key) ? `${levelLong(levelOf(n.key)!)} · ` : ""}${lessonWord} ${n.dayNumber}` : n.title}
            {n.dayType && n.dayNumber != null ? <span className="lq-c2"> · {dayTypeShort(n.dayType)}</span> : null}
          </p>
          <p className="lq-t13 lq-c2">{[n.sectionTitle, n.completions ? `done ${n.completions}× before` : null].filter(Boolean).join(" · ")}</p>
          <div className="sg-reason">
            <Icon name="sparkle" />
            <span className="lq-t13">{n.reason}</span>
          </div>
          <Button size="md" variant="glass" icon="play" href={openHref(n.lessonId, n.key)}>
            {n.kind === "repeat" ? "Repeat it" : "Open"} {n.dayNumber != null ? `${lessonWord} ${n.dayNumber}` : ""}
          </Button>
        </Glass>
      )}

      <QuickSession board={board} programId={programId} pathId={pathId} slug={slug} />
    </div>
  );
}

function QuickSession({ board, programId, pathId, slug }: { board: BoardData; programId: string; pathId: string | null; slug: string }) {
  const router = useRouter();
  const toast = useToast();
  const [intent, setIntent] = useState<Intent>(board.next?.want ?? "workout");
  const [minutes, setMinutes] = useState<number>(20);
  const [busy, setBusy] = useState<number | null>(null);
  const [, start] = useTransition();
  const [build, setBuild] = useState(false);
  const seed = board.history.filter((h) => h.source === "quick").length;
  const preview = useMemo(() => assembleQuickSession(board.pool, minutes, intent, seed), [board.pool, minutes, intent, seed]);

  const go = (m: number) => {
    setMinutes(m);
    setBusy(m);
    start(async () => {
      const r = await quickSessionAction(programId, m, intent, pathId);
      setBusy(null);
      if (!r.ok) return toast(r.message);
      router.push(`/programs/${slug}/session/${r.sessionId}`);
    });
  };

  if (!board.pool.length) return null;
  return (
    <Glass radius="card" className="sg-card">
      <div className="sg-card-h">
        <p className="sg-eyebrow">Short on time?</p>
        <button type="button" className="sg-chip" onClick={() => setBuild(true)}>
          <Icon name="plus" /> Build your own
        </button>
      </div>
      <p className="lq-t17" style={{ fontWeight: 650 }}>
        Quick session
      </p>
      <Segmented
        label="Session type"
        variant="fill"
        size="sm"
        value={intent}
        onChange={(v) => setIntent(v)}
        options={(["workout", "recovery", "skill", "mobility"] as Intent[]).map((i) => ({ value: i, label: INTENT_LABEL[i] }))}
      />
      <div className="sg-quick-mins" role="group" aria-label="Minutes">
        {QUICK_MINUTES.map((m) => (
          <button
            key={m}
            type="button"
            className="sg-quick-min"
            aria-busy={busy === m || undefined}
            onClick={() => go(m)}
            onMouseEnter={() => setMinutes(m)}
            onFocus={() => setMinutes(m)}
            aria-label={`Start a ${m}-minute ${INTENT_LABEL[intent].toLowerCase()} session`}
          >
            {m}
            <small>min</small>
          </button>
        ))}
      </div>
      <ul className="sg-preview" aria-label={`${minutes}-minute preview`}>
        {preview.map((it) => (
          <li key={it.stepId}>
            <span>{SLOT_LABEL[it.slot]}</span>
            <span className="sg-ellipsis">
              {it.title}
              {it.lessonTitle ? <span className="lq-c3"> · {levelOf(it.lessonKey) ? `${levelLong(levelOf(it.lessonKey)!)} · ` : ""}{it.lessonTitle.replace(/\s*-\s*.*$/, "")}</span> : null}
            </span>
            <span className="lq-c2 sg-num">{it.minutes}′</span>
          </li>
        ))}
        <li>
          <span />
          <span className="lq-c2">From the program, warm-up to stretch</span>
          <b className="sg-num">{totalMinutes(preview)}′</b>
        </li>
      </ul>
      <BuildSheet open={build} onClose={() => setBuild(false)} board={board} programId={programId} slug={slug} />
    </Glass>
  );
}

/** Legacy "creator" for one session: pick steps from the program (one per video), see the total, start. */
function BuildSheet({ open, onClose, board, programId, slug }: { open: boolean; onClose: () => void; board: BoardData; programId: string; slug: string }) {
  const router = useRouter();
  const toast = useToast();
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();
  const byRole = (["warmup", "workout", "skill", "mobility", "recovery"] as StepRole[])
    .map((r) => ({ r, items: board.pool.filter((p) => p.role === r) }))
    .filter((g) => g.items.length);
  const chosen = picked.map((id) => board.pool.find((p) => p.stepId === id)!).filter(Boolean);
  const total = totalMinutes(chosen);
  const toggle = (id: string) => setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : xs.length >= 20 ? xs : [...xs, id]));
  const go = () =>
    start(async () => {
      const r = await customSessionAction(programId, picked, title.trim() || null);
      if (!r.ok) return toast(r.message);
      onClose();
      router.push(`/programs/${slug}/session/${r.sessionId}`);
    });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Build your own session"
      description="Pick the parts you want, in the order you'll do them."
      desktop="side"
      footer={
        <div className="sg-stack" style={{ gap: 10 }}>
          <div className="sg-total">
            <span className="lq-t15">
              {chosen.length} part{chosen.length === 1 ? "" : "s"}
            </span>
            <b className="lq-t17 sg-num">{total} min</b>
          </div>
          <Button block icon="play" onClick={go} disabled={!picked.length} aria-busy={pending || undefined}>
            Start this session
          </Button>
        </div>
      }
    >
      <label className="sg-field">
        <span>Name (optional)</span>
        <input className="sg-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Swing clinic" />
      </label>
      {byRole.map(({ r, items }) => (
        <div key={r}>
          <p className="sg-eyebrow sg-group-h">{ROLE_LABEL[r]}</p>
          {items.map((it) => {
            const i = picked.indexOf(it.stepId);
            return (
              <label key={it.stepId} className="sg-pick">
                <input type="checkbox" checked={i >= 0} onChange={() => toggle(it.stepId)} />
                <span className="sg-pick-t">
                  <span className="lq-t15" style={{ fontWeight: 600 }}>
                    {i >= 0 ? `${i + 1}. ` : ""}
                    {it.title}
                  </span>
                  <span className="lq-t12 lq-c2 sg-ellipsis">{[levelOf(it.lessonKey) ? levelLong(levelOf(it.lessonKey)!) : null, it.lessonTitle].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="lq-t13 lq-c2 sg-num">{it.minutes} min</span>
              </label>
            );
          })}
        </div>
      ))}
    </Sheet>
  );
}

/** Favourites and past sessions with one-tap repeat (sidebar). */
export function RepeatList({ rows, slug, openHref, lessonWord }: { rows: HistoryRow[]; slug: string; openHref: (lessonId: string, key: string | null) => string; lessonWord: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  if (!rows.length) return null;
  const repeat = (h: HistoryRow) => {
    if (h.lessonId && !h.items) return router.push(openHref(h.lessonId, h.lessonKey));
    setBusy(h.sessionId);
    start(async () => {
      const r = await repeatSessionAction(h.sessionId);
      setBusy(null);
      if (!r.ok) return toast(r.message);
      if (r.sessionId) router.push(`/programs/${slug}/session/${r.sessionId}`);
      else if (r.lessonId) router.push(openHref(r.lessonId, r.lessonKey));
    });
  };
  return (
    <Glass radius="card" className="sg-list">
      {rows.map((h) => {
        const d = dayOf(h.startedAt);
        return (
          <div key={h.sessionId} className="sg-li">
            <span className="sg-li-ic" aria-hidden>
              <Icon name={h.favourite ? "bookmark" : h.source === "quick" ? "timer" : "repeat"} />
            </span>
            <span className="sg-li-t">
              <span className="lq-t15 sg-ellipsis" style={{ fontWeight: 600 }}>
                <LevelBadge n={levelOf(h.lessonKey)} />{levelOf(h.lessonKey) ? " " : null}
                {h.dayNumber != null ? `${levelOf(h.lessonKey) ? `${levelLong(levelOf(h.lessonKey)!)} · ` : ""}${lessonWord} ${h.dayNumber}` : h.title}
              </span>
              <span className="lq-t12 lq-c2 sg-ellipsis">
                {d.d} {d.m} · {hm(h.minutes)}
                {h.items ? ` · ${h.items} parts` : ""}
              </span>
            </span>
            <Button size="sm" variant="fill" icon="repeat" onClick={() => repeat(h)} aria-busy={busy === h.sessionId || undefined} aria-label={`Repeat ${h.title}`}>
              Repeat
            </Button>
          </div>
        );
      })}
    </Glass>
  );
}
