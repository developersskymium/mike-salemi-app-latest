import Link from "next/link";
import type { ReactNode } from "react";
import { LevelEmblem, Medal, StreakFlame } from "@/components/graphics";
import { AmbientBackdrop, Avatar, Button, Glass, Icon, IconButton, LargeTitle, ProgressBar, Rings, Ticker, type IconName } from "@/components/ui";
import { signOut } from "@/lib/auth/actions";
import type { YouData } from "@/lib/loaders/today-plan-you";
import { lessonHref, plural, splitDayTitle } from "@/components/today/model";
import { PHOTOS } from "@/components/today/photos";
import { medalArt } from "./MedalArt";
import "@/components/today/tpy.css";

const since = (iso: string) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

export function Row({ href, icon, title, detail, trailing, download }: { href: string; icon: IconName; title: string; detail?: ReactNode; trailing?: ReactNode; download?: boolean }) {
  const inner = (
    <>
      <span className="tpy-row-icon" aria-hidden><Icon name={icon} size="sm" /></span>
      <span className="tpy-row-main">
        <span className="lq-t15">{title}</span>
        {detail && <span className="lq-t13 lq-c2">{detail}</span>}
      </span>
      {trailing}
      <Icon name="chevron" size="sm" className="tpy-chev" />
    </>
  );
  return download ? <a className="tpy-row" href={href} download>{inner}</a> : <Link className="tpy-row" href={href}>{inner}</Link>;
}

