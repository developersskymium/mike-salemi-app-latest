import Link from "next/link";
import { Icon } from "@/components/ui";
import type { JournalEntry, Lift, StretchEntry } from "@/lib/loaders/you-extras";
import "./you-calm.css";

const day = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));

/** Strength log per main lift: where you started, where you are ("Up 8 kg since you started"). */
export function StrengthLog({ lifts }: { lifts: Lift[] }) {
  return (
    <section className="yc-card" aria-labelledby="yc-str">
      <header className="yc-h">
        <h2 id="yc-str" className="lq-d-xs">Strength log</h2>
        <span className="lq-t13 lq-c3">Main lifts</span>
      </header>
      {lifts.length ? (
        <ul className="yc-lifts" role="list">
          {lifts.slice(0, 6).map((l) => {
            const up = l.best.kg - l.first.kg;
            return (
              <li key={l.lift}>
                <b className="yc-lift-n">{l.lift}</b>
                <span className="yc-lift-kg lq-num">
                  {l.last.kg}
                  <small> kg</small>
                </span>
                <span className="lq-t13 yc-lift-up" data-up={up > 0 ? "" : undefined}>
                  {up > 0 ? `Up ${up} kg since you started` : `Since ${day(l.first.at)}`}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="lq-t13 lq-c2 yc-empty">Log the bell you used in a workout and your lifts show up here.</p>
      )}
    </section>
  );
}

const TIPS: Record<string, string> = {
  "Toe touch": "Hamstrings: two minutes of hinge-and-reach before you swing.",
  "Deep squat": "Hips: sit in a goblet squat, 3 × 30 seconds at the bottom.",
  "Overhead reach": "Shoulders: wall slides and halos, 10 of each.",
  Ankle: "Ankles: knee-to-wall rocks, 15 each side.",
  "T-spine rotation": "Upper back: open books, 8 each side, every day.",
};

/** Stretch Test history (score over time) and a tip for the weakest area of the latest test. */
export function StretchHistory({ list }: { list: StretchEntry[] }) {
  const last = list[0];
  const weakest = last?.tests.length ? [...last.tests].sort((a, z) => a.score / a.max - z.score / z.max)[0] : null;
  const first = list.at(-1);
  return (
    <section className="yc-card" aria-labelledby="yc-st">
      <header className="yc-h">
        <h2 id="yc-st" className="lq-d-xs">Stretch Test</h2>
        <Link href="/tools/stretch-test" className="lq-link lq-t13">{last ? "Retake" : "Take it"} <Icon name="arrowRight" size="xs" /></Link>
      </header>
      {last ? (
        <>
          <div className="yc-st-now">
            <span className="lq-dnum yc-st-score">{last.score}<small>/{last.max}</small></span>
            <span className="lq-t13 lq-c2">{last.title}{first && first !== last ? ` · ${last.score - first.score >= 0 ? "+" : ""}${last.score - first.score} since ${day(first.at)}` : ""}</span>
          </div>
          <ol className="yc-st-hist" aria-label="Scores over time">
            {[...list].reverse().map((s) => (
              <li key={s.id}>
                <span className="yc-st-bar" style={{ ["--h" as string]: `${Math.max(8, (s.score / s.max) * 100)}%` }} aria-hidden />
                <small className="lq-num">{day(s.at)}</small>
                <span className="lq-sr">{s.score} of {s.max}</span>
              </li>
            ))}
          </ol>
          {weakest && (
            <p className="yc-tip lq-t13">
              <b>Work on: {weakest.label}.</b> {TIPS[weakest.label] ?? "Give it ten minutes before each session."}
            </p>
          )}
        </>
      ) : (
        <p className="lq-t13 lq-c2 yc-empty">Five quick tests. See where you&apos;re tight and get one thing to work on.</p>
      )}
    </section>
  );
}

/** Journal: reflections and session notes, newest first. */
export function Journal({ entries }: { entries: JournalEntry[] }) {
  return (
    <section className="yc-card" aria-labelledby="yc-jr">
      <header className="yc-h">
        <h2 id="yc-jr" className="lq-d-xs">Journal</h2>
        <span className="lq-t13 lq-c3">{entries.length ? `${entries.length} entries` : "Reflections and notes"}</span>
      </header>
      {entries.length ? (
        <ul className="yc-journal" role="list">
          {entries.slice(0, 6).map((e) => {
            const inner = (
              <>
                <span className="lq-t12 lq-c3">
                  {day(e.at)} · {e.title}
                </span>
                <span className="lq-serif yc-jr-body">{e.body}</span>
              </>
            );
            return <li key={e.id}>{e.href ? <Link href={e.href} className="yc-jr-item">{inner}</Link> : <div className="yc-jr-item">{inner}</div>}</li>;
          })}
        </ul>
      ) : (
        <p className="lq-t13 lq-c2 yc-empty">Notes you write on a day or after a session collect here.</p>
      )}
    </section>
  );
}

/** Saved lists: session plans, tool results and videos, one tap each. */
export function SavedLists({ plans, tools, videos }: { plans: number; tools: number; videos: number }) {
  const rows = [
    { href: "/you/saves?kind=videos", label: "Saved videos", n: videos, icon: "bookmark" as const },
    { href: "/you/saves?kind=plans", label: "Workout tables", n: plans, icon: "clipboard" as const },
    { href: "/you/saves?kind=tools", label: "Tool results", n: tools, icon: "compass" as const },
  ];
  return (
    <section className="yc-card" aria-labelledby="yc-sv">
      <header className="yc-h">
        <h2 id="yc-sv" className="lq-d-xs">Saved</h2>
        <Link href="/you/saves" className="lq-link lq-t13">All <Icon name="arrowRight" size="xs" /></Link>
      </header>
      <ul className="yc-saved" role="list">
        {rows.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="yc-saved-row">
              <Icon name={r.icon} size="sm" />
              <span>{r.label}</span>
              <b className="lq-num">{r.n}</b>
              <Icon name="chevron" size="xs" className="lq-c3" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

