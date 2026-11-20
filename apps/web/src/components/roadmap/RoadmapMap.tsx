"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DAYS_TO_PASS, ROADMAP_PHASES, type NodeInfo, type RoadmapBenchmark, type RoadmapMovement, type RoadmapPhase } from "@ms/core";
import { Button, Icon, Sheet } from "@/components/ui";
import { Clip } from "./Clip";
import { STATE_LABEL, StatePill } from "./NodeStateList";

export type MapMtk = Record<string, { id: string; title: string; minutes: number; href: string; kind: string }[]>;

const initials = (s: string) => s.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/**
 * The Roadmap as a skill tree: four phase lanes (camps on Mike's route), each movement a node in its state
 * colour, the next node marked. A node opens a sheet: Mike's clip looping, this week's practice, the
 * benchmark with its day count, the Mastering the Kettlebell lessons for that lift, and the re-test.
 */
export function RoadmapMap({ movements, benchmarks, nodes, nextKey, current, member, mtk, variants, openKey, unlockHref }: {
  movements: RoadmapMovement[];
  benchmarks: RoadmapBenchmark[];
  nodes: NodeInfo[];
  nextKey: string | null;
  current: RoadmapPhase;
  member: boolean;
  mtk: MapMtk;
  variants: Record<string, "main" | "fallback">;
  openKey?: string | null;
  unlockHref: string;
}) {
  const [open, setOpen] = useState<string | null>(openKey ?? null);
  useEffect(() => {
    const u = new URL(window.location.href);
    if (open) u.searchParams.set("node", open);
    else u.searchParams.delete("node");
    window.history.replaceState(null, "", u);
  }, [open]);
  const node = (k: string) => nodes.find((n) => n.key === k)!;
  const m = open ? movements.find((x) => x.key === open) : null;
  const n = m ? node(m.key) : null;
  const bms = m ? benchmarks.filter((b) => b.movement === m.key) : [];
  const nameOf = (k: string) => movements.find((x) => x.key === k)?.short ?? k;

  return (
    <>
      <section className="rm-map" aria-label="Your Roadmap">
        {ROADMAP_PHASES.map((p) => {
          const ms = movements.filter((x) => x.phase === p.phase).sort((a, b) => a.position - b.position);
          const ns = ms.map((x) => node(x.key));
          const passed = ns.filter((x) => x.state === "passed").length;
          const status = p.phase < current ? "done" : p.phase === current ? "current" : ns.some((x) => x.state !== "locked") ? "opening" : "ahead";
          return (
            <div key={p.phase} className="rm-lane" data-status={status}>
              <div className="rm-lane-head">
                <span className="rm-lane-n lq-dnum" aria-hidden>{p.phase}</span>
                <span className="rm-lane-t">
                  <b className="lq-d-xs">{p.name}</b>
                  <span className="lq-t12 lq-c2">
                    {p.phase === 4 ? (status === "ahead" ? "Opens after Phase 3" : "Open-ended practice") : status === "done" ? "Passed" : `${passed} of ${ms.length} passed`}
                  </span>
                </span>
                {status === "current" && <span className="rm-here">You are here</span>}
              </div>
              <ol className="rm-nodes" style={{ "--n": ms.length } as CSSProperties}>
                {ms.map((x, i) => {
                  const st = node(x.key);
                  const days = st.progress.length ? Math.min(...st.progress.map((q) => q.days)) : 0;
                  const arc = st.state === "passed" ? 1 : st.state === "practising" && x.kind !== "mastery" ? Math.max(days, 0.5) / DAYS_TO_PASS : 0;
                  const isNext = x.key === nextKey;
                  const fb = variants[x.key] === "fallback" && x.fallback;
                  return (
                    <li key={x.key} style={{ "--i": i } as CSSProperties}>
                      <button type="button" className="rm-node" data-state={st.state} data-next={isNext ? "" : undefined} onClick={() => setOpen(x.key)} aria-label={`${x.name}: ${STATE_LABEL[st.state]}${isNext ? ", your next step" : ""}`}>
                        <span className="rm-medal" style={{ "--arc": arc } as CSSProperties}>
                          <span className="rm-medal-in">
                            <Thumb src={x.clip?.thumb ?? null} label={initials(x.short)} />
                          </span>
                          {st.state === "locked" && <span className="rm-medal-lock"><Icon name="lock" size="xs" /></span>}
                          {st.state === "passed" && <span className="rm-medal-ok"><Icon name="check" size="xs" /></span>}
                        </span>
                        <span className="rm-node-t">
                          <b>{fb ? x.fallback!.name : x.short}</b>
                          <small>{isNext ? "Next" : x.kind === "mastery" && st.state === "practising" ? "Mastery" : st.state === "practising" && st.progress.length ? `${days} of ${DAYS_TO_PASS} days` : STATE_LABEL[st.state]}</small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </section>

      <Sheet open={!!m} onClose={() => setOpen(null)} title={m?.name ?? ""} description={m ? `Phase ${m.phase} · ${ROADMAP_PHASES[m.phase - 1]!.name}` : undefined} desktop="side">
        {m && n && (
          <div className="rm-sheet">
            <Clip clip={m.clip} title={m.name} note={m.clipNote} />
            {m.clip && m.clipNote && <p className="lq-t12 lq-c2">{m.clipNote}.</p>}
            <div className="rm-sheet-state">
              <StatePill state={n.state} mastery={m.kind === "mastery"} />
              <span className="lq-t13 lq-c2">{n.why}</span>
            </div>

            <section>
              <h3 className="lq-d-xs">This week</h3>
              <p className="lq-t15">{m.practise}</p>
              {m.fallback && <p className="lq-t13 lq-c2">Fallback: <b>{m.fallback.name}</b>, {m.fallback.when}. It counts as a pass.</p>}
            </section>

            <section className="rm-tracks" aria-label="Session tracks">
              <div data-on={n.state === "learning" ? "" : undefined}><span className="lq-t12">Level I</span><b className="lq-t15">{m.easier}</b></div>
              <div data-on={n.state !== "learning" && n.state !== "locked" ? "" : undefined}><span className="lq-t12">Level II</span><b className="lq-t15">{m.harder}</b></div>
            </section>

            {bms.length > 0 && (
              <section>
                <h3 className="lq-d-xs">Benchmark</h3>
                <ul className="rm-bms">
                  {bms.map((b) => {
                    const d = n.progress.find((p) => p.benchmark === b.key)?.days ?? 0;
                    return (
                      <li key={b.key}>
                        <span className="lq-t15">{b.label}</span>
                        <span className="rm-days" aria-label={`${d} of ${DAYS_TO_PASS} days`}>{Array.from({ length: DAYS_TO_PASS }, (_, i) => <i key={i} data-on={i < d ? "" : undefined} />)}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="lq-t12 lq-c2">Met on {DAYS_TO_PASS} separate days{m.nasal ? ", breathing through your nose" : ""} = passed.</p>
              </section>
            )}

            {m.swingSetup && n.state !== "passed" && (
              <Link href="/tools/swing-setup" className="rm-handoff">
                <Icon name="video" size="sm" />
                <span><b className="lq-t15">Swing Set-Up Coach first</b><span className="lq-t13 lq-c2">Check your hinge and set-up before you swing.</span></span>
                <Icon name="chevron" size="xs" />
              </Link>
            )}

            {(mtk[m.key]?.length ?? 0) > 0 && (
              <section>
                <h3 className="lq-d-xs">{n.state === "practising" ? "Stuck? Go deeper" : "Deeper instruction"}</h3>
                <ul className="rm-lessons">
                  {mtk[m.key]!.map((l) => (
                    <li key={l.id}>
                      <Link href={l.href}><Icon name="play" size="xs" /><span className="lq-t15">{l.title}</span><span className="lq-t12 lq-c2">{l.kind} · {l.minutes} min · Mastering the Kettlebell</span></Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="rm-sheet-foot">
              {n.state === "locked" ? (
                <p className="lq-t13 lq-c2">{m.unlockAfter.length ? `Pass ${m.unlockAfter.map(nameOf).join(" and ")} to open this.` : n.why}</p>
              ) : bms.length === 0 ? (
                <p className="lq-t13 lq-c2">Phase 4 has no benchmarks: vary the weight, the rest and the reps to suit your goal.</p>
              ) : member ? (
                <Button variant={n.state === "passed" ? "glass" : "filled"} size="lg" block href={`/tools/roadmap/retest/${m.key}`} iconAfter="arrowRight">{n.state === "passed" ? "Test it again" : "Re-test this benchmark"}</Button>
              ) : (
                <>
                  <Button variant="filled" size="lg" block href={unlockHref} icon="lock">Unlock re-tests and sessions</Button>
                  <p className="lq-t12 lq-c2">The test and the map are free. Re-tests and phase sessions come with any plan or program.</p>
                </>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

/** A node's thumbnail: one frame of Mike's clip, or the lift's initials if there's no clip (or it can't load). */
function Thumb({ src, label }: { src: string | null; label: string }) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setBroken(true);
  }, []);
  if (!src || broken) return <span className="rm-medal-ini">{label}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt="" loading="lazy" onError={() => setBroken(true)} />;
}
