"use client";

import { useEffect, useState } from "react";
import { EmptyScene } from "@/components/graphics";
import { Button, Chip, Glass, Icon, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import type { ReferralsData } from "@/lib/loaders/today-plan-you";
import { plural } from "@/components/today/model";
import "@/components/today/tpy.css";

const STATUS: Record<string, string> = { signed_up: "Joined", paid: "Became a member", rewarded: "Rewarded" };
const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

/** Referral code with copy and share, how it works, and who joined. */
export function ReferralsView({ d }: { d: ReferralsData }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/signup?ref=${d.code}`;
  const rewarded = d.referrals.filter((r) => r.status === "rewarded").length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      haptic(10);
      setCopied(true);
      toast("Link copied", { tone: "success", icon: "check" });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Couldn't copy. Your code is " + d.code);
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Train with Mike Salemi", text: `${d.firstName} invited you to train with Mike Salemi.`, url: link });
      } catch {
        /* dismissed */
      }
    } else copy();
  };

  return (
    <div className="tpy-you-grid">
      <Glass as="section" radius="card" className="tpy-pad" aria-labelledby="code-t" style={{ display: "grid", gap: 14, justifyItems: "center", textAlign: "center" }}>
        <h2 id="code-t" className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>Your invite code</h2>
        <div className="tpy-code lq-num" aria-label={d.code.split("").join(" ")}>{d.code}</div>
        <div className="lq-t13 lq-c2" style={{ wordBreak: "break-all" }}>{origin ? link.replace(/^https?:\/\//, "") : " "}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
          <Button icon="share" onClick={share}>Share</Button>
          <Button variant="fill" state={copied ? "success" : "idle"} icon="bookmark" onClick={copy}>{copied ? "Copied" : "Copy link"}</Button>
        </div>
      </Glass>

      <Glass as="section" radius="card" className="tpy-pad" aria-labelledby="how-t">
        <h2 id="how-t" className="lq-t17" style={{ marginBottom: 14 }}>How it works</h2>
        <ol className="tpy-steps3">
          <li><div><div className="lq-t15" style={{ fontWeight: 600 }}>Share your link</div><div className="lq-t13 lq-c2">Your friend signs up with it within 30 days.</div></div></li>
          <li><div><div className="lq-t15" style={{ fontWeight: 600 }}>They become a member</div><div className="lq-t13 lq-c2">Their first paid order counts.</div></div></li>
          <li><div><div className="lq-t15" style={{ fontWeight: 600 }}>You get 30 days of Pro and 500 points</div><div className="lq-t13 lq-c2">Added to your account automatically.</div></div></li>
        </ol>
      </Glass>

      <section aria-labelledby="joined-t" data-wide="">
        <div className="tpy-section-title" style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 id="joined-t">Friends</h2>
          {d.referrals.length > 0 && <span className="lq-num">{plural(d.referrals.length, "friend")} · {rewarded} rewarded</span>}
        </div>
        <Glass radius="card" className={d.referrals.length ? "tpy-list" : undefined}>
          {d.referrals.length ? (
            d.referrals.map((r) => (
              <div key={r.id} className="tpy-row">
                <span className="tpy-row-icon" aria-hidden><Icon name="people" size="sm" /></span>
                <span className="tpy-row-main"><span className="lq-t15">Friend joined</span><span className="lq-t13 lq-c2">{when(r.created_at)}</span></span>
                <Chip variant="fill">{STATUS[r.status] ?? r.status}</Chip>
              </div>
            ))
          ) : (
            <div style={{ display: "grid", justifyItems: "center", gap: 6, padding: "20px 20px 24px", textAlign: "center" }}>
              <EmptyScene scene="no-programs" size={180} />
              <p className="lq-t17">No friends yet</p>
              <p className="lq-t13 lq-c2" style={{ maxWidth: "34ch" }}>When someone signs up with your link, they show up here.</p>
            </div>
          )}
        </Glass>
      </section>
    </div>
  );
}
