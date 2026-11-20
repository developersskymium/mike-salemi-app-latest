"use client";

import { useState, type ReactNode } from "react";
import { useBrowserValue } from "@/lib/hooks/clock";
import type { ShareChannel } from "@ms/api";
import { EmptyScene } from "@/components/graphics";
import { PhotoHero } from "@/components/signature";
import { Button, Glass, Icon, ProgressBar, Ticker, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { logShare } from "@/lib/actions/you";
import type { ReferralsV2 } from "@/lib/loaders/you";
import { fmtDayYear } from "./format";

const CHANNEL: Record<string, string> = { whatsapp: "WhatsApp", email: "Email", x: "X", copy: "Copied link", native: "Share sheet", link: "Link" };

const Glyph: Record<"whatsapp" | "email" | "x", ReactNode> = {
  whatsapp: <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5zm4.6 11.9c-.2.6-1.1 1.1-1.6 1.1-.4.1-.9.1-1.5-.1-.3-.1-.8-.3-1.3-.5-2.3-1-3.8-3.3-3.9-3.5-.1-.1-.9-1.2-.9-2.3s.6-1.6.8-1.9c.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4l.7 1.6c.1.1.1.3 0 .4l-.2.4-.3.4c-.1.1-.2.3-.1.5.1.2.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.2.1.4.1.5-.1l.7-.9c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.1.1.6-.1 1.2z" />,
  email: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
    </>
  ),
  x: <path d="M4.5 4.5h4l11 15h-4zM19.5 4.5l-6.2 7M10.7 12.5l-6.2 7" />,
};

