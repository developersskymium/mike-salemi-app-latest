import type { ComponentType, CSSProperties, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- */
/* Loading                                                           */
/* ---------------------------------------------------------------- */

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("skeleton", className)} style={style} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

/**
 * Card-shaped placeholders that mirror the real cards they stand in for:
 * a media thumbnail block, a title line, and two short meta lines.
 */
export function CardGridSkeleton({
  count = 6,
  className,
  thumbnail = true,
}: {
  count?: number;
  className?: string;
  thumbnail?: boolean;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-fade overflow-hidden rounded-2xl border border-hairline bg-card"
          style={{ animationDelay: `${i * 45}ms` }}
        >
          {thumbnail && <Skeleton className="aspect-video w-full rounded-none" />}
          <div className="p-5">
            <Skeleton className="h-2.5 w-16 rounded-full" />
            <Skeleton className="mt-3.5 h-4 w-4/5" />
            <Skeleton className="mt-2.5 h-4 w-1/2" />
            <div className="mt-5 flex items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Row placeholders shaped like list items: thumbnail, title, meta, action. */
export function ListSkeleton({
  rows = 5,
  className,
  thumbnail = true,
}: {
  rows?: number;
  className?: string;
  thumbnail?: boolean;
}) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-fade flex items-center gap-4 rounded-2xl border border-hairline bg-card p-3.5"
          style={{ animationDelay: `${i * 45}ms` }}
        >
          {thumbnail ? (
            <Skeleton className="h-14 w-24 shrink-0 rounded-xl" />
          ) : (
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          )}
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5" style={{ width: `${52 + ((i * 13) % 30)}%` }} />
            <Skeleton className="mt-2.5 h-2.5 w-24 rounded-full" />
          </div>
          <Skeleton className="hidden h-8 w-20 shrink-0 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder shaped like a stat panel: label, progress track, big number. */
export function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-hairline bg-card p-5" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-2.5 w-28 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-2 w-full rounded-full" />
      <Skeleton className="mt-6 h-8 w-2/5" />
      <Skeleton className="mt-3 h-2.5 w-1/2 rounded-full" />
    </div>
  );
}

/** Placeholder for a single wide media/hero block. */
export function MediaSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-hairline bg-card", className)} aria-hidden>
      <Skeleton className="aspect-[16/7] w-full rounded-none" />
      <div className="p-5">
        <Skeleton className="h-2.5 w-20 rounded-full" />
        <Skeleton className="mt-3.5 h-5 w-2/3" />
        <Skeleton className="mt-3 h-3 w-full" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Empty state                                                       */
/* ---------------------------------------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pop halo relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-hairline bg-surface/70 px-6 py-12 text-center",
        className,
      )}
    >
      {/* Faint ruled backdrop so the panel reads as a designed surface. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:radial-gradient(circle_at_1px_1px,color-mix(in_oklab,var(--foreground)_12%,transparent)_1px,transparent_0)] [background-size:22px_22px] [mask-image:radial-gradient(70%_60%_at_50%_35%,black,transparent)]"
      />

      {Icon && (
        <span aria-hidden className="animate-float relative mb-6 grid place-items-center">
          <span className="absolute h-20 w-20 rounded-full border border-hairline" />
          <span className="absolute h-16 w-16 rounded-full bg-primary/10 blur-md" />
          <span className="raise-soft relative grid h-14 w-14 place-items-center rounded-2xl border border-hairline bg-card">
            <Icon className="h-6 w-6 text-primary" />
          </span>
        </span>
      )}

      <h3 className="relative text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="relative mt-7">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Buttons & chips                                                   */
/* ---------------------------------------------------------------- */

const buttonBase =
  "tap inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[0.9375rem] font-semibold tracking-tight disabled:pointer-events-none disabled:opacity-50";

export const buttonStyles = {
  primary: cn(buttonBase, "bg-primary text-primary-foreground"),
  outline: cn(buttonBase, "border border-border bg-surface text-foreground"),
  ghost: cn(buttonBase, "text-muted-foreground hover:bg-secondary hover:text-foreground"),
};


export function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "eyebrow tap rounded-full border px-4 py-2",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary hover:bg-secondary hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* Settings row                                                      */
/* ---------------------------------------------------------------- */

/**
 * Labelled switch row — the single pattern for every on/off control in the
 * app so toggles look and behave the same everywhere.
 */
export function SettingToggle({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface/50 px-4 py-3.5",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </label>
  );
}
