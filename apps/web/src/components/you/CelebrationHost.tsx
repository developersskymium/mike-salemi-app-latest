"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Completion, LevelEmblem, type MedalTier } from "@/components/graphics";
import { Button, Glass, Icon } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { syncAchievements, type AchievementSnapshot } from "@/lib/actions/you";
import { MedalPin } from "@/components/badges/MedalPin";
import { chalkBurst, confetti } from "./fx";
import "./you.css";

/* ================================================================ public API */

export type Celebration = {
  /** Dedupe key: the same id is celebrated once per page life. */
  id: string;
  kind: "badge" | "certificate" | "program" | "level" | "custom";
  eyebrow: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
  medal?: { tier: MedalTier; icon: string | null; color?: string | null };
  level?: number;
};

export type BadgeToast = { id: string; name: string; tier: MedalTier; icon: string | null; description: string; /** Program enamel colour (0023). */ medal_color?: string | null };

type Event = { type: "celebrate"; c: Celebration } | { type: "badge"; b: BadgeToast };
const listeners = new Set<(e: Event) => void>();
const seen = new Set<string>();
const emit = (e: Event) => listeners.forEach((l) => l(e));

/** Full-screen celebration card (chalk burst, confetti, haptics). Deduped by id. */
export function celebrate(c: Celebration) {
  if (seen.has(c.id)) return;
  seen.add(c.id);
  emit({ type: "celebrate", c });
}

/** "Badge unlocked — <name>" toast. */
export function badgeUnlocked(b: BadgeToast) {
  if (seen.has(`badge:${b.id}`)) return;
  seen.add(`badge:${b.id}`);
  emit({ type: "badge", b });
}

/**
 * Call after anything that can earn a medal, certificate or level (complete_step, submit_readiness,
 * tool results, end_session…). The host re-reads achievements and celebrates what is new.
 */
export function announceProgress() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ms:progress"));
}

/* ================================================================ copy */

const certCelebration = (c: AchievementSnapshot["certificates"][number]): Celebration => ({
  id: `certificate:${c.id}`,
  kind: "certificate",
  eyebrow: "Certificate awarded",
  title: [c.program, c.path?.split("·")[0]?.trim()].filter(Boolean).join(" — "),
  body: "You finished every phase, day and lesson of this level. The certificate is yours to view, print or save.",
  action: { label: "View certificate", href: `/you/certificates/${c.id}` },
  level: /Level\s+II\b/.test(c.path ?? "") ? 2 : /Level\s+III\b/.test(c.path ?? "") ? 3 : 1,
});

const programCelebration = (p: AchievementSnapshot["programsComplete"][number]): Celebration => ({
  id: `program:${p.id}`,
  kind: "program",
  eyebrow: "Program complete",
  title: `You finished ${p.name}`,
  body: "Every level, every phase, every day. Claim your certificates, or restart a level to run it again.",
  action: { label: "See your certificates", href: "/you?tab=achievements" },
});

const levelCelebration = (level: number, name: string): Celebration => ({
  id: `level:${level}`,
  kind: "level",
  eyebrow: `Level ${level}`,
  title: `You reached ${name}`,
  body: "Every step, day and phase you finish adds points. The next level is a thousand points away.",
  action: { label: "Open rewards", href: "/you/rewards" },
  level,
});

/* ================================================================ memory of what was already shown */

const KEY = "ms-achievements-v1";
type Seen = { u: string; b: string[]; c: string[]; p: string[]; l: number };
const readSeen = (): Seen | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null") as Seen | null;
  } catch {
    return null;
  }
};
const writeSeen = (s: AchievementSnapshot) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ u: s.userId, b: s.badges.map((b) => b.id), c: s.certificates.map((c) => c.id), p: s.programsComplete.map((p) => p.id), l: s.level } satisfies Seen));
  } catch {
    /* private mode */
  }
};

/* ================================================================ samples (development preview: ?celebrate=badge|certificate|program|level) */

