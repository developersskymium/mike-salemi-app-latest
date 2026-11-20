import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Lock, PlayCircle, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui-kit";
import {
  useJoinProgram,
  type HomeItem,
  type ProgramTarget,
} from "@/hooks/use-home-programs";
import { cn } from "@/lib/utils";

/** Link to a program target: a course lesson or a KBL day. */
export function ProgramLink({
  target,
  className,
  children,
  onClick,
}: {
  target: ProgramTarget;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  if (target.kind === "kbl") {
    return (
      <Link
        to="/immersion/day/$dayId"
        params={{ dayId: target.dayId }}
        className={className}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      to="/courses/$courseSlug"
      params={{ courseSlug: target.slug }}
      search={target.lessonId ? { lesson: target.lessonId } : {}}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

/** Join, then open the program's first lesson / day. */
export function useJoinAndOpen() {
  const join = useJoinProgram();
  const navigate = useNavigate();
  function open(target: ProgramTarget) {
    if (target.kind === "kbl") navigate({ to: "/immersion/day/$dayId", params: { dayId: target.dayId } });
    else
      navigate({
        to: "/courses/$courseSlug",
        params: { courseSlug: target.slug },
        search: target.lessonId ? { lesson: target.lessonId } : {},
      });
  }
  return {
    pendingKey: join.isPending ? join.variables : undefined,
    joinAndOpen: (item: HomeItem) =>
      join.mutate(item.programKey, {
        onSuccess: () => {
          toast.success(`You've joined ${item.name}`);
          open(item.start);
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not join."),
      }),
  };
}

/** Thin progress bar with the percent beside it. */
export function ProgressMeter({ percent, className }: { percent: number; className?: string }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${value}%` }} />
      </div>
      <span className="numeric w-10 shrink-0 text-right text-xs font-semibold text-foreground">{value}%</span>
    </div>
  );
}

function Artwork({ item, className }: { item: HomeItem; className?: string }) {
  return item.image ? (
    <img src={item.image} alt="" loading="lazy" className={cn("w-full object-cover", className)} />
  ) : (
    <div className={cn("grid w-full place-items-center bg-secondary font-bold text-primary", className)}>
      {item.name.slice(0, 3).toUpperCase()}
    </div>
  );
}

function resumeVerb(item: HomeItem) {
  if (item.complete) return { label: "Review", icon: RotateCcw };
  if (item.percent === 0) return { label: "Start", icon: PlayCircle };
  return { label: "Resume", icon: PlayCircle };
}

/** A joined program: artwork, percent complete, what's next and Resume. */
export function EnrolledProgramCard({ item }: { item: HomeItem }) {
  const verb = resumeVerb(item);
  return (
    <ProgramLink
      target={item.resume}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-primary/50"
    >
      <div className="relative overflow-hidden">
        <Artwork item={item} className="aspect-video transition-transform duration-500 group-hover:scale-105" />
        {item.complete && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[0.6875rem] font-semibold text-white">
            <Check className="h-3 w-3" strokeWidth={3} /> Completed
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
        <ProgressMeter percent={item.percent} className="mt-3" />
        <p className="mt-1.5 text-xs text-muted-foreground">{item.progressLabel}</p>
        {item.nextLabel && !item.complete && (
          <p className="mt-2 truncate text-xs text-foreground">
            <span className="text-muted-foreground">Up next · </span>
            {item.nextLabel}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          <verb.icon className="h-4 w-4" /> {verb.label}
        </span>
      </div>
    </ProgramLink>
  );
}

/** A program not joined yet: artwork, size and a Join button (or Unlock). */
export function JoinProgramCard({
  item,
  onJoin,
  joining,
}: {
  item: HomeItem;
  onJoin: (item: HomeItem) => void;
  joining?: boolean;
}) {
  const locked = item.access === "locked";
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <ProgramLink target={item.start} className="block overflow-hidden">
        <Artwork item={item} className="aspect-[16/10] transition-transform duration-500 group-hover:scale-105" />
      </ProgramLink>
      <div className="flex flex-1 flex-col p-3">
        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.sizeLabel} · {locked ? "Locked" : "Included"}
        </p>
        {locked ? (
          <ProgramLink
            target={item.start}
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
          >
            <Lock className="h-3.5 w-3.5" />
            Unlock{item.priceCents ? ` · $${(item.priceCents / 100).toFixed(0)}` : ""}
          </ProgramLink>
        ) : (
          <button
            type="button"
            onClick={() => onJoin(item)}
            disabled={joining}
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {joining ? <Spinner className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            Join program
          </button>
        )}
      </div>
    </div>
  );
}

/** Top banner: continue the most recent program, or join the featured one. */
export function ProgramHero({
  item,
  mode,
  eyebrow,
  onJoin,
  joining,
}: {
  item: HomeItem;
  mode: "continue" | "join";
  eyebrow?: string;
  onJoin: (item: HomeItem) => void;
  joining?: boolean;
}) {
  const verb = resumeVerb(item);
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border">
      {item.image && <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />
      <div className="relative max-w-xl p-6 sm:p-10">
        <p className="eyebrow text-primary">
          {mode === "continue" ? "Continue training" : eyebrow || "Featured program"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">{item.name}</h1>
        {mode === "continue" ? (
          <>
            <ProgressMeter percent={item.percent} className="mt-4 max-w-sm" />
            <p className="mt-1.5 text-xs text-muted-foreground">{item.progressLabel}</p>
            {item.nextLabel && !item.complete && (
              <p className="mt-3 text-sm text-foreground">
                <span className="text-muted-foreground">Up next · </span>
                {item.nextLabel}
              </p>
            )}
            <ProgramLink
              target={item.resume}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              <verb.icon className="h-4 w-4" /> {verb.label}
            </ProgramLink>
          </>
        ) : (
          <>
            {item.summary && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{item.sizeLabel}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onJoin(item)}
                disabled={joining}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {joining ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Join program
              </button>
              <ProgramLink
                target={item.start}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                Preview <ArrowRight className="h-4 w-4" />
              </ProgramLink>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
