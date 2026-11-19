import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/app-shell";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Page scaffolding — one rhythm for every screen                      */
/* ------------------------------------------------------------------ */

/**
 * Minimal sticky context bar: back affordance, one line of context, one
 * optional primary action. Nothing else lives up here.
 */
export function ContextBar({
  backTo,
  backLabel,
  title,
  meta,
  action,
  progress,
  children,
}: {
  backTo: string;
  backLabel: string;
  title: string;
  meta?: string;
  action?: ReactNode;
  /** 0–100; renders a hairline progress line under the bar. */
  progress?: number;
  /** Optional second row (e.g. chip nav). */
  children?: ReactNode;
}) {
  return (
    <div className="glass sticky top-0 z-30 border-b border-hairline">
      <Container className="grid h-[var(--bar-h)] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <Link
          to={backTo}
          aria-label={backLabel}
          className="tap tap-target -ml-2 grid place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {meta && <p className="truncate text-[0.6875rem] text-muted-foreground">{meta}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">{action}</div>
      </Container>

      {typeof progress === "number" && (
        <div className="h-[2px] w-full bg-border" role="presentation">
          <div
            className="h-full bg-primary transition-[width] duration-700 [transition-timing-function:var(--ease-out-soft)]"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      {children}
    </div>
  );
}

/** Calm page heading: eyebrow, title, one lede line, optional actions. */
export function PageHead({
  eyebrow,
  title,
  lede,
  meta,
  actions,
  focusOnMount,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  meta?: string;
  actions?: ReactNode;
  /** Move focus here on mount — used when a route swap replaces the page. */
  focusOnMount?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true });
  }, [focusOnMount, title]);

  return (
    <Container className="section-tight">
      <div className="animate-page measure">
        {eyebrow && <p className="eyebrow text-muted-foreground">{eyebrow}</p>}
        <h1 ref={ref} tabIndex={-1} className="title-page mt-3 text-foreground outline-none">
          {title}
        </h1>
        {lede && <p className="lede mt-3">{lede}</p>}
        {meta && <p className="numeric mt-4 text-xs text-muted-foreground">{meta}</p>}
        {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </Container>
  );
}

/** A ruled page section with consistent vertical rhythm. */
export function Section({
  children,
  className,
  ruled = true,
  tight,
  id,
}: {
  children: ReactNode;
  className?: string;
  ruled?: boolean;
  tight?: boolean;
  /** Anchor target for in-page quick-jump navigation. */
  id?: string;
}) {
  return (
    <div id={id} className={cn(ruled && "rule", id && "scroll-mt-24")}>
      <Container className={cn(tight ? "section-tight" : "section", className)}>{children}</Container>
    </div>

  );
}

/**
 * Horizontally scrollable chip nav that keeps the active chip in view and
 * keeps every chip a comfortable tap target.
 */
export function ChipNav({
  items,
  activeId,
  onSelect,
  label,
}: {
  items: { id: string; label: string; hint?: string }[];
  activeId: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rail = railRef.current;
    const chip = rail?.querySelector<HTMLElement>(`[data-chip="${CSS.escape(activeId)}"]`);
    if (!rail || !chip) return;
    const left = chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeId]);

  function onKeyDown(e: React.KeyboardEvent) {
    const i = items.findIndex((it) => it.id === activeId);
    if (e.key === "ArrowRight" && i < items.length - 1) {
      e.preventDefault();
      onSelect(items[i + 1].id);
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      onSelect(items[i - 1].id);
    }
  }

  return (
    <div
      ref={railRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="no-scrollbar overflow-x-auto border-t border-hairline"
    >
      <div className="flex w-max gap-1.5 px-4 py-2 sm:px-6">
        {items.map((item, i) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              data-chip={item.id}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(item.id)}
              className={cn(
                "tap flex min-h-9 items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              <span className="numeric mr-1.5 opacity-60">{i + 1}</span>
              {item.label}
              {item.hint && <span className="numeric ml-2 text-[0.625rem] opacity-60">{item.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
