import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell, Container } from "@/components/app-shell";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Top progress bar — instant feedback the moment a link is tapped     */
/* ------------------------------------------------------------------ */

export function NavigationProgress() {
  const loading = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading,
  });
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      setProgress(8);
      const timers = [
        window.setTimeout(() => setProgress(38), 90),
        window.setTimeout(() => setProgress(62), 260),
        window.setTimeout(() => setProgress(81), 700),
        window.setTimeout(() => setProgress(92), 1600),
      ];
      return () => timers.forEach(window.clearTimeout);
    }
    if (!visible) return;
    setProgress(100);
    const t = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 320);
    return () => window.clearTimeout(t);
  }, [loading, visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className="h-0.5 bg-primary transition-[width,opacity] duration-300 [transition-timing-function:var(--ease-spring)]"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
          boxShadow: "0 0 12px color-mix(in oklab, var(--primary) 60%, transparent)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout-aware skeleton                                               */
/* ------------------------------------------------------------------ */

function Bar({ className }: { className?: string }) {
  return <div className={cn("skeleton h-3 rounded-full", className)} />;
}

function Block({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
}

function HeaderSkeleton({ wide }: { wide?: boolean }) {
  return (
    <div className="border-b border-hairline py-8 sm:py-10">
      <Container>
        <Bar className="w-24 opacity-70" />
        <Bar className={cn("mt-4 h-7", wide ? "w-80 max-w-full" : "w-56 max-w-full")} />
        <Bar className="mt-3 h-3 w-full max-w-xl" />
      </Container>
    </div>
  );
}

type Variant = "grid" | "list" | "detail" | "player" | "form" | "default";

function variantFor(pathname: string): Variant {
  if (pathname.startsWith("/library") || pathname.startsWith("/shop") || pathname.startsWith("/programs"))
    return "grid";
  if (pathname.startsWith("/self-guided") || pathname.startsWith("/saves") || pathname.startsWith("/structure"))
    return "list";
  if (/\/day\//.test(pathname) || pathname.startsWith("/mtk") || pathname.startsWith("/retreats"))
    return "player";
  if (pathname.startsWith("/tools/") || pathname.startsWith("/onboarding") || pathname.startsWith("/checkout"))
    return "form";
  if (pathname.startsWith("/immersion") || pathname.startsWith("/profile") || pathname.startsWith("/account"))
    return "detail";
  return "default";
}

function Body({ variant }: { variant: Variant }) {
  if (variant === "grid") {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3" style={{ animationDelay: `${i * 40}ms` }}>
            <Block className="aspect-[3/4] w-full" />
            <Bar className="w-4/5" />
            <Bar className="h-2.5 w-1/2 opacity-70" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="panel flex items-center gap-4 p-4">
            <Block className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bar className="w-1/3" />
              <Bar className="h-2.5 w-2/3 opacity-70" />
            </div>
            <Block className="hidden h-8 w-20 rounded-lg sm:block" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "player") {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Block className="aspect-video w-full rounded-3xl" />
          <Bar className="h-5 w-2/3" />
          <Bar className="w-full opacity-70" />
          <Bar className="w-5/6 opacity-70" />
          <div className="flex gap-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Block key={i} className="aspect-video w-32 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Block key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <Block className="h-2 w-full rounded-full" />
        <Bar className="h-6 w-3/4" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
        <Block className="h-12 w-40 rounded-xl" />
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="space-y-6">
        <Block className="h-52 w-full rounded-3xl sm:h-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Block key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Block key={i} className="h-56 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Block key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/** Layout-aware placeholder shown while a route's data/code loads. */
export function RoutePending() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const variant = variantFor(pathname);

  return (
    <AppShell>
      <div className="animate-fade" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading page</span>
        <HeaderSkeleton wide={variant === "player" || variant === "detail"} />
        <Container className="py-8 sm:py-10">
          <Body variant={variant} />
        </Container>
      </div>
    </AppShell>
  );
}
