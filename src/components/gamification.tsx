import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "@tanstack/react-router";
import {
  Award,
  Calendar,
  Compass,
  Dumbbell,
  Flame,
  Heart,
  Lock,
  Printer,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { badges as allBadges, levelForXp, type Badge } from "@/content/badges";
import { cn } from "@/lib/utils";

const ICONS = {
  flame: Flame,
  target: Target,
  trophy: Trophy,
  sparkles: Sparkles,
  compass: Compass,
  dumbbell: Dumbbell,
  calendar: Calendar,
  heart: Heart,
} as const;

/* ------------------------------------------------------------------ */
/* XP / level                                                          */
/* ------------------------------------------------------------------ */

export function XpBar({ xp }: { xp: number }) {
  const level = levelForXp(xp);
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <p className="truncate text-sm font-semibold text-foreground">{level.name}</p>
        <p className="numeric shrink-0 text-xs text-muted-foreground">{xp.toLocaleString()} XP</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 [transition-timing-function:var(--ease-out-soft)]"
          style={{ width: `${level.percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {level.next ? `${level.toNext.toLocaleString()} XP to ${level.next}` : "Top level reached"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

const TIER_LABEL: Record<string, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

/** Metal treatment per tier, expressed through design tokens only. */
const TIER_RING: Record<string, string> = {
  bronze: "from-[color-mix(in_oklab,var(--clay,#b4552f)_70%,white)] to-[color-mix(in_oklab,var(--clay,#b4552f)_30%,black)]",
  silver: "from-[color-mix(in_oklab,var(--foreground)_25%,white)] to-[color-mix(in_oklab,var(--foreground)_60%,white)]",
  gold: "from-[color-mix(in_oklab,var(--primary)_55%,white)] to-[color-mix(in_oklab,var(--primary)_95%,black)]",
};

export function BadgeMedal({
  badge,
  earned,
  earnedAt,
  onOpen,
}: {
  badge: Badge;
  earned: boolean;
  earnedAt?: string;
  onOpen?: () => void;
}) {
  const Icon = ICONS[badge.icon];
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${badge.name}. ${earned ? "Earned" : "Locked"}. ${badge.description}`}
      className={cn(
        "group tap relative flex flex-col items-center overflow-hidden rounded-2xl border p-4 text-center transition-all duration-500 [transition-timing-function:var(--ease-spring)]",
        earned
          ? "border-hairline bg-elevated hover:-translate-y-0.5"
          : "border-dashed border-border bg-transparent",
      )}
    >
      {/* shine sweep */}
      {earned && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent transition-transform duration-[900ms] group-hover:translate-x-full" />
      )}

      <span
        className={cn(
          "relative grid h-16 w-16 place-items-center rounded-full",
          earned ? "bg-gradient-to-br p-[2px]" : "border border-dashed border-border",
          earned && TIER_RING[badge.tier],
        )}
        style={
          earned && badge.tier === "gold"
            ? { boxShadow: "0 0 0 1px color-mix(in oklab, var(--primary) 30%, transparent), 0 8px 24px -12px var(--primary)" }
            : undefined
        }
      >
        <span
          className={cn(
            "grid h-full w-full place-items-center rounded-full",
            earned ? "bg-surface text-foreground" : "text-muted-foreground",
          )}
        >
          {earned ? (
            <Icon className={cn("h-6 w-6", badge.tier === "gold" && "text-primary")} />
          ) : (
            <Lock className="h-4 w-4" />
          )}
        </span>
      </span>

      <p className={cn("mt-3 text-xs font-semibold", earned ? "text-foreground" : "text-muted-foreground")}>
        {badge.name}
      </p>
      <p className="mt-1 text-[0.6875rem] leading-snug text-muted-foreground">
        {earned && earnedAt
          ? `Earned ${new Date(earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
          : TIER_LABEL[badge.tier]}
      </p>
    </button>
  );
}

export function BadgeGrid({
  earned,
  earnedAt,
}: {
  earned: Set<string>;
  earnedAt?: Record<string, string>;
}) {
  const [open, setOpen] = useState<Badge | null>(null);
  const tiers: Array<Badge["tier"]> = ["gold", "silver", "bronze"];

  return (
    <div className="space-y-6">
      <p className="numeric text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {earned.size} of {allBadges.length} earned
      </p>

      {tiers.map((tier) => {
        const group = allBadges.filter((b) => b.tier === tier);
        if (!group.length) return null;
        return (
          <section key={tier}>
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {TIER_LABEL[tier]}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {group.map((badge) => (
                <BadgeMedal
                  key={badge.id}
                  badge={badge}
                  earned={earned.has(badge.id)}
                  earnedAt={earnedAt?.[badge.id]}
                  onOpen={() => setOpen(badge)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <Sheet open={Boolean(open)} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
          {open && (
            <div className="pb-6 text-center">
              <div className="mx-auto w-28">
                <BadgeMedal badge={open} earned={earned.has(open.id)} earnedAt={earnedAt?.[open.id]} />
              </div>
              <SheetHeader className="mt-4">
                <SheetTitle className="text-center">{open.name}</SheetTitle>
              </SheetHeader>
              <p className="mt-2 text-sm text-muted-foreground">{open.description}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                {earned.has(open.id)
                  ? earnedAt?.[open.id]
                    ? `Unlocked ${new Date(earnedAt[open.id]).toLocaleDateString(undefined, { dateStyle: "long" })}`
                    : "Unlocked"
                  : "Not earned yet"}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Certificates                                                        */
/* ------------------------------------------------------------------ */

export function CertificateCard({
  title,
  issuedAt,
  name,
  courseId,
}: {
  title: string;
  issuedAt: string;
  name: string;
  courseId?: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary">
          <Award className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow text-muted-foreground">Certificate of completion</p>
          <h3 className="mt-1 truncate text-base text-foreground">{title}</h3>
        </div>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        Awarded to <span className="font-semibold text-foreground">{name}</span> on{" "}
        <span className="numeric">{new Date(issuedAt).toLocaleDateString()}</span>.
      </p>
      {courseId && (
        <Link
          to="/certificate/$courseId"
          params={{ courseId }}
          className="tap mt-5 inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
        >
          <Printer className="h-4 w-4" /> View & print
        </Link>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Small stat                                                          */
/* ------------------------------------------------------------------ */

export function MiniStat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="eyebrow truncate">{label}</p>
      </div>
      <p className="numeric mt-3 text-2xl text-foreground">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
