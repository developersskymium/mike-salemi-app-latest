import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyScene, ReadinessDial } from "@/components/graphics";
import { AmbientBackdrop, Glass, Icon, IconButton, LargeTitle, type IconName } from "@/components/ui";
import { signOut } from "@/lib/auth/actions";
import type { PassportData } from "@/lib/loaders/you";
import { PHOTOS } from "@/components/today/photos";
import { CelebrationHost } from "./CelebrationHost";
import { CertificateCard, CertificateTeaser } from "./CertificateCard";
import { DetailsCard } from "./DetailsCard";
import { fmtDayYear, money, plural, splitDay } from "./format";
import { MedalCabinet, NextMedalCard } from "./MedalCabinet";
import { PassportHeader } from "./Passport";
import { PastRuns, ProgressByLevel, SeeAll } from "./Progress";
import { TrainingInsights } from "./TrainingInsights";
import { YouTabs, type YouTab } from "./YouTabs";
import "@/components/today/tpy.css";
import "./you.css";

export function Row({ href, icon, title, detail, trailing }: { href: string; icon: IconName; title: string; detail?: ReactNode; trailing?: ReactNode }) {
  return (
    <Link className="tpy-row" href={href}>
      <span className="tpy-row-icon" aria-hidden><Icon name={icon} size="sm" /></span>
      <span className="tpy-row-main">
        <span className="lq-t15">{title}</span>
        {detail && <span className="lq-t13 lq-c2">{detail}</span>}
      </span>
      {trailing}
      <Icon name="chevron" size="sm" className="tpy-chev" />
    </Link>
  );
}

function Thing({ href, icon, title, detail, badge, tone }: { href: string; icon: IconName; title: string; detail?: ReactNode; badge?: string; tone?: "warm" }) {
  return (
    <li>
      <Link href={href} className="yu-thing lq-press">
        <span className="yu-thing-ic" data-tone={tone} aria-hidden><Icon name={icon} size="sm" /></span>
        <span className="yu-thing-main">
          <span className="lq-t15 yu-thing-title">
            {title}
            {badge && <span className="yu-thing-badge lq-t11">{badge}</span>}
          </span>
          {detail && <span className="lq-t13 lq-c2 yu-thing-detail">{detail}</span>}
        </span>
        <Icon name="chevron" size="sm" className="lq-c3" />
      </Link>
    </li>
  );
}

function BlockHead({ id, title, lede, action }: { id: string; title: string; lede?: string; action?: ReactNode }) {
  return (
    <header className="yu-block-head">
      <div>
        <h2 id={id} className="lq-t22">{title}</h2>
        {lede && <p className="lq-t15 lq-c2">{lede}</p>}
      </div>
      {action}
    </header>
  );
}

