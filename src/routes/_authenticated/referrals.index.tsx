import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Gift, Share2 } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { SectionHeading } from "@/components/media";
import { AnimatedProgress, CountUp, Reveal } from "@/components/motion-kit";
import { buttonStyles } from "@/components/ui-kit";

import { getReferral, getReferralEvents, recordReferralEvent } from "@/lib/referrals.functions";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/referrals/")({
  head: () => ({
    meta: [
      { title: "Referrals — Kettlebell Lifestyle" },
      { name: "description", content: "Share Kettlebell Lifestyle, earn points and unlock rewards when friends join." },
      { property: "og:title", content: "Referrals — Kettlebell Lifestyle" },
      { property: "og:description", content: "Share your code, earn points, unlock rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReferralsPage,
});

type Referral = { id: string; code: string; points: number; created_at: string };
type ReferralEvent = { id: string; code: string; stage: string; label: string | null; points: number; created_at: string };

const TIERS = [
  { points: 100, reward: "5-Minute Downshift Workshop" },
  { points: 500, reward: "Printable plan bundle" },
  { points: 1000, reward: "Mastering the Kettlebell — Ballistic tier" },
];

const STAGE_LABEL: Record<string, string> = {
  visit: "Link visited",
  signup: "Friend signed up",
  purchase: "Friend purchased",
};

function ReferralsPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const fetchReferral = useServerFn(getReferral);
  const fetchEvents = useServerFn(getReferralEvents);
  const record = useServerFn(recordReferralEvent);
  const [copied, setCopied] = useState(false);

  const { data: referral, isLoading } = useQuery({
    queryKey: ["referral"],
    queryFn: () => fetchReferral() as Promise<Referral>,
    enabled: Boolean(user),
  });

  const { data: events } = useQuery({
    queryKey: ["referral-events"],
    queryFn: () => fetchEvents() as Promise<ReferralEvent[]>,
    enabled: Boolean(user),
  });

  const log = useMutation({
    mutationFn: (input: { stage: "visit" | "signup" | "purchase"; label?: string }) => record({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral"] });
      queryClient.invalidateQueries({ queryKey: ["referral-events"] });
    },
  });

  const link = referral
    ? `${typeof window === "undefined" ? "" : window.location.origin}/?ref=${referral.code}`
    : "";
  const points = referral?.points ?? 0;
  const nextTier = TIERS.find((t) => points < t.points);

  async function share() {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Kettlebell Lifestyle", url: link });
        log.mutate({ stage: "visit", label: "Shared link" });
        return;
      } catch {
        /* dismissed */
      }
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const evts = events ?? [];
  const counts = {
    visit: evts.filter((e) => e.stage === "visit").length,
    signup: evts.filter((e) => e.stage === "signup").length,
    purchase: evts.filter((e) => e.stage === "purchase").length,
  };
  const prevTierPoints = [...TIERS].reverse().find((t) => points >= t.points)?.points ?? 0;
  const tierProgress = nextTier
    ? Math.min(
        100,
        Math.max(0, ((points - prevTierPoints) / (nextTier.points - prevTierPoints)) * 100),
      )
    : 100;

  const shareTargets = link
    ? [
        { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`Train with me on Kettlebell Lifestyle: ${link}`)}` },
        { label: "Email", href: `mailto:?subject=${encodeURIComponent("Train with me")}&body=${encodeURIComponent(`I'm using Kettlebell Lifestyle — join me: ${link}`)}` },
        { label: "X", href: `https://x.com/intent/tweet?text=${encodeURIComponent(`Training with Kettlebell Lifestyle ${link}`)}` },
      ]
    : [];

  return (
    <AppShell>
      <div className="animate-page">
        <PageHead
          eyebrow="Referrals"
          title="Bring someone with you"
          lede="Training holds better when someone else is doing it too. Share your code — you earn points when a friend joins, and more when they commit."
        />

        <Container className="section-tight">
          <Reveal>
            <div className="raise hairline relative overflow-hidden rounded-3xl bg-surface/70 p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
              <p className="eyebrow text-primary">Your code</p>
              <p className="numeric mt-2 text-4xl font-semibold tracking-[0.18em] text-foreground">
                {isLoading ? "…" : referral?.code ?? "—"}
              </p>
              <p className="mt-3 break-all text-xs text-muted-foreground">{link || "Generating your link…"}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={share} disabled={!link} className={buttonStyles.primary}>
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {copied ? "Copied" : "Share link"}
                </button>
                <button
                  type="button"
                  disabled={!link}
                  onClick={async () => {
                    await navigator.clipboard.writeText(referral!.code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                  className={buttonStyles.outline}
                >
                  <Copy className="h-4 w-4" /> Copy code
                </button>
              </div>

              {shareTargets.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {shareTargets.map((t) => (
                    <a
                      key={t.label}
                      href={t.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => log.mutate({ stage: "visit", label: `Shared via ${t.label}` })}
                      className="pressable hairline inline-flex h-9 items-center rounded-full bg-surface/60 px-4 text-xs font-medium text-foreground hover:border-foreground/25"
                    >
                      {t.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </Container>

        <Section tight>
          <Reveal delay={60}>
            <div className="raise-soft hairline rounded-3xl bg-surface/60 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  <CountUp value={points} /> points
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextTier ? `${nextTier.points - points} pts to ${nextTier.reward}` : "Every reward unlocked"}
                </p>
              </div>
              <AnimatedProgress value={tierProgress} className="mt-3" />
            </div>
          </Reveal>
        </Section>

        <Section tight>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Link visits", value: counts.visit },
              { label: "Signups", value: counts.signup },
              { label: "Purchases", value: counts.purchase },
            ].map((tile, i) => (
              <Reveal key={tile.label} delay={i * 70}>
                <div className="raise-soft hairline rounded-3xl bg-surface/60 px-4 py-4 text-center">
                  <p className="text-3xl font-semibold tabular-nums text-foreground">
                    <CountUp value={tile.value} />
                  </p>
                  <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {tile.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section>
          <SectionHeading eyebrow="Rewards" title="What points unlock" />
          <ul className="mt-5 space-y-2">
            {TIERS.map((tier, i) => {
              const unlocked = points >= tier.points;
              return (
                <Reveal key={tier.points} delay={i * 70}>
                  <li
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 transition-colors",
                      unlocked ? "border-primary/35 bg-primary/8" : "border-hairline bg-surface/50",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-xl",
                          unlocked ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                        )}
                      >
                        <Gift className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{tier.reward}</span>
                        <span className="block text-xs text-muted-foreground">
                          {unlocked ? "Unlocked" : `${tier.points - points} pts to go`}
                        </span>
                      </span>
                    </span>
                    <span className="numeric shrink-0 text-xs text-muted-foreground">{tier.points} pts</span>
                  </li>
                </Reveal>
              );
            })}
          </ul>
        </Section>

        <Section>
          <SectionHeading
            eyebrow="Activity"
            title="Invite tracking"
            action={
              <button
                type="button"
                onClick={() => log.mutate({ stage: "signup", label: "Manual entry" })}
                disabled={!referral || log.isPending}
                className={buttonStyles.ghost}
              >
                Log a signup
              </button>
            }
          />
          {evts.length > 0 ? (
            <ul className="mt-5 space-y-2">
              {evts.map((event, i) => (
                <Reveal key={event.id} delay={Math.min(i, 8) * 50}>
                  <li className="hairline flex items-center justify-between gap-4 rounded-2xl bg-surface/50 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {STAGE_LABEL[event.stage] ?? event.stage}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {event.label ? `${event.label} · ` : ""}
                        {new Date(event.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="numeric shrink-0 text-sm font-semibold text-primary">+{event.points}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing yet. Share your link and every visit, signup and purchase shows up here.
            </p>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

