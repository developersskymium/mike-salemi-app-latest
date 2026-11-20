import { LevelEmblem, StreakFlame } from "@/components/graphics";
import { AmbientBackdrop, Glass, IconButton, LargeTitle, ProgressBar, StatTile } from "@/components/ui";
import type { RewardsData } from "@/lib/loaders/today-plan-you";
import { plural } from "@/components/today/model";
import { PHOTOS } from "@/components/today/photos";
import { MedalCase } from "./MedalCase";
import "@/components/today/tpy.css";

const REASON: Record<string, string> = { referral: "A friend joined", badge: "Medal earned", step: "Step complete", lesson: "Day complete" };
const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso));

export function RewardsScreen({ d }: { d: RewardsData }) {
  const r = d.rewards;
  const base = (r.level - 1) * 1000;
  const earned = Object.fromEntries(r.badges.map((b) => [b.id, b.earned_at]));
  return (
    <>
      <AmbientBackdrop src={PHOTOS.press.src} position={PHOTOS.press.position} fixed />
      <div className="tpy-title">
        <LargeTitle title="Rewards" eyebrow={`${plural(r.badges.length, "medal")} of ${d.badges.length}`} leading={<IconButton icon="back" label="Back to You" href="/you" size="sm" />} />
      </div>
      <div className="tpy-you-grid">
        <Glass as="section" radius="card" className="tpy-pad" aria-label="Level and streak" data-wide="" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <LevelEmblem level={r.level} size={104} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Level {r.level}</div>
              <div className="lq-t28">{r.level_name}</div>
              <ProgressBar value={(r.points_total - base) / 1000} label="Points to next level" style={{ marginTop: 10 }} />
              <div className="lq-t13 lq-c2 lq-num" style={{ marginTop: 6 }}>{(r.next_level_at - r.points_total).toLocaleString("en-GB")} points to level {r.level + 1}</div>
            </div>
          </div>
          <div className="tpy-stats3" style={{ paddingTop: 14, borderTop: "1px solid var(--sep)" }}>
            <StatTile value={r.points_total} label="Points" />
            <StatTile value={r.streak_current} unit=" days" label={<span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>Streak <StreakFlame size={14} lit={r.streak_current > 0} title="" /></span>} />
            <StatTile value={r.streak_best} unit=" days" label="Best streak" />
          </div>
        </Glass>

        <div data-wide="" style={{ display: "grid", gap: 4 }}>
          <MedalCase badges={d.badges} earned={earned} />
        </div>

        <section data-wide="" aria-labelledby="pts-t">
          <h2 id="pts-t" className="tpy-section-title">Points history</h2>
          <Glass radius="card" className="tpy-list">
            {d.ledger.length ? (
              d.ledger.map((l) => (
                <div key={l.id} className="tpy-row">
                  <span className="tpy-row-main"><span className="lq-t15">{REASON[l.reason] ?? l.reason.replace(/_/g, " ")}</span><span className="lq-t13 lq-c2">{when(l.created_at)}</span></span>
                  <span className="lq-t15 lq-num" style={{ fontWeight: 600 }}>{l.amount > 0 ? "+" : ""}{l.amount}</span>
                </div>
              ))
            ) : (
              <div className="tpy-row">
                <span className="tpy-row-main" style={{ whiteSpace: "normal" }}>
                  <span className="lq-t15">No points yet</span>
                  <span className="lq-t13 lq-c2" style={{ whiteSpace: "normal" }}>Points arrive when friends you invite join, and with some medals. Every 1,000 points is a new level.</span>
                </span>
              </div>
            )}
          </Glass>
        </section>
      </div>
    </>
  );
}