/** You: the training passport header, then the legacy account tabs. */
export function YouScreen({ d, tab, shop = { enabled: false, isAdmin: false } }: { d: PassportData; tab: YouTab; shop?: { enabled: boolean; isAdmin: boolean } }) {
  const active = [...d.enrollments].filter((e) => !e.completed_at).sort((a, b) => (b.last_active_at ?? "").localeCompare(a.last_active_at ?? ""))[0];
  const earned = Object.fromEntries(d.rewards.badges.map((b) => [b.id, b.earned_at]));
  const s = d.saves;
  const savesCount = s.videos.length + s.tools.length + s.plans.length;

  const overview = (
    <div className="yu-stack">
      <div className="yu-grid2">
        <DetailsCard name={d.profile.displayName} email={d.profile.email} level={active?.path_name ? `${active.path_name.replace("·", "—")}` : null} />
        <ProgressByLevel levels={d.stats.programs} />
      </div>
      <section aria-labelledby="yu-things" className="yu-block">
        <BlockHead id="yu-things" title="Your things" lede="Everything you've saved, earned and set up, one tap away." />
        <ul className="yu-things" role="list">
          <Thing href="/you/saves" icon="bookmark" title="Saves" detail={savesCount ? [s.plans.length && plural(s.plans.length, "session plan"), s.tools.length && plural(s.tools.length, "tool result"), s.videos.length && plural(s.videos.length, "video")].filter(Boolean).join(" · ") : "Session plans, tool results and videos"} />
          <Thing href="/you/rewards" icon="medal" tone="warm" title="Rewards" detail={`${plural(d.rewards.badges.length, "medal")} · ${d.rewards.points_total.toLocaleString("en-GB")} points`} />
          <Thing href="/you?tab=achievements" icon="trophy" tone="warm" title="Certificates" detail={d.certificates.length ? plural(d.certificates.length, "certificate") : "Finish a level to earn one"} />
          <Thing href="/you/referrals" icon="gift" title="Referrals" badge="Earn a free month" detail={d.referrals ? `${plural(d.referrals, "friend")} joined` : "Invite a friend to train with you"} />
          <Thing href="/you/settings#notifications" icon="bell" title="Notifications" detail="Reminders, quiet hours, channels" />
          <Thing href="/you/settings" icon="settings" title="Settings" detail="Profile, playback, appearance" />
          <Thing href="/you/billing" icon="ring" title="Membership and billing" detail="Plan, invoices, payment method" />
          <Thing href="/you/organization" icon="people" title="Organization" detail="Your team or gym" />
          {(shop.enabled || shop.isAdmin) && <Thing href="/shop" icon="shop" title="Shop" badge={shop.enabled ? undefined : "Admin preview"} detail="Equipment, plans and orders" />}
        </ul>
        <form action={signOut} className="yu-signout">
          <button type="submit" className="lq-t15 yu-signout-btn">
            <Icon name="logout" size="sm" /> Sign out
          </button>
        </form>
      </section>
    </div>
  );

  const achievements = (
    <div className="yu-stack">
      <section aria-labelledby="yu-badges" className="yu-block">
        <BlockHead id="yu-badges" title="Badges" lede="Keep training to unlock the rest." action={<SeeAll href="/you/rewards">Medal cabinet</SeeAll>} />
        <NextMedalCard badges={d.badges} progress={d.progress} />
        <MedalCabinet badges={d.badges} progress={d.progress} earned={earned} compact />
      </section>
      <PastRuns runs={d.runs} />
      <section aria-labelledby="yu-certs" className="yu-block">
        <BlockHead id="yu-certs" title="Certificates" lede="Engraved, signed and verifiable: anyone can scan the code to check it." />
        <div className="yu-cert-grid">
          {d.certificates.length ? d.certificates.map((c) => <CertificateCard key={c.id} c={c} name={d.profile.displayName} />) : <CertificateTeaser active={active} name={d.profile.displayName} />}
        </div>
      </section>
    </div>
  );

  const history = (
    <div className="yu-stack">
      <section aria-labelledby="yu-orders" className="yu-block">
        <BlockHead id="yu-orders" title="Orders" lede="Everything you've bought or unlocked." action={<SeeAll href="/you/billing">Billing</SeeAll>} />
        <Glass radius="card" className="tpy-list">
          {d.orders.length ? (
            d.orders.slice(0, 6).map((o) => (
              <Link key={o.id} href="/you/billing" className="tpy-row">
                <span className="tpy-row-icon" aria-hidden><Icon name={o.items.some((i) => i.kind === "product") ? "bookmark" : "ring"} size="sm" /></span>
                <span className="tpy-row-main">
                  <span className="lq-t15">{o.items.map((i) => i.name).join(", ") || o.reference}</span>
                  <span className="lq-t13 lq-c2 lq-num">{fmtDayYear(o.created_at)} · {o.status === "paid" ? "Paid" : o.status === "refunded" ? "Refunded" : o.status}</span>
                </span>
                <span className="lq-t15 lq-num" style={{ fontWeight: 600 }}>{o.total_cents ? money(o.total_cents, o.currency) : "Free"}</span>
              </Link>
            ))
          ) : (
            <div className="tpy-row"><span className="tpy-row-main"><span className="lq-t15 lq-c2">No orders yet.</span></span><Link href="/shop" className="yu-seeall lq-t15">Shop <Icon name="chevron" size="xs" /></Link></div>
          )}
        </Glass>
      </section>

      <section aria-labelledby="yu-insights" className="yu-block">
        <BlockHead id="yu-insights" title="Training insights" lede="Read from every session you log and every day you finish: time, rhythm and readiness over time." />
        <TrainingInsights stats={d.stats} plans={s.plans} source={d.statsSource} />
      </section>

      <div className="yu-grid2">
        <section aria-labelledby="yu-assess" className="yu-block">
          <BlockHead id="yu-assess" title="Saved assessments" action={s.tools.length ? <SeeAll href="/you/saves?kind=tools">All</SeeAll> : undefined} />
          {s.tools.length ? (
            <Glass radius="card" className="tpy-list">
              {s.tools.slice(0, 5).map((t) => (
                <Link key={t.id} href={`/you/saves?kind=tools&open=${t.id}`} className="tpy-row">
                  <span className="tpy-row-icon" aria-hidden><Icon name="compass" size="sm" /></span>
                  <span className="tpy-row-main">
                    <span className="lq-t15" style={{ fontWeight: 600 }}>{t.title}</span>
                    <span className="lq-t13 lq-c2">{t.tool_name}</span>
                  </span>
                  <span className="lq-t13 lq-c2 lq-num">{fmtDayYear(t.created_at)}</span>
                </Link>
              ))}
            </Glass>
          ) : (
            <Glass radius="card" className="yu-empty-card">
              <EmptyScene scene="nothing-saved" size={120} />
              <p className="lq-t17">No saved results</p>
              <p className="lq-t13 lq-c2">Run an assessment and save it to build your history.</p>
              <Link href="/tools" className="yu-seeall lq-t15">Open the tools <Icon name="chevron" size="xs" /></Link>
            </Glass>
          )}
        </section>
        <section aria-labelledby="yu-tables" className="yu-block">
          <BlockHead id="yu-tables" title="Workout tables" action={s.plans.length ? <SeeAll href="/you/saves?kind=plans">All</SeeAll> : undefined} />
          {s.plans.length ? (
            <Glass radius="card" className="tpy-list">
              {s.plans.slice(0, 5).map((p) => {
                const day = splitDay(p.lesson_title);
                return (
                  <Link key={p.id} href={`/you/saves?kind=plans&open=${p.id}`} className="tpy-row">
                    <ReadinessDial score={Math.max(0, 60 - p.score)} band={p.band as "green" | "amber" | "red"} size={44} bare animated={false} />
                    <span className="tpy-row-main">
                      <span className="lq-t15" style={{ fontWeight: 600 }}>{day.day ? `Day ${day.day} · ${day.title}` : p.lesson_title}</span>
                      <span className="lq-t13 lq-c2">{[p.section_title, p.band_name].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="lq-t13 lq-c2 lq-num">{fmtDayYear(p.created_at)}</span>
                  </Link>
                );
              })}
            </Glass>
          ) : (
            <Glass radius="card" className="yu-empty-card">
              <EmptyScene scene="plan-empty" size={120} />
              <p className="lq-t17">No workout tables yet</p>
              <p className="lq-t13 lq-c2">Complete a workout day&apos;s check-in and your table is saved here.</p>
            </Glass>
          )}
        </section>
      </div>
    </div>
  );

  return (
    <>
      <CelebrationHost />
      <AmbientBackdrop src={PHOTOS.coaching.src} position={PHOTOS.coaching.position} fixed />
      <div className="tpy-title">
        <LargeTitle title="You" trailing={<IconButton icon="settings" label="Settings" href="/you/settings" />} />
      </div>
      <div className="yu-page">
        <PassportHeader d={d} />
        <YouTabs initial={tab} panels={{ overview, achievements, history }} />
      </div>
    </>
  );
}
