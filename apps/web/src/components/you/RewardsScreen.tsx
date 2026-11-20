import { LevelEmblem, StreakFlame } from "@/components/graphics";
import { AmbientBackdrop, Glass, IconButton, LargeTitle, ProgressBar, StatTile } from "@/components/ui";
import type { RewardsV2 } from "@/lib/loaders/you";
import { PHOTOS } from "@/components/today/photos";
import { CelebrationHost } from "./CelebrationHost";
import { CertificateCard } from "./CertificateCard";
import { fmtDay, plural } from "./format";
import { MedalCabinet, NextMedalCard } from "./MedalCabinet";
import { PastRuns, ProgressByLevel } from "./Progress";
import "@/components/today/tpy.css";
import "./you.css";

const REASON: Record<string, string> = {
  step: "Step complete",
  lesson: "Day complete",
  section: "Phase complete",
  path: "Level complete",
  tool: "Tool result saved",
  referral: "A friend joined",
  badge: "Medal earned",
};

/** How points are earned (matches the database awarder). */
const EARN = [
  { pts: 5, what: "every step" },
  { pts: 50, what: "every day" },
  { pts: 250, what: "every phase" },
  { pts: 1000, what: "every level" },
  { pts: 25, what: "every tool result" },
  { pts: 500, what: "every friend who joins" },
];

/** Rewards: level and points, next medal, the medal cabinet, progress by level, past runs, certificates, points history. */
export function RewardsScreen({ d }: { d: RewardsV2 }) {
  const r = d.rewards;
  const base = (r.level - 1) * 1000;
  const earned = Object.fromEntries(r.badges.map((b) => [b.id, b.earned_at]));
  return (
    <>
      <CelebrationHost />
      <AmbientBackdrop src={PHOTOS.press.src} position={PHOTOS.press.position} fixed />
      <div className="tpy-title">
        <LargeTitle title="Rewards" eyebrow={`${plural(r.badges.length, "medal")} of ${d.badges.length}`} leading={<IconButton icon="back" label="Back to You" href="/you" size="sm" />} />
      </div>
      <div className="yu-page">
        <div className="yu-grid2 yu-rw-top">
          <Glass as="section" radius="card" className="yu-card" aria-label="Level and streak">
            <div className="yu-rw-level">
              <LevelEmblem level={r.level} size={96} />
              <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                <span className="lq-t13 yu-eyebrow">Level {r.level}</span>
                <span className="lq-t28" style={{ fontWeight: 700 }}>{r.level_name}</span>
                <ProgressBar value={(r.points_total - base) / 1000} tone="accent" label="Points to next level" style={{ marginTop: 8 }} />
                <span className="lq-t13 lq-c2 lq-num" style={{ marginTop: 4 }}>{(r.next_level_at - r.points_total).toLocaleString("en-GB")} points to Level {r.level + 1}</span>
              </div>
            </div>
            <div className="yu-rw-stats">
              <StatTile value={r.points_total} label="Points" />
              <StatTile value={r.streak_current} unit=" days" label={<span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>Streak <StreakFlame size={14} lit={r.streak_current > 0} title="" /></span>} />
              <StatTile value={r.streak_best} unit=" days" label="Best streak" />
            </div>
          </Glass>
          <div className="yu-stack" style={{ gap: 12 }}>
            <NextMedalCard badges={d.badges} progress={d.progress} />
            <Glass as="section" radius="card" className="yu-card" aria-labelledby="yu-earn">
              <h2 id="yu-earn" className="lq-t17">How points add up</h2>
              <ul className="yu-earn">
                {EARN.map((e) => (
                  <li key={e.what}>
                    <b className="lq-num">+{e.pts.toLocaleString("en-GB")}</b>
                    <span className="lq-t13 lq-c2">{e.what}</span>
                  </li>
                ))}
              </ul>
              <p className="lq-t13 lq-c2">Every 1,000 points is a new level. Some medals add points of their own.</p>
            </Glass>
          </div>
        </div>

        <section aria-labelledby="yu-cab" className="yu-block">
          <header className="yu-block-head">
            <div>
              <h2 id="yu-cab" className="lq-t22">Medal cabinet</h2>
              <p className="lq-t15 lq-c2">Keep training to unlock the rest. Tap a medal to see how close you are.</p>
            </div>
          </header>
          <MedalCabinet badges={d.badges} progress={d.progress} earned={earned} />
        </section>

        <div className="yu-grid2">
          <ProgressByLevel levels={d.levels} />
          <section className="yu-block" aria-labelledby="yu-pts">
            <h2 id="yu-pts" className="tpy-section-title">Points history</h2>
            <Glass radius="card" className="tpy-list">
              {d.ledger.length ? (
                d.ledger.slice(0, 12).map((l) => (
                  <div key={l.id} className="tpy-row">
                    <span className="tpy-row-main">
                      <span className="lq-t15">{REASON[l.reason] ?? l.reason.replace(/_/g, " ")}</span>
                      <span className="lq-t13 lq-c2 lq-num">{fmtDay(l.created_at)}</span>
                    </span>
                    <span className="lq-t15 lq-num yu-pts" data-neg={l.amount < 0 ? "" : undefined}>{l.amount > 0 ? "+" : ""}{l.amount}</span>
                  </div>
                ))
              ) : (
                <div className="tpy-row">
                  <span className="tpy-row-main" style={{ whiteSpace: "normal" }}>
                    <span className="lq-t15">No points yet</span>
                    <span className="lq-t13 lq-c2" style={{ whiteSpace: "normal" }}>Finish your first step and the first points land here.</span>
                  </span>
                </div>
              )}
            </Glass>
          </section>
        </div>

        <PastRuns runs={d.runs} />

        {d.certificates.length > 0 && (
          <section className="yu-block" aria-labelledby="yu-rw-certs">
            <h2 id="yu-rw-certs" className="lq-t22" style={{ padding: "0 4px" }}>Certificates</h2>
            <div className="yu-cert-grid">
              {d.certificates.map((c) => <CertificateCard key={c.id} c={c} name={d.name} />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