const SAMPLES: Record<string, () => void> = {
  badge: () => badgeUnlocked({ id: "streak-7", name: "Unbroken", tier: "silver", icon: "flame", description: "Train seven days in a row" }),
  certificate: () => celebrate(certCelebration({ id: "preview", program: "Kettlebell Lifestyle", path: "Level I · Beginner", issued_at: new Date().toISOString() })),
  program: () => celebrate(programCelebration({ id: "preview", slug: "kettlebell-lifestyle", name: "Kettlebell Lifestyle" })),
  level: () => celebrate(levelCelebration(2, "Apprentice")),
};

/* ================================================================ host */

/* The first mounted host is the live one; any other stays inert (read as an external store). */
const hostOrder: symbol[] = [];
const hostListeners = new Set<() => void>();
function useIsLiveHost(): boolean {
  const [id] = useState(() => Symbol("celebration-host"));
  const subscribe = useCallback(
    (cb: () => void) => {
      hostListeners.add(cb);
      if (!hostOrder.includes(id)) hostOrder.push(id);
      return () => {
        hostListeners.delete(cb);
        const i = hostOrder.indexOf(id);
        if (i >= 0) hostOrder.splice(i, 1);
        hostListeners.forEach((l) => l());
      };
    },
    [id],
  );
  return useSyncExternalStore(subscribe, () => hostOrder[0] === id, () => false);
}

/**
 * Mounted once in the member shell. Shows "Badge unlocked" toasts and the full-screen celebration
 * (badge, certificate, program complete, new level) with a chalk burst and confetti. It re-reads
 * achievements on load, on navigation, when the tab comes back and on `announceProgress()`, and
 * celebrates only what is new since the last visit (first visit on a device seeds silently).
 * Safe to mount twice: the second instance stays inert.
 */
