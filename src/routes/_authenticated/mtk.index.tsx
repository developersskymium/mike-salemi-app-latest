import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, Check, Dumbbell, Lock, PlayCircle } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { Pill, ProgressRing, SectionHeading } from "@/components/media";
import { buttonStyles } from "@/components/ui-kit";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useProgress } from "@/hooks/use-progress";
import { useSession } from "@/hooks/use-session";
import { MTK_COURSE_ID, mtkModules, mtkTiers, mtkTotalVideos, type MtkTierId } from "@/content/mtk";
import { CheckoutSheet, type CheckoutItem } from "@/components/checkout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mtk/")({
  // Legacy: MTK now lives in the shared database-driven course viewer.
  beforeLoad: () => {
    throw redirect({ to: "/courses/$courseSlug", params: { courseSlug: "mastering-the-kettlebell" }, replace: true });
  },
  head: () => ({
    meta: [
      { title: "Mastering the Kettlebell — Kettlebell Lifestyle" },
      {
        name: "description",
        content:
          "The 11-module kettlebell technique course: swing, clean, snatch, press, jerk, get up, squat, lunge and row broken down frame by frame.",
      },
      { property: "og:title", content: "Mastering the Kettlebell" },
      { property: "og:description", content: "400+ technique videos across 11 modules, taught by Mike Salemi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MtkPage,
});

function MtkPage() {
  const { user } = useSession();
  const { has, get } = useEntitlements();
  const [checkout, setCheckout] = useState<CheckoutItem | null>(null);
  const unlocked = has(MTK_COURSE_ID);
  const tier = (get(MTK_COURSE_ID)?.metadata?.tier as MtkTierId | undefined) ?? "full";
  const { data: progress } = useProgress(Boolean(user));

  const done = new Set((progress ?? []).filter((r) => r.day_id.startsWith("mtk-")).map((r) => r.lesson_id));
  const totalLessons = mtkModules.reduce((sum, m) => sum + m.lessons.length, 0);
  const percent = totalLessons ? Math.round((done.size / totalLessons) * 100) : 0;

  return (
    <AppShell>
      <div className="animate-page">
        <PageHead
          eyebrow={unlocked ? "Your course" : "Technique course"}
          title="Mastering the Kettlebell"
          lede="The deep technical library behind the lifts. Eleven modules, every common error, every variation — the encyclopedia that sits beside your Kettlebell Lifestyle practice."
          meta={`${mtkModules.length} modules · ${mtkTotalVideos}+ videos`}
          actions={
            unlocked ? (
              <Link to="/mtk/$moduleSlug" params={{ moduleSlug: mtkModules[0].slug }} className={buttonStyles.primary}>
                <PlayCircle className="h-4 w-4" /> Continue course
              </Link>
            ) : (
              <a href="#tiers" className={buttonStyles.primary}>
                See access options <ArrowRight className="h-4 w-4" />
              </a>
            )
          }
        />

        {unlocked && (
          <Section tight>
            <div className="steel-card grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl p-5">
              <div className="min-w-0">
                <p className="eyebrow text-primary">Course progress</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {done.size} of {totalLessons} lessons complete
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mtkTiers.find((t) => t.id === tier)?.name ?? "Full Program"} access
                </p>
              </div>
              <ProgressRing percent={percent} size={64} stroke={6} />
            </div>
          </Section>
        )}

        <Section>
          <SectionHeading eyebrow="What's inside" title="The curriculum" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mtkModules.map((module) => {
              const moduleDone = module.lessons.filter((l) => done.has(l.id)).length;
              const open = unlocked && (tier === "full" || module.tier === tier || module.tier === "full");
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
                        open ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {open ? <Dumbbell className="h-4.5 w-4.5" /> : <Lock className="h-4 w-4" />}
                    </span>
                    <Pill>{module.videoCount} videos</Pill>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">{module.title}</h3>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{module.blurb}</p>
                  <p className="mt-4 text-sm font-semibold text-foreground">
                    {open ? (
                      moduleDone ? (
                        <span className="inline-flex items-center gap-1.5 text-primary">
                          <Check className="h-3.5 w-3.5" /> {moduleDone}/{module.lessons.length} done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          Open module <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground">Locked</span>
                    )}
                  </p>
                </>
              );

              return open ? (
                <Link
                  key={module.id}
                  to="/mtk/$moduleSlug"
                  params={{ moduleSlug: module.slug }}
                  className="pressable steel-card flex h-full flex-col rounded-3xl p-5 transition-colors hover:border-primary/40"
                >
                  {inner}
                </Link>
              ) : (
                <div key={module.id} className="steel-card flex h-full flex-col rounded-3xl p-5 opacity-80">
                  {inner}
                </div>
              );
            })}
          </div>
        </Section>

        {!unlocked && (
          <Section>
            <div id="tiers">
              <SectionHeading eyebrow="Access" title="Choose how deep you go" />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {mtkTiers.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "steel-card flex flex-col rounded-3xl p-6",
                    t.featured && "border-primary/40 ring-1 ring-inset ring-primary/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{t.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t.lessonsLabel}</p>
                    </div>
                    <p className="numeric text-xl font-semibold text-foreground">${t.price}</p>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{t.summary}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {t.includes.map((line) => (
                      <li key={line} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() =>
                      setCheckout({
                        productId: MTK_COURSE_ID,
                        kind: "course",
                        name: `Mastering the Kettlebell — ${t.name}`,
                        summary: t.lessonsLabel,
                        variant: t.name,
                        priceCents: t.price * 100,
                        terms: "One-time payment · lifetime access",
                        metadata: { tier: t.id },
                      })
                    }
                    className={cn(t.featured ? buttonStyles.primary : buttonStyles.outline, "mt-6 w-full")}
                  >
                    Get {t.name}
                  </button>
                </div>
              ))}
            </div>
            <Container className="measure mt-6 px-0">
              <p className="text-sm text-muted-foreground">
                One-time payment, lifetime access, backed by a satisfaction guarantee.
              </p>
            </Container>
          </Section>
        )}
      </div>

      <CheckoutSheet item={checkout} onClose={() => setCheckout(null)} />
    </AppShell>
  );
}
