import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Step flow scaffold — full-screen, iOS-style question scenes         */
/* ------------------------------------------------------------------ */

/**
 * A single, quiet full-height scene: thin progress rail at the top,
 * one question centred in generous space, actions pinned to the bottom.
 *
 * Uses dvh so mobile browser chrome never crops the action bar.
 */
export function StepScene({
  header,
  children,
  footer,
  className,
}: {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[100dvh] flex-col sm:min-h-[calc(100dvh-3.5rem)]", className)}>
      {header}
      <div className="flex flex-1 items-start justify-center px-4 pb-8 pt-8 sm:items-center sm:px-6 sm:pb-12 sm:pt-10">
        <div className="w-full max-w-[36rem]">{children}</div>
      </div>
      {footer && (
        <div className="glass sticky bottom-0 z-20 border-t border-hairline">
          <div className="mx-auto w-full max-w-[36rem] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}

/** Segmented progress rail — one hairline segment per step. */
export function StepRail({ total, current }: { total: number; current: number }) {
  return (
    <div
      className="flex items-center gap-1"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={Math.min(current + 1, total)}
      aria-label={`Step ${Math.min(current + 1, total)} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "h-[3px] flex-1 rounded-full transition-colors duration-500 [transition-timing-function:var(--ease-ios)]",
            i < current ? "bg-primary" : i === current ? "bg-primary/50" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Question heading block. Big, calm, plenty of air.
 *
 * Takes focus whenever the question changes so keyboard and screen-reader
 * users move with the flow instead of being left on the previous button.
 */
export function StepTitle({
  eyebrow,
  title,
  help,
}: {
  eyebrow?: string;
  title: string;
  help?: string;
}) {
  const ref = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [title]);

  return (
    <div>
      {eyebrow && <p className="eyebrow text-muted-foreground">{eyebrow}</p>}
      <h2
        ref={ref}
        tabIndex={-1}
        aria-live="polite"
        className="mt-3 text-2xl leading-[1.15] text-foreground outline-none sm:text-[1.75rem]"
      >
        {title}
      </h2>
      {help && <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">{help}</p>}
    </div>
  );
}

/** A single tappable answer row. Flat, hairline, no shadow. */
export function OptionRow({
  selected,
  multi,
  label,
  description,
  bullets,
  onClick,
}: {
  selected: boolean;
  multi?: boolean;
  label: string;
  description?: string;
  bullets?: string[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "pressable grid min-h-[3.25rem] w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-4 rounded-2xl border px-4 py-3.5 text-left",
        selected ? "border-primary bg-primary/[0.06]" : "border-border bg-surface hover:border-foreground/25",
      )}
    >
      <span className="min-w-0">
        <span className="block text-[0.9375rem] font-semibold text-foreground">{label}</span>
        {description && (
          <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{description}</span>
        )}
        {bullets && bullets.length > 0 && (
          <span className="mt-2 block space-y-1">
            {bullets.map((b) => (
              <span key={b} className="block text-sm text-muted-foreground">
                · {b}
              </span>
            ))}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center border transition-all duration-200 [transition-timing-function:var(--ease-spring)]",
          multi ? "rounded-[7px]" : "rounded-full",
          selected ? "scale-100 border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}
