import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import type { PassportPhase } from "@ms/api";
import { Glass, Icon, ProgressBar } from "@/components/ui";
import { coverFor } from "@/lib/covers";
import type { PastRun, YouLevel } from "@/lib/loaders/you";
import { fmtDayYear, levelShort, plural } from "./format";

/** "On Ramp Phase" → "On Ramp", "SINGLE-LEG DEADLIFT" → "Single-Leg Deadlift", double spaces collapsed. */
export function sectionName(raw: string) {
  const t = raw.replace(/\s+/g, " ").trim().replace(/ Phase$/i, "");
  if (/[a-z]/.test(t) || !/[A-Z]/.test(t)) return t;
  const small = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "or", "the", "to"]);
  return t
    .toLowerCase()
    .replace(/[a-z]+/g, (w, i: number) => (i > 0 && small.has(w) ? w : w[0]!.toUpperCase() + w.slice(1)));
}

/** The phase the member is in: the latest one started and not finished, else the first not finished. */
function currentIndex(phases: PassportPhase[]) {
  for (let i = phases.length - 1; i >= 0; i--) if (phases[i]!.done > 0 && phases[i]!.pct < 100) return i;
  return phases.findIndex((p) => p.pct < 100);
}

const stateOf = (p: PassportPhase, i: number, now: number) => (p.pct >= 100 ? "done" : i === now ? "now" : undefined);

/** Few phases (Kettlebell Lifestyle: On Ramp, Phase 1-3) show inline as a segmented bar; more go behind a disclosure. */
const INLINE_MAX = 5;

/** "Your progress": one calm row per program or level, section detail on demand. */
export function ProgressByLevel({ levels, compact }: { levels: YouLevel[]; compact?: boolean }) {
  return (
    <Glass as="section" radius="card" className="yu-card" aria-labelledby="yu-pbl">
      <header className="yu-card-head">
        <h2 id="yu-pbl" className="lq-t17">Your progress</h2>
        {!compact && levels.length > 0 && <span className="lq-t13 lq-c2 lq-num">{plural(levels.length, "program")}</span>}
      </header>
      {levels.length === 0 ? (
        <p className="lq-t15 lq-c2">Nothing started yet. Join a program and your progress shows up here.</p>
      ) : (
        <ul className="yu-prog" role="list">
          {levels.map((l) => (
            <ProgressRow key={`${l.program_id}:${l.path_id}`} l={l} />
          ))}
        </ul>
      )}
    </Glass>
  );
}

function ProgressRow({ l }: { l: YouLevel }) {
  const now = l.done > 0 ? currentIndex(l.phases) : -1;
  const level = levelShort(l.path_name);
  const unit = l.unit === "day" ? "day" : "lesson";
  const href = (l.href ?? `/programs/${l.slug}`) as Route;
  const finished = l.total > 0 && l.done >= l.total;
  const status = finished ? "Complete" : l.done === 0 ? "Not started" : now >= 0 ? `Now: ${sectionName(l.phases[now]!.title)}` : null;
  const inline = l.phases.length > 1 && l.phases.length <= INLINE_MAX;
  const cover = coverFor(l.slug);
  const name = `${l.name}${level ? ` · ${level}` : ""}`;
  const verb = finished ? "Open" : l.done ? "Continue" : "Start";
  return (
    <li className="yu-prog-row">
      <span className="yu-prog-thumb">
        <Image src={cover.src} alt="" fill sizes="40px" style={{ objectFit: "cover", objectPosition: cover.focal }} />
      </span>
      <div className="yu-prog-main">
        <div className="yu-prog-head">
          <span className="yu-prog-name lq-t15">
            {l.name}
            {level ? <span className="lq-c2"> · {level}</span> : null}
          </span>
          {status && <span className="yu-prog-now lq-t13">{status}</span>}
        </div>
        {inline ? (
          <div className="yu-prog-segs" role="progressbar" aria-label={`${name}: ${l.pct}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={l.pct}>
            {l.phases.map((p, i) => (
              <div key={p.section_id} className="yu-prog-seg" data-s={stateOf(p, i, now)}>
                <span className="yu-prog-seg-bar" style={{ ["--p" as string]: `${p.pct}%` }}>
                  <i />
                </span>
                <span className="yu-prog-seg-label lq-t12">{sectionName(p.title)}</span>
              </div>
            ))}
          </div>
        ) : (
          <ProgressBar value={l.pct / 100} size="thin" tone={finished ? "ok" : "label"} label={`${name}: ${l.pct}%`} />
        )}
        <div className="yu-prog-foot lq-t13">
          <span className="lq-c2 lq-num">
            {l.done} of {plural(l.total, unit)} · {l.pct}%
          </span>
          <Link href={href} className="yu-prog-go" aria-label={`${verb} ${name}`}>
            {verb}
            <Icon name="chevron" size="xs" />
          </Link>
        </div>
        {!inline && l.phases.length > 1 && (
          <details className="yu-prog-more">
            <summary className="lq-t13">
              <span className="yu-prog-more-closed">Show {plural(l.phases.length, "section")}</span>
              <span className="yu-prog-more-open">Hide sections</span>
              <Icon name="chevron" size="xs" />
            </summary>
            <ol className="yu-prog-list" role="list">
              {l.phases.map((p, i) => {
                const s = stateOf(p, i, now);
                return (
                  <li key={p.section_id} data-s={s}>
                    <span className="yu-prog-dot" aria-hidden="true">{s === "done" && <Icon name="check" size="xs" />}</span>
                    <span className="yu-prog-list-title">{sectionName(p.title)}</span>
                    {s === "now" && <span className="lq-num lq-c2">{p.done}/{p.total}</span>}
                    <span className="lq-sr">{s === "done" ? "done" : s === "now" ? "in progress" : "not started"}</span>
                  </li>
                );
              })}
            </ol>
          </details>
        )}
      </div>
    </li>
  );
}

/** Legacy "Past runs": runs finished or restarted, grouped by level. Live progress resets; this record never does. */
export function PastRuns({ runs }: { runs: PastRun[] }) {
  if (!runs.length) return null;
  const groups = new Map<string, PastRun[]>();
  for (const r of runs) {
    const k = [r.program_name, levelShort(r.path_name)].filter(Boolean).join(" · ");
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return (
    <section aria-labelledby="yu-runs" className="yu-block">
      <header className="yu-block-head">
        <h2 id="yu-runs" className="lq-t22">Past runs</h2>
        <p className="lq-t15 lq-c2">Runs you finished or restarted. Live progress resets, this record never does.</p>
      </header>
      {[...groups].map(([k, list]) => (
        <div key={k} className="yu-runs-group">
          <h3 className="yu-overline">{k}</h3>
          <Glass radius="card" className="tpy-list">
            {list.map((r) => (
              <div key={r.id} className="tpy-row">
                <span className="yu-run-badge lq-num" data-done={r.completed ? "" : undefined}>{r.completed ? <Icon name="check" size="xs" /> : r.run_number}</span>
                <span className="tpy-row-main">
                  <span className="lq-t15">Run {r.run_number} · {r.completed ? "Completed" : "Restarted"}</span>
                  <span className="lq-t13 lq-c2 lq-num">{r.started_at ? `${fmtDayYear(r.started_at)} – ` : ""}{fmtDayYear(r.archived_at)} · {plural(r.lessons_completed, "day")}, {plural(r.steps_completed, "step")}</span>
                </span>
              </div>
            ))}
          </Glass>
        </div>
      ))}
    </section>
  );
}

export function SeeAll({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="yu-seeall lq-t15">
      {children} <Icon name="chevron" size="xs" />
    </Link>
  );
}