export function YouScreen({ d }: { d: YouData }) {
  const r = d.rewards;
  const levelBase = (r.level - 1) * 1000;
  const toNext = r.next_level_at - r.points_total;
  const active = d.enrollments.filter((e) => !e.completed_at);
  const finished = d.enrollments.filter((e) => e.completed_at);
  return (
    <>
      <AmbientBackdrop src={PHOTOS.coaching.src} position={PHOTOS.coaching.position} fixed />
      <div className="tpy-title">
        <LargeTitle title="You" trailing={<IconButton icon="settings" label="Settings" href="/you/settings" />} />
      </div>

      <div className="tpy-profile">
        <Avatar name={d.profile.displayName} src={d.profile.avatarUrl} size="xl" variant="glass" />
        <div style={{ minWidth: 0 }}>
          <div className="lq-t22">{d.profile.displayName}</div>
          <div className="lq-t13 lq-c2">{d.profile.email}</div>
          <div className="lq-t13 lq-c2">Member since {since(d.profile.createdAt)}</div>
        </div>
      </div>

      <div className="tpy-you-grid">
        <Link href="/you/rewards" className="tpy-tplbtn" aria-label={`Rewards: level ${r.level}, ${r.level_name}, ${r.points_total} points, ${r.streak_current} day streak, ${plural(r.badges.length, "medal")}`}>
          <Glass radius="card" interactive className="tpy-pad" style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <LevelEmblem level={r.level} size={76} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Level {r.level}</div>
                <div className="lq-t22">{r.level_name}</div>
                <div className="lq-t13 lq-c2 lq-num"><Ticker value={r.points_total} /> points · {toNext.toLocaleString("en-GB")} to level {r.level + 1}</div>
                <ProgressBar value={(r.points_total - levelBase) / 1000} label="Points to next level" style={{ marginTop: 8 }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 12, borderTop: "1px solid var(--sep)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <StreakFlame size={24} lit={r.streak_current > 0} title="" />
                <span className="lq-t17 lq-num">{r.streak_current}</span>
                <span className="lq-t13 lq-c2">day streak</span>
              </span>
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center" }} aria-hidden>
                {r.badges.slice(-4).map((b, i) => (
                  <Medal key={b.id} tier={b.tier} size={34} style={{ marginLeft: i ? -8 : 0 }} title="">{medalArt(b.icon)}</Medal>
                ))}
              </span>
              <span className="lq-t13 lq-c2">{plural(r.badges.length, "medal")}</span>
              <Icon name="chevron" size="sm" className="tpy-chev" />
            </div>
          </Glass>
        </Link>

        <section aria-labelledby="progress-t">
          <h2 id="progress-t" className="tpy-section-title">Progress</h2>
          <Glass radius="card" className="tpy-list">
            {active.length === 0 && finished.length === 0 && (
              <div className="tpy-row"><span className="tpy-row-main"><span className="lq-t15 lq-c2">No programs started yet.</span></span><Button size="sm" variant="fill" href="/programs">Explore</Button></div>
            )}
            {[...active, ...finished].map((e) => {
              const { day } = splitDayTitle(e.current_lesson_title ?? "");
              const p = e.lessons_total ? e.lessons_done / e.lessons_total : 0;
              return (
                <Link key={e.enrollment_id} className="tpy-row" href={e.completed_at ? `/programs/${e.program_slug}` : lessonHref(e.program_slug, e.current_lesson_id)}>
                  <Rings size={40} stroke={5} rings={[{ value: p, tone: 1 }]} label={`${Math.round(p * 100)}% complete`} />
                  <span className="tpy-row-main">
                    <span className="lq-t15" style={{ fontWeight: 600 }}>{e.program_name}</span>
                    <span className="lq-t13 lq-c2 lq-num">
                      {e.path_name ? `${e.path_name.split("·")[0]!.trim()} · ` : ""}
                      {e.completed_at ? "Complete" : `${e.lessons_done} of ${e.lessons_total} done${day ? ` · next Day ${day}` : ""}`}
                    </span>
                  </span>
                  <Icon name="chevron" size="sm" className="tpy-chev" />
                </Link>
              );
            })}
          </Glass>
        </section>

        <section aria-labelledby="certs-t">
          <h2 id="certs-t" className="tpy-section-title">Certificates</h2>
          <Glass radius="card" className="tpy-list">
            {d.certificates.length ? (
              d.certificates.map((c) => (
                <Row key={c.id} href={`/you/certificates/${c.id}`} icon="sparkle" title={`${c.program_name}${c.path_name ? ` · ${c.path_name.split("·")[0]!.trim()}` : ""}`} detail={`Issued ${since(c.issued_at)}`} />
              ))
            ) : (
              <div className="tpy-row">
                <span className="tpy-row-icon" aria-hidden><Icon name="sparkle" size="sm" /></span>
                <span className="tpy-row-main" style={{ whiteSpace: "normal" }}>
                  <span className="lq-t15">Your first certificate</span>
                  <span className="lq-t13 lq-c2" style={{ whiteSpace: "normal" }}>
                    {active[0] ? `Finish ${active[0].path_name?.split("·")[0]?.trim() ?? active[0].program_name} to earn it. ${active[0].lessons_total - active[0].lessons_done} days to go.` : "Complete a program level to earn one."}
                  </span>
                </span>
              </div>
            )}
          </Glass>
        </section>

        <section aria-labelledby="more-t">
          <h2 id="more-t" className="tpy-section-title">Your things</h2>
          <Glass radius="card" className="tpy-list">
            <Row href="/you/saves" icon="bookmark" title="Saves" detail={d.counts.saves + d.counts.toolResults + d.counts.readiness ? [d.counts.saves && plural(d.counts.saves, "video"), d.counts.toolResults && plural(d.counts.toolResults, "tool result"), d.counts.readiness && plural(d.counts.readiness, "readiness check")].filter(Boolean).join(" · ") : "Videos, tool results and readiness"} />
            <Row href="/plan" icon="plan" title="Plan and goal" detail={d.goal ? d.goal.title : "No goal set yet"} />
            <Row href="/you/referrals" icon="share" title="Invite friends" detail={d.counts.referrals ? `${plural(d.counts.referrals, "friend")} joined` : "Share your code"} />
          </Glass>
        </section>

        <section aria-labelledby="acct-t">
          <h2 id="acct-t" className="tpy-section-title">Account</h2>
          <Glass radius="card" className="tpy-list">
            <Row href="/you/settings" icon="settings" title="Settings" detail="Notifications, playback, appearance" />
            <Row href="/you/billing" icon="ring" title="Membership and billing" />
            <Row href="/you/organization" icon="people" title="Organization" />
            <form action={signOut}>
              <button type="submit" className="tpy-row">
                <span className="tpy-row-icon" aria-hidden><Icon name="back" size="sm" /></span>
                <span className="tpy-row-main"><span className="lq-t15">Sign out</span></span>
              </button>
            </form>
          </Glass>
        </section>
      </div>
    </>
  );
}
