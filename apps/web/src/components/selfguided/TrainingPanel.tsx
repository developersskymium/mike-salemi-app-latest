"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { HistoryRow, TrainingStatsDTO } from "@ms/api";
import { Glass, Icon, ProgressBar, useToast } from "@/components/ui";
import { favouriteAction } from "@/lib/actions/selfguided";
import { HeatmapGrid, IntentTag, ReadinessSpark, StatTiles, dayOf, hm } from "./parts";

const SOURCE: Record<string, string> = { day: "Day", quick: "Quick session", custom: "Your session", library: "Library", repeat: "Repeat" };

/** Progress for one program: tiles, heatmap, readiness trend, phase bars and the history log. */
export function TrainingPanel({
  stats, history, slug, lessonWord, phases,
}: {
  stats: TrainingStatsDTO;
  history: HistoryRow[];
  slug: string;
  lessonWord: string;
  phases: { title: string; done: number; total: number }[];
}) {
  const last = stats.readiness[stats.readiness.length - 1];
  return (
    <section className="sg-stack" aria-labelledby="sg-tr-h">
      <div className="sg-sec-h">
        <h2 id="sg-tr-h" className="lq-t22">
          Your training
        </h2>
        <span className="lq-t13 lq-c2 sg-num">
          {stats.completions} completions · {stats.activeDays} active days
        </span>
      </div>
      <StatTiles stats={stats} />
      <div className="sg-body" style={{ marginTop: 0 }}>
        <div className="sg-main">
          <HeatmapGrid entries={stats.heatmap} today={stats.today} weeks={20} cell={13} />
        </div>
        <div className="sg-side" style={{ position: "static" }}>
          <Glass radius="card" className="sg-card">
            <div className="sg-card-h">
              <p className="lq-t15" style={{ fontWeight: 650 }}>
                Readiness trend
              </p>
              {last && (
                <span className="sg-score" data-b={last.band}>
                  {last.score}
                </span>
              )}
            </div>
            {stats.readiness.length > 1 ? (
              <>
                <ReadinessSpark points={stats.readiness} />
                <p className="lq-t12 lq-c2">Last {stats.readiness.length} check-ins. Lower is fresher; the line rises when you recover.</p>
              </>
            ) : (
              <p className="lq-t13 lq-c2">Your check-ins on workout days show up here.</p>
            )}
          </Glass>
          {phases.length > 0 && (
            <Glass radius="card" className="sg-card">
              <p className="lq-t15" style={{ fontWeight: 650 }}>
                By phase
              </p>
              <div className="sg-phasebars">
                {phases.map((p) => (
                  <div key={p.title} className="sg-phasebar">
                    <span className="sg-ellipsis">{p.title}</span>
                    <span className="lq-c2 sg-num">
                      {p.done}/{p.total}
                    </span>
                    <ProgressBar value={p.total ? p.done / p.total : 0} tone={p.done > 0 && p.done < p.total ? "accent" : "label"} label={`${p.title} progress`} />
                  </div>
                ))}
              </div>
            </Glass>
          )}
        </div>
      </div>
      <HistoryList rows={history} slug={slug} lessonWord={lessonWord} />
    </section>
  );
}

export function HistoryList({ rows, slug, lessonWord }: { rows: HistoryRow[]; slug?: string; lessonWord: string }) {
  const toast = useToast();
  const [fav, setFav] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((r) => [r.sessionId, r.favourite])));
  const [, start] = useTransition();
  if (!rows.length) {
    return (
      <Glass radius="card" className="sg-empty">
        <p className="lq-t17">No sessions yet</p>
        <p className="lq-t13 lq-c2">Open any {lessonWord.toLowerCase()} or start a quick session. Every session logs itself here with minutes and readiness.</p>
      </Glass>
    );
  }
  const toggle = (id: string) => {
    const on = !fav[id];
    setFav((f) => ({ ...f, [id]: on }));
    start(async () => {
      const r = await favouriteAction(id, on);
      if (!r.ok) {
        setFav((f) => ({ ...f, [id]: !on }));
        toast(r.message);
      } else toast(on ? "Saved to favourites" : "Removed from favourites", { tone: "success" });
    });
  };
  return (
    <Glass radius="card" className="sg-hist" role="list" aria-label="Session history">
      {rows.map((h) => {
        const d = dayOf(h.startedAt);
        const href = h.lessonKey ? `/programs/${h.programSlug ?? slug}/guide/${encodeURIComponent(h.lessonKey)}` : null;
        return (
          <div key={h.sessionId} className="sg-hrow" role="listitem">
            <span className="sg-hdate">
              <b>{d.d}</b>
              <span>{d.m}</span>
            </span>
            <span className="sg-hrow-t">
              <span className="lq-t15 sg-ellipsis" style={{ fontWeight: 650 }}>
                {href ? (
                  <Link href={href} className="sg-link" prefetch={false}>
                    {h.dayNumber != null ? `${lessonWord} ${h.dayNumber} · ${h.title.replace(/^day\s*\d+\s*[-–]\s*/i, "")}` : h.title}
                  </Link>
                ) : (
                  h.title
                )}
              </span>
              <span className="sg-hrow-meta">
                <IntentTag intent={h.intent} />
                <span>{SOURCE[h.source] ?? h.source}</span>
                <span className="sg-num">{hm(h.minutes)}</span>
                {h.items > 0 && <span className="sg-num">{h.itemsDone}/{h.items} parts</span>}
                {h.dayCompleted && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Icon name="check" size="xs" /> Day complete
                  </span>
                )}
                {h.readiness && (
                  <span className="sg-score" data-b={h.readiness.band} title={h.readiness.name}>
                    {h.readiness.score}
                  </span>
                )}
              </span>
              {h.notes && <span className="sg-note">“{h.notes}”</span>}
            </span>
            <span className="sg-hrow-a">
              <button type="button" className="sg-day-more" onClick={() => toggle(h.sessionId)} aria-pressed={fav[h.sessionId]} aria-label={fav[h.sessionId] ? "Remove from favourites" : "Save as favourite"} style={fav[h.sessionId] ? { color: "var(--accent-ink)" } : undefined}>
                <Icon name="bookmark" size="sm" style={fav[h.sessionId] ? { fill: "currentColor" } : undefined} />
              </button>
            </span>
          </div>
        );
      })}
    </Glass>
  );
}