/** Referrals (legacy layout): head, code card with share channels and tier progress, funnel stats, tiers, invite tracking. */
export function ReferralsView({ d }: { d: ReferralsV2 }) {
  const origin = useBrowserValue(() => window.location.origin, "");
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const link = `${origin}/signup?ref=${d.code}`;
  const msg = `I'm training with Mike Salemi — join me: ${link}`;

  const next = d.tiers.find((t) => d.points < t.points);
  const prev = [...d.tiers].reverse().find((t) => d.points >= t.points)?.points ?? 0;
  const tierP = next ? (d.points - prev) / (next.points - prev) : 1;

  const visits = d.events.filter((e) => e.kind === "visit").length;
  const shares = d.events.filter((e) => e.kind === "share").length;
  const signups = d.referrals.length;
  const purchases = d.referrals.filter((r) => r.status === "paid" || r.status === "rewarded").length;

  const track = (c: ShareChannel) => {
    haptic(8);
    void logShare(c);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      track("copy");
      setCopied(true);
      toast("Link copied", { tone: "success", icon: "check" });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast(`Couldn't copy. Your code is ${d.code}`);
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Train with Mike Salemi", text: `${d.firstName} invited you to train with Mike Salemi.`, url: link });
        track("native");
      } catch {
        /* dismissed */
      }
    } else copy();
  };

  const timeline = [
    ...d.events.map((e) => ({ id: `e${e.id}`, at: e.created_at, title: e.kind === "visit" ? "Link visited" : `Shared via ${CHANNEL[e.channel ?? "link"] ?? e.channel}`, pts: 0, icon: e.kind === "visit" ? "compass" : "share" })),
    ...d.referrals.map((r) => ({ id: `s${r.id}`, at: r.created_at, title: "Friend signed up", pts: 0, icon: "people" })),
    ...d.referrals.filter((r) => r.paid_at).map((r) => ({ id: `p${r.id}`, at: r.paid_at!, title: "Friend purchased", pts: 500, icon: "sparkle" })),
  ].sort((a, b) => b.at.localeCompare(a.at)) as { id: string; at: string; title: string; pts: number; icon: "compass" | "share" | "people" | "sparkle" }[];

  return (
    <div className="yu-page">
      <PhotoHero
        image={{ src: "/media/summit/summit-group.jpg", alt: "Men of Movement together on Mount Shasta", focal: "50% 40%", focalPhone: "45% 40%" }}
        scrim="left"
        minHeight={300}
        className="yu-ref-hero"
        as="section"
      >
        <p className="lq-eyebrow yu-ref-hero-eyebrow">Earn a free month</p>
        <h2 className="lq-d-lg">Bring someone up the mountain</h2>
        <p className="lq-lede yu-ref-hero-lede">Share your link. When a friend joins and their first order goes through, a month of Pro is added to your account.</p>
        <ol className="yu-ref-steps">
          <li><b className="lq-num">1</b><span>Share your link</span></li>
          <li><b className="lq-num">2</b><span>{d.firstName ? "Your friend joins" : "A friend joins"}</span></li>
          <li><b className="lq-num">3</b><span>You get 1 month</span></li>
        </ol>
      </PhotoHero>
      <div className="yu-ref-top">
        <Glass as="section" level="thick" className="yu-ref-code" aria-labelledby="yu-code-t">
          <span className="lq-t13 yu-eyebrow" id="yu-code-t">Your code</span>
          <div className="yu-code lq-num" aria-label={d.code.split("").join(" ")}>
            {d.code.split("").map((ch, i) => <span key={i} style={{ animationDelay: `${i * 40}ms` }}>{ch}</span>)}
          </div>
          <div className="lq-t13 lq-c2 yu-ref-link">{origin ? link.replace(/^https?:\/\//, "") : "Generating your link…"}</div>
          <div className="yu-ref-actions">
            <Button icon="share" onClick={share}>Share link</Button>
            <Button variant="fill" state={copied ? "success" : "idle"} onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
          </div>
          <div className="yu-channels" aria-label="Share through">
            <a className="yu-channel" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" onClick={() => track("whatsapp")}>
              <svg viewBox="0 0 24 24" aria-hidden>{Glyph.whatsapp}</svg>WhatsApp
            </a>
            <a className="yu-channel" href={`mailto:?subject=${encodeURIComponent("Train with me")}&body=${encodeURIComponent(msg)}`} onClick={() => track("email")}>
              <svg viewBox="0 0 24 24" aria-hidden>{Glyph.email}</svg>Email
            </a>
            <a className="yu-channel" href={`https://x.com/intent/post?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" onClick={() => track("x")}>
              <svg viewBox="0 0 24 24" aria-hidden>{Glyph.x}</svg>X
            </a>
          </div>
          <div className="yu-ref-points">
            <div className="yu-ref-points-line">
              <span className="lq-t17 lq-num"><b><Ticker value={d.points} /></b> points</span>
              <span className="lq-t13 lq-c2 lq-num">{next ? `${(next.points - d.points).toLocaleString("en-GB")} pts to ${next.reward}` : "Every reward unlocked"}</span>
            </div>
            <ProgressBar value={tierP} tone="accent" label="Progress to the next reward" />
            <p className="lq-t13 lq-c2">When a friend&apos;s first order goes through you also get 30 days of Pro.</p>
          </div>
        </Glass>

        <div className="yu-stack" style={{ gap: 12 }}>
          <div className="yu-funnel" role="list" aria-label="Invite funnel">
            {[
              { label: "Link visits", value: visits, sub: shares ? `${shares} ${shares === 1 ? "share" : "shares"}` : "No shares yet" },
              { label: "Signups", value: signups, sub: visits ? `${Math.round((signups / Math.max(visits, 1)) * 100)}% of visits` : "—" },
              { label: "Purchases", value: purchases, sub: signups ? `${Math.round((purchases / signups) * 100)}% of signups` : "—" },
            ].map((s, i) => (
              <Glass key={s.label} radius="card" className="yu-funnel-step" role="listitem">
                <span className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>{s.label}</span>
                <b className="lq-num"><Ticker value={s.value} /></b>
                <small className="lq-t12 lq-c2">{s.sub}</small>
                {i < 2 && <Icon name="chevron" size="xs" className="yu-funnel-arrow" />}
              </Glass>
            ))}
          </div>

          <Glass as="section" radius="card" className="yu-card" aria-labelledby="yu-tiers">
            <header className="yu-card-head">
              <div>
                <span className="lq-t13 yu-eyebrow">Rewards</span>
                <h2 id="yu-tiers" className="lq-t17">What points unlock</h2>
              </div>
            </header>
            <ol className="yu-tiers">
              {d.tiers.map((t) => {
                const on = d.points >= t.points;
                return (
                  <li key={t.points} data-on={on ? "" : undefined} data-next={t === next ? "" : undefined}>
                    <span className="yu-tier-mark" aria-hidden>{on ? <Icon name="check" size="xs" /> : <Icon name="lock" size="xs" />}</span>
                    <span className="yu-tier-main">
                      <span className="lq-t15" style={{ fontWeight: 600 }}>{t.reward}</span>
                      <span className="lq-t13 lq-c2 lq-num">{on ? "Unlocked" : `${(t.points - d.points).toLocaleString("en-GB")} pts to go`}</span>
                    </span>
                    <span className="lq-t13 lq-c2 lq-num">{t.points.toLocaleString("en-GB")} pts</span>
                  </li>
                );
              })}
            </ol>
          </Glass>
        </div>
      </div>

      <section className="yu-block" aria-labelledby="yu-track">
        <header className="yu-block-head">
          <div>
            <h2 id="yu-track" className="lq-t22">Invite tracking</h2>
            <p className="lq-t15 lq-c2">Every share, visit, signup and purchase from your link.</p>
          </div>
        </header>
        <Glass radius="card" className={timeline.length ? "tpy-list" : undefined}>
          {timeline.length ? (
            timeline.slice(0, 30).map((e) => (
              <div key={e.id} className="tpy-row">
                <span className="tpy-row-icon" aria-hidden><Icon name={e.icon} size="sm" /></span>
                <span className="tpy-row-main">
                  <span className="lq-t15">{e.title}</span>
                  <span className="lq-t13 lq-c2 lq-num">{fmtDayYear(e.at)}</span>
                </span>
                {e.pts > 0 && <span className="lq-t15 lq-num yu-pts">+{e.pts}</span>}
              </div>
            ))
          ) : (
            <div className="yu-empty-card">
              <EmptyScene scene="no-programs" size={150} />
              <p className="lq-t17">Nothing yet</p>
              <p className="lq-t13 lq-c2">Share your link and every visit, signup and purchase shows up here.</p>
            </div>
          )}
        </Glass>
      </section>
    </div>
  );
}
