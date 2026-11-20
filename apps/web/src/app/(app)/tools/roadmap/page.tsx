import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DAYS_TO_PASS, ROADMAP_PHASES, buildPhaseSession } from "@ms/core";
import { Clip } from "@/components/roadmap/Clip";
import { RoadmapMap } from "@/components/roadmap/RoadmapMap";
import { StatePill } from "@/components/roadmap/NodeStateList";
import { Button, EmptyState, Icon } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { unlockHref } from "@/lib/access";
import { loadRoadmap } from "@/lib/loaders/roadmap";
import "@/components/roadmap/roadmap.css";

export const metadata: Metadata = {
  title: "Kettlebell Roadmap Coach",
  description: "Find your phase by testing Mike's own benchmarks, then work the lifts that move you up.",
};

type Props = { searchParams: Promise<{ node?: string }> };

/** Tool home: the intro and the test when there's no placement yet; the Roadmap map once there is. */
export default async function RoadmapPage({ searchParams }: Props) {
  const [sp, v] = await Promise.all([searchParams, loadRoadmap().catch(() => null)]);
  if (!v)
    return (
      <EmptyState title="The Roadmap didn't load" body="Check your connection and try again." illustration={<EmptyScene scene="offline" size={160} />}
        action={<Button variant="glass" size="md" href="/tools/roadmap">Try again</Button>} />
    );
  const unlock = unlockHref("kettlebell-lifestyle", "tool:roadmap");

  if (!v.placement) return <Intro movements={v.movements} />;

  const meta = ROADMAP_PHASES[v.phase - 1]!;
  const next = v.next ? v.movements.find((m) => m.key === v.next!.key) ?? null : null;
  const session = buildPhaseSession(v, v.nodes, v.readiness);
  const nextDays = v.next?.progress.length ? Math.min(...v.next.progress.map((p) => p.days)) : 0;
  return (
    <div className="rm-page">
      <header className="rm-head">
        <div className="rm-head-t">
          <p className="lq-eyebrow" data-tone="accent">Kettlebell Roadmap</p>
          <h1 className="lq-d-xl">Phase {v.phase}: {meta.name}</h1>
          <p className="lq-lede lq-c2">{v.summary}</p>
        </div>
        <div className="rm-head-act">
          {v.member ? (
            <Button variant="filled" size="lg" icon="play" href="/tools/roadmap/session">{session.recovery ? "Start recovery session" : `Start today's session · ${Math.round(session.totalSeconds / 60)} min`}</Button>
          ) : (
            <Button variant="filled" size="lg" icon="lock" href={unlock}>Unlock phase sessions</Button>
          )}
          <Button variant="ghost" size="md" href="/tools/roadmap/test">Retake the test</Button>
        </div>
      </header>

      {next && v.next && (
        <section className="rm-next rm-raised" aria-label="Your next step">
          <div className="rm-next-clip"><Clip clip={next.clip} title={next.name} note={next.clipNote} /></div>
          <div className="rm-next-body">
            <span className="rm-tag">Next on your Roadmap</span>
            <h2 className="lq-d-md">{v.variants[next.key] === "fallback" && next.fallback ? next.fallback.name : next.name}</h2>
            <div className="rm-next-state">
              <StatePill state={v.next.state} />
              <span className="rm-days rm-days-lg" aria-label={`${nextDays} of ${DAYS_TO_PASS} days met`}>{Array.from({ length: DAYS_TO_PASS }, (_, i) => <i key={i} data-on={i < nextDays ? "" : undefined} />)}</span>
              <span className="lq-t13 lq-c2">{v.next.why}</span>
            </div>
            <p className="lq-t15">{next.practise}</p>
            <div className="rm-row">
              {v.member ? (
                <Button variant="warm" size="md" href={`/tools/roadmap/retest/${next.key}`} iconAfter="arrowRight">Re-test {next.short.toLowerCase()}</Button>
              ) : (
                <Button variant="warm" size="md" href={unlock} icon="lock">Unlock re-tests</Button>
              )}
              <Button variant="glass" size="md" href={`/tools/roadmap?node=${next.key}`}>Open</Button>
              {next.swingSetup && <Button variant="ghost" size="md" href="/tools/swing-setup" icon="video">Swing Set-Up Coach</Button>}
            </div>
          </div>
        </section>
      )}

      {v.readiness === "recovery" || v.readiness === "rest" ? (
        <p className="rm-note"><Icon name="leaf" size="sm" /> Today's readiness check said recover: your session is breath and decompression only.</p>
      ) : null}

      <RoadmapMap
        movements={v.movements}
        benchmarks={v.benchmarks}
        nodes={v.nodes}
        nextKey={v.next?.key ?? null}
        current={v.phase}
        member={v.member}
        mtk={v.mtk}
        variants={v.variants}
        openKey={sp.node && v.movements.some((m) => m.key === sp.node) ? sp.node : null}
        unlockHref={unlock}
      />

      <div className="rm-legend" aria-label="Legend">
        {(["learning", "practising", "passed", "locked"] as const).map((s) => <StatePill key={s} state={s} />)}
        <span className="lq-t12 lq-c2">A movement passes when its benchmark is met on {DAYS_TO_PASS} separate days.</span>
      </div>

      <section className="rm-after">
        <Link href={`/programs/${v.handoff.slug}${v.handoff.path ? `?path=${v.handoff.path}` : ""}`} className="rm-handoff rm-handoff-lg">
          <span className="rm-handoff-photo"><Image src="/media/summit/mike-press.jpg" alt="" fill sizes="120px" style={{ objectFit: "cover", objectPosition: "50% 25%" }} /></span>
          <span>
            <span className="lq-t12 lq-c2">Train your phase, day by day</span>
            <b className="lq-d-sm">{v.handoff.label}</b>
            <span className="lq-t13 lq-c2">{v.phase <= 2 ? "Phases 1 and 2 build exactly what Level I teaches." : v.phase === 3 ? "Phase 3 lifters are ready for Level II." : "Refine every lift: pre-check, technique, errors, variations."}</span>
          </span>
          <Icon name="chevron" size="sm" />
        </Link>
        <p className="lq-t12 lq-c2">Placed {new Date(v.placement.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. Benchmarks are counted by you and the app; quality standards are drafts until Mike signs them off.</p>
      </section>
    </div>
  );
}

function Intro({ movements }: { movements: { key: string; phase: number; short: string }[] }) {
  return (
    <div className="rm-page">
      <section className="rm-intro rm-raised">
        <div className="rm-intro-t">
          <p className="lq-eyebrow" data-tone="accent">Kettlebell Roadmap Coach</p>
          <h1 className="lq-d-xxl">Find your phase</h1>
          <p className="lq-lede lq-c2">Mike's Roadmap has four phases. Instead of guessing, test his own benchmarks: the app counts your reps and times your rest, and places you where your body actually is.</p>
          <ul className="rm-intro-facts">
            <li><b className="lq-dnum">15–20</b><span className="lq-t13 lq-c2">minutes</span></li>
            <li><b className="lq-dnum">3</b><span className="lq-t13 lq-c2">questions first</span></li>
            <li><b className="lq-dnum">2</b><span className="lq-t13 lq-c2">bells: light and moderate</span></li>
          </ul>
          <div className="rm-row">
            <Button variant="filled" size="lg" href="/tools/roadmap/test" iconAfter="arrowRight">Start the test</Button>
            <span className="lq-t13 lq-c2">Free with your account</span>
          </div>
        </div>
        <div className="rm-intro-photo">
          <Image src="/media/summit/mike-getup.jpg" alt="Mike Salemi in a Turkish get-up" fill priority sizes="(min-width: 1024px) 520px, 100vw" style={{ objectFit: "cover", objectPosition: "55% 35%" }} />
        </div>
      </section>

      <section className="rm-phases" aria-label="The four phases">
        {ROADMAP_PHASES.map((p) => (
          <article key={p.phase} className="rm-phase">
            <span className="rm-lane-n lq-dnum" aria-hidden>{p.phase}</span>
            <h2 className="lq-d-sm">{p.name}</h2>
            <p className="lq-t13 lq-c2">{p.theme}</p>
            <ul>{movements.filter((m) => m.phase === p.phase).map((m) => <li key={m.key} className="lq-t13">{m.short}</li>)}</ul>
          </article>
        ))}
      </section>

      <p className="rm-note"><Icon name="heart" size="sm" /> Testing starts one phase below your guess and bodyweight comes before the bell. Pain or dizziness stops it at any time; with an injury, we skip the test and start you gently.</p>
    </div>
  );
}
