import Link from "next/link";
import type { PassportProgram } from "@ms/api";
import { Button, Glass, Icon, ProgressBar } from "@/components/ui";
import type { PastRun } from "@/lib/loaders/you";
import { fmtDayYear, levelShort, plural } from "./format";

/** Legacy "Progress by level": each level's %, a bar and phase chips ("Phase 1 64%"), then Continue training. */
export function ProgressByLevel({ levels, compact }: { levels: PassportProgram[]; compact?: boolean }) {
  return (
    <Glass as="section" radius="card" className="yu-card" aria-labelledby="yu-pbl">
      <header className="yu-card-head">
        <h2 id="yu-pbl" className="lq-t17">Progress by level</h2>
        {!compact && <span className="lq-t13 lq-c2">{plural(levels.length, "level")}</span>}
      </header>
      {levels.length === 0 ? (
        <p className="lq-t15 lq-c2">No levels started yet. Join a program and its levels show up here.</p>
      ) : (
        <ul className="yu-levels">
          {levels.map((l) => (
            <li key={`${l.program_id}:${l.path_id}`}>
              <div className="yu-level-line">
                <span className="lq-t15" style={{ fontWeight: 600 }}>
                  {l.name}
                  {l.path_name ? <span className="lq-c2" style={{ fontWeight: 400 }}> · {levelShort(l.path_name)}</span> : null}
                </span>
                <span className="lq-t13 lq-c2 lq-num">{l.done}/{l.total} · {l.pct}%</span>
              </div>
              <ProgressBar value={l.pct / 100} tone={l.pct > 0 && l.pct < 100 ? "accent" : "label"} label={`${l.name} ${l.pct}%`} />
              {l.phases.length > 0 && (
                <div className="yu-phase-chips">
                  {l.phases.map((p) => (
                    <span key={p.section_id} className="yu-phase-chip lq-num" data-state={p.pct >= 100 ? "done" : p.pct > 0 ? "now" : undefined} style={{ ["--p" as string]: `${p.pct}%` }}>
                      {p.pct >= 100 && <Icon name="check" size="xs" />}
                      {p.title.replace(/ Phase$/, "")} {p.pct}%
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {levels[0] && (
        <Button variant="glass" size="md" href={`/programs/${levels[0].slug}`} iconAfter="chevron" className="yu-card-cta">
          Continue training
        </Button>
      )}
    </Glass>
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