export function CelebrationHost() {
  const active = useIsLiveHost();
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [toasts, setToasts] = useState<(BadgeToast & { leaving?: boolean })[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const last = useRef(0);
  const busy = useRef(false);
  const fx = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const current = queue[0] ?? null;

  useEffect(() => {
    if (!active) return;
    const on = (e: Event) => {
      if (e.type === "celebrate") setQueue((q) => [...q, e.c]);
      else {
        setToasts((t) => [...t.slice(-2), e.b]);
        haptic(12);
        window.setTimeout(() => setToasts((t) => t.map((x) => (x.id === e.b.id ? { ...x, leaving: true } : x))), 5600);
        window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== e.b.id)), 6000);
      }
    };
    listeners.add(on);
    return () => {
      listeners.delete(on);
    };
  }, [active]);

  const sync = useCallback(async (force = false) => {
    if (busy.current || (!force && Date.now() - last.current < 4000)) return;
    busy.current = true;
    last.current = Date.now();
    try {
      const r = await syncAchievements();
      if (!r.ok) return;
      const s = r.data;
      const prev = readSeen();
      writeSeen(s);
      if (!prev || prev.u !== s.userId) return; // first sight on this device: remember, don't replay history
      const b = new Set(prev.b), c = new Set(prev.c), p = new Set(prev.p);
      s.badges.filter((x) => !b.has(x.id)).slice(0, 3).forEach((x) => badgeUnlocked(x));
      s.certificates.filter((x) => !c.has(x.id)).forEach((x) => celebrate(certCelebration(x)));
      s.programsComplete.filter((x) => !p.has(x.id)).forEach((x) => celebrate(programCelebration(x)));
      if (s.level > prev.l) celebrate(levelCelebration(s.level, s.levelName));
    } finally {
      busy.current = false;
    }
  }, []);

  // load, navigation, focus, explicit progress
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => sync(), 700);
    return () => window.clearTimeout(t);
  }, [active, pathname, sync]);
  useEffect(() => {
    if (!active) return;
    const vis = () => document.visibilityState === "visible" && sync();
    const prog = () => window.setTimeout(() => sync(true), 400);
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("ms:progress", prog);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("ms:progress", prog);
    };
  }, [active, sync]);

  // development preview
  useEffect(() => {
    if (!active || process.env.NODE_ENV === "production") return;
    const k = new URLSearchParams(window.location.search).get("celebrate");
    if (k && SAMPLES[k]) window.setTimeout(SAMPLES[k]!, 500);
  }, [active, pathname]);

  // the moment: chalk burst, confetti, haptics, focus
  useEffect(() => {
    if (!current) return;
    const host = fx.current;
    const t1 = window.setTimeout(() => {
      const r = host?.getBoundingClientRect();
      const origin = r ? { x: r.width / 2, y: Math.min(r.height * 0.36, 230) } : undefined;
      chalkBurst(host, { origin, spread: 1.4 });
      confetti(host, { origin, count: 70 });
    }, 260);
    try {
      navigator.vibrate?.([14, 60, 22]);
    } catch {
      /* unsupported */
    }
    cardRef.current?.querySelector<HTMLElement>(".yu-cel-actions button")?.focus({ focusVisible: false } as FocusOptions);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setQueue((q) => q.slice(1));
    window.addEventListener("keydown", esc);
    return () => {
      window.clearTimeout(t1);
      window.removeEventListener("keydown", esc);
    };
  }, [current]);

  if (!active) return null;
  const dismiss = () => setQueue((q) => q.slice(1));

  return createPortal(
    <>
      {toasts.length > 0 && (
        <div className="yu-badge-toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <Glass
              key={t.id}
              level="thick"
              float
              interactive
              className="yu-badge-toast"
              data-leaving={t.leaving ? "" : undefined}
              onClick={() => router.push("/you/rewards")}
            >
              <MedalPin tier={t.tier} icon={t.icon} color={t.medal_color} size={46} animated />
              <span className="yu-badge-toast-main">
                <span className="lq-t13 yu-eyebrow">Badge unlocked</span>
                <span className="lq-t15" style={{ fontWeight: 600 }}>{t.name}</span>
                {t.description && <span className="lq-t13 lq-c2">{t.description}</span>}
              </span>
              <Icon name="chevron" size="sm" className="lq-c3" />
            </Glass>
          ))}
        </div>
      )}

      {current && (
        <div className="yu-cel" ref={cardRef} role="dialog" aria-modal="true" aria-labelledby="yu-cel-title" data-kind={current.kind}>
          <button type="button" className="yu-cel-scrim" aria-label="Dismiss" onClick={dismiss} />
          <Glass level="thick" float className="yu-cel-card" key={current.id}>
            <div className="yu-cel-fx" ref={fx} aria-hidden />
            <div className="yu-cel-art" aria-hidden>
              {current.kind === "badge" && current.medal ? (
                <MedalPin tier={current.medal.tier} icon={current.medal.icon} color={current.medal.color} size={150} animated />
              ) : current.kind === "program" ? (
                <Completion variant="milestone" size={150} animated />
              ) : (
                <LevelEmblem level={current.level ?? 1} size={130} tier={current.kind === "certificate" ? "gold" : undefined} />
              )}
            </div>
            <p className="lq-t13 yu-eyebrow">{current.eyebrow}</p>
            <h2 id="yu-cel-title" className="lq-t22 yu-cel-title">{current.title}</h2>
            <p className="lq-t15 lq-c2 yu-cel-body">{current.body}</p>
            <div className="yu-cel-actions">
              {current.action ? (
                <Button
                  block
                  size="lg"
                  onClick={() => {
                    const href = current.action!.href;
                    dismiss();
                    router.push(href);
                  }}
                >
                  {current.action.label}
                </Button>
              ) : null}
              <Button block variant="plain" onClick={dismiss}>
                Keep training
              </Button>
            </div>
          </Glass>
        </div>
      )}
    </>,
    document.body,
  );
}
