import { useState, type ReactNode } from "react";
import { Check, Lock, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { idHue } from "@/lib/vimeo";
import { useVimeoMeta } from "@/hooks/use-vimeo-meta";
import fallbackAsset from "@/assets/kb-fallback.asset.json";

/** Flat Paper & Ink colour blocks used when a poster image is unavailable. */
const POSTER_FILLS = [
  "#1b1d1f",
  "#2a2d31",
  "#3a3d3f",
  "#232a33",
  "#2f2a26",
  "#26302c",
];

/* ------------------------------------------------------------------ */
/* Poster — 16:9 Vimeo thumbnail with scrim, play affordance and state */
/* ------------------------------------------------------------------ */

export type PosterState = "default" | "active" | "complete" | "locked";

export function Poster({
  vimeoId,
  candidates,
  imageSrc,
  alt,
  state = "default",
  showAction = true,
  size = "md",
  ratio = "video",
  overlay,
  className,
}: {
  vimeoId: string;
  /** Ordered fallbacks — the first video with a real poster frame wins. */
  candidates?: string[];
  imageSrc?: string;
  alt: string;
  state?: PosterState;
  /** Hide the built-in play/check badge when the caller supplies its own. */
  showAction?: boolean;
  size?: "sm" | "md" | "lg";
  ratio?: "video" | "wide" | "square" | "portrait";
  overlay?: ReactNode;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const hue = idHue(vimeoId + alt);
  // Only resolve real Vimeo metadata when we are not handed explicit artwork.
  const meta = useVimeoMeta(imageSrc ? [] : (candidates?.length ? candidates : [vimeoId]));
  const src = imageSrc ?? meta?.thumbnail ?? "";

  const failed = failedSrc === src;
  const loaded = loadedSrc === src;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-elevated",
        ratio === "video" && "aspect-video",
        ratio === "wide" && "aspect-[21/9]",
        ratio === "square" && "aspect-square",
      ratio === "portrait" && "aspect-[3/4]",
        className,
      )}
    >
      {/* deterministic colour block sits under (and instead of) every poster */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(150deg, ${POSTER_FILLS[hue % POSTER_FILLS.length]} 0%, ${
            POSTER_FILLS[(hue + 3) % POSTER_FILLS.length]
          } 100%)`,
        }}
      />

      {/* photographic fallback — shown until (or unless) real artwork loads */}
      <img
        aria-hidden
        src={fallbackAsset.url}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          loaded ? "opacity-0" : "opacity-100",
          state === "locked" && "opacity-40 grayscale",
        )}
      />


      {src && !failed && (
        <img
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          onLoad={(e) => {
            // vumbnail serves a generic stock placeholder for unknown ids
            const img = e.currentTarget;
            if (img.naturalWidth <= 1) setFailedSrc(src);
            else setLoadedSrc(src);
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
            state === "locked" && "opacity-40 grayscale",
          )}
        />
      )}


      <div className="scrim pointer-events-none absolute inset-0" aria-hidden />


      {!showAction ? null : state === "locked" ? (
        <span className="absolute inset-0 grid place-items-center">
          <span className="glass-card grid h-11 w-11 place-items-center rounded-full border border-hairline">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </span>
        </span>
      ) : (
        <span className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover:scale-110">
          {state === "complete" ? (
            <Check className="h-4 w-4" strokeWidth={3} />
          ) : (
            <Play className="h-4 w-4 translate-x-px fill-current" />
          )}
        </span>
      )}

      {overlay}
    </div>
  );
}

/** Small translucent pill used over posters (duration, counts, states). */
export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "eyebrow inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.625rem] leading-none",
        tone === "neutral" && "glass-card border border-hairline text-foreground",
        tone === "primary" && "bg-primary text-primary-foreground",
        tone === "success" && "bg-success text-success-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* ProgressRing — animated arc used for program / day completion       */
/* ------------------------------------------------------------------ */

export function ProgressRing({
  percent,
  size = 132,
  stroke = 10,
  label,
  sublabel,
  onDark = false,
  className,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  /** Render for placement over a dark scrim (white type, light track). */
  onDark?: boolean;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c - (clamped / 100) * c;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${clamped}% complete`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={onDark ? "stroke-white" : "stroke-border"}
          opacity={onDark ? 0.28 : 0.55}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#ringGradient)"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms var(--ease-out-soft)" }}
        />
        <defs>
          <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--primary-glow)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className={cn("numeric text-xl font-semibold", onDark ? "text-white" : "text-foreground")}>
          {label ?? `${clamped}%`}
        </span>
        {sublabel && (
          <span className={cn("eyebrow mt-1 text-[0.5625rem]", onDark ? "text-white/70" : "text-muted-foreground")}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StatTile — compact metric card                                      */
/* ------------------------------------------------------------------ */

export function StatTile({
  value,
  label,
  hint,
  className,
}: {
  value: ReactNode;
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("panel-flat px-3 py-3 sm:px-5 sm:py-4", className)}>
      <p className="numeric text-base font-semibold text-foreground sm:text-xl">{value}</p>
      <p className="eyebrow mt-1 truncate text-[0.6rem] text-muted-foreground sm:text-[0.65rem]">{label}</p>
      {hint && <p className="mt-1 hidden text-xs text-muted-foreground/80 sm:block">{hint}</p>}
    </div>

  );
}

/* ------------------------------------------------------------------ */
/* SectionHeading                                                      */
/* ------------------------------------------------------------------ */

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow text-primary">{eyebrow}</p>}
        <h2 className="mt-2 text-lg text-foreground sm:text-xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared image-card furniture — one scrim + type scale everywhere      */
/* ------------------------------------------------------------------ */

/** Dark editorial scrim + hover boost layer for any image-backed card. */
export function MediaScrim({ className }: { className?: string }) {
  return (
    <>
      <span aria-hidden className={cn("media-scrim", className)} />
      <span aria-hidden className="media-scrim-boost" />
    </>
  );
}

/** Progress bar + count, styled for placement over a dark scrim. */
export function MediaProgress({
  percent,
  label,
  className,
}: {
  percent: number;
  label?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-1.5 w-40 max-w-[42vw] overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full rounded-full transition-[width] duration-700 [transition-timing-function:var(--ease-out-soft)]"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%`, background: "var(--gradient-primary)" }}
        />
      </div>
      {label && <span className="numeric text-xs font-medium text-white/80">{label}</span>}
    </div>
  );
}

/** Standard phase chip shown over card imagery. */
export function PhaseChip({
  label,
  meta,
  complete,
  active,
  className,
}: {
  label: string;
  meta?: string;
  complete?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex min-w-0 flex-col justify-center rounded-xl px-2.5 py-2 ring-1 ring-inset backdrop-blur-md transition-colors duration-300",
        complete
          ? "bg-success/25 ring-success/45"
          : active
            ? "bg-white/20 ring-white/35"
            : "bg-white/10 ring-white/20 group-hover:bg-white/[0.17] group-hover:ring-white/30",
        className,
      )}
    >
      <span className="flex items-center gap-1">
        <span
          className={cn(
            "eyebrow block truncate text-[0.625rem] leading-none",
            complete ? "text-success" : "text-white",
          )}
        >
          {label}
        </span>
        {complete && <Check className="h-3 w-3 shrink-0 text-success" strokeWidth={3} />}
      </span>
      {meta && <span className="mt-1 block truncate text-[0.625rem] leading-none text-white/65">{meta}</span>}
    </span>
  );
}
