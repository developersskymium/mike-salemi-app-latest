"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Glass, Icon, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { resolveConflictsAction } from "@/lib/actions/plan";
import { moveItem as moveItemAction } from "@/lib/actions/today-plan-you";
import "./pln.css";

const PREVIEW = "Preview mode can't change your plan. It works on the live app.";

export interface Clash {
  planId: string;
  planName: string;
  program: string | null;
  date: string;
  dateLabel: string;
  suggestion: string;
  more: number;
}

/**
 * No conflicts by default (spec 11 #1, spec 12 Plan #2): one main session a day. When two plans land on the
 * same day, one calm card asks "Move A4L to Thursday?" — Move (next free day) or Keep both.
 */
export function ConflictCard({ c }: { c: Clash }) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const act = (mode: "next_free" | "keep") =>
    start(async () => {
      const r = await resolveConflictsAction(c.planId, mode);
      if (!r.ok) return void toast(r.error === "offline" ? PREVIEW : r.error, { icon: "close" });
      haptic(10);
      setGone(true);
      toast(mode === "keep" ? "Kept both — we won't ask again for this plan" : `Moved ${r.data.moved} session${r.data.moved === 1 ? "" : "s"} to free days`, { tone: "success", icon: "check" });
      router.refresh();
    });
  if (gone) return null;
  return (
    <Glass as="section" radius="card" className="pln-clashcard" aria-label="Two sessions on one day">
      <span className="pln-clash-ic" aria-hidden><Icon name="calendar" size="sm" /></span>
      <div className="pln-clash-main">
        <p className="pln-clash-t">Move {c.program ?? c.planName} to {c.suggestion}?</p>
        <p className="pln-sub">
          {c.dateLabel} has two main sessions{c.more > 0 ? `, and ${c.more} more day${c.more === 1 ? "" : "s"} clash` : ""}. One a day keeps you fresh.
        </p>
      </div>
      <div className="pln-clash-acts">
        <Button size="sm" variant="tint" onClick={() => act("next_free")} disabled={pending} aria-busy={pending || undefined}>Move</Button>
        <Button size="sm" variant="plain" onClick={() => act("keep")} disabled={pending}>Keep both</Button>
      </div>
    </Glass>
  );
}

/** The ⋯ menu that holds every secondary action (calm rule: at most 2–3 visible). */
export function MoreMenu({ items, label = "More" }: { items: { label: string; href?: string; icon: "sparkle" | "plus" | "plan" | "calendar" | "bell" | "down"; onClick?: () => void; download?: boolean }[]; label?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && (e.target === ref.current || !ref.current.contains(e.target as Node))) ref.current.open = false; // the phone scrim is the <details> itself
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return (
    <details ref={ref} className="pln-more">
      <summary className="lq-press" aria-label={label}>
        <Icon name="more" size="sm" />
      </summary>
      <div className="pln-more-menu" role="menu">
        {items.map((it) =>
          it.href ? (
            <a key={it.label} role="menuitem" href={it.href} download={it.download || undefined} onClick={() => ref.current && (ref.current.open = false)}>
              <Icon name={it.icon} size="sm" /> {it.label}
            </a>
          ) : (
            <button key={it.label} type="button" role="menuitem" onClick={() => { if (ref.current) ref.current.open = false; it.onClick?.(); }}>
              <Icon name={it.icon} size="sm" /> {it.label}
            </button>
          ),
        )}
      </div>
    </details>
  );
}

/** Calendar subscribe link (spec 12 Plan #7): copy the private feed URL, or open it in Apple Calendar. */
export function SubscribeRow({ url }: { url: string }) {
  const toast = useToast();
  const webcal = url.replace(/^https?:/, "webcal:");
  return (
    <div className="pln-sub-row">
      <code className="pln-feed" title={url}>{url.replace(/^https?:\/\//, "")}</code>
      <Button
        size="sm"
        variant="secondary"
        icon="check"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            toast("Link copied — paste it into Google Calendar › Other calendars › From URL", { tone: "success" });
          } catch {
            toast("Couldn't copy. Select the link and copy it.", { icon: "close" });
          }
        }}
      >
        Copy link
      </Button>
      <Button size="sm" variant="plain" href={webcal}>Open in Apple Calendar</Button>
    </div>
  );
}

/**
 * A quiet note on a day card when training lands on a booked coaching call or retreat session:
 * "Coaching call at 10:00 · train after?" with Move (to the next free day). Uses the same single-session move.
 */
export function DayClashNote({ text, itemIds, to, toLabel }: { text: string; itemIds: string[]; to: string; toLabel: string }) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const move = () =>
    start(async () => {
      for (const id of itemIds) {
        const r = await moveItemAction(id, to);
        if (!r.ok) return void toast(r.error === "offline" ? PREVIEW : r.error, { icon: "close" });
      }
      haptic(8);
      setGone(true);
      toast(`Moved to ${toLabel}`, { tone: "success", icon: "check" });
      router.refresh();
    });
  if (gone) return null;
  return (
    <p className="wk-note">
      <span>{text}</span>
      <button type="button" className="wk-note-btn" onClick={move} disabled={pending} aria-busy={pending || undefined} aria-label={`Move training to ${toLabel}`}>
        Move to {toLabel}
      </button>
    </p>
  );
}
