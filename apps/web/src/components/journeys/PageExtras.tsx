"use client";

/**
 * Program main-page extras (spec 12, Single program page ideas 2, 5, 6, 8, 10): the ⋯ menu for
 * everything that isn't the one primary action, "What you'll get" in three lines, the program's
 * badges row (greyed until earned), Mike's intro on the first visit only, and the finish line.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { VideoRef } from "@ms/core";
import { Medal } from "@/components/graphics";
import { Icon, type IconName } from "@/components/ui";
import { VideoStage } from "@/components/training/VideoStage";

export type MoreItem = { label: string; href?: string; icon: IconName; onClick?: "intro"; external?: boolean };

/** Secondary actions behind ⋯ (calm rule: one primary action per view). */
export function MoreMenu({ items, introVideo, introPoster, introTitle, introKey }: { items: MoreItem[]; introVideo?: (VideoRef & { title?: string }) | null; introPoster?: string | null; introTitle?: string; introKey?: string }) {
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Mike's intro plays itself once (first visit), then lives in this menu.
  useEffect(() => {
    if (!introVideo || !introKey) return;
    try {
      if (!window.localStorage.getItem(`ms-intro:${introKey}`)) {
        window.localStorage.setItem(`ms-intro:${introKey}`, "1");
        setIntro(true);
      }
    } catch {}
  }, [introVideo, introKey]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const all: MoreItem[] = [...(introVideo ? [{ label: "Watch Mike's intro", icon: "play" as IconName, onClick: "intro" as const }] : []), ...items];
  return (
    <>
      <div className="jm" ref={ref}>
        <button type="button" className="jm-btn" aria-haspopup="menu" aria-expanded={open} aria-label="More options" onClick={() => setOpen((v) => !v)}>
          <Icon name="more" size="sm" />
        </button>
        {open && (
          <div className="jm-pop" role="menu">
            {all.map((it) =>
              it.onClick === "intro" ? (
                <button key={it.label} type="button" role="menuitem" className="jm-it" onClick={() => (setIntro(true), setOpen(false))}><Icon name={it.icon} size="xs" />{it.label}</button>
              ) : it.external ? (
                <a key={it.label} role="menuitem" className="jm-it" href={it.href} target="_blank" rel="noreferrer"><Icon name={it.icon} size="xs" />{it.label}</a>
              ) : (
                <Link key={it.label} role="menuitem" className="jm-it" href={it.href ?? "#"} onClick={() => setOpen(false)}><Icon name={it.icon} size="xs" />{it.label}</Link>
              ),
            )}
          </div>
        )}
      </div>
      {intro && introVideo && typeof document !== "undefined" && createPortal(
        <div className="jm-intro" role="dialog" aria-modal="true" aria-label="Mike's intro">
          <button type="button" className="jm-intro-scrim" aria-label="Close" onClick={() => setIntro(false)} />
          <div className="jm-intro-box">
            <div className="jm-intro-top">
              <b>{introTitle ?? "A word from Mike"}</b>
              <button type="button" className="jm-btn" aria-label="Close intro" onClick={() => setIntro(false)}><Icon name="close" size="sm" /></button>
            </div>
            <VideoStage video={introVideo} poster={introPoster ?? null} title={introTitle ?? "Intro"} autoStart />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** "What you'll get" in three lines; the rest behind Read more. */
export function WhatYouGet({ points, more }: { points: string[]; more?: string | null }) {
  const [open, setOpen] = useState(false);
  if (!points.length && !more) return null;
  return (
    <section className="jg" aria-labelledby="jg-h">
      <h2 id="jg-h" className="jn-h">What you'll get</h2>
      <ul>{points.slice(0, 3).map((p) => <li key={p}><Icon name="check" size="xs" />{p}</li>)}</ul>
      {(more || points.length > 3) && (
        <>
          {open && (
            <div className="jg-more">
              {points.length > 3 && <ul>{points.slice(3).map((p) => <li key={p}><Icon name="check" size="xs" />{p}</li>)}</ul>}
              {more && more.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
            </div>
          )}
          <button type="button" className="jg-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? "Show less" : "Read more"}</button>
        </>
      )}
    </section>
  );
}

import type { ProgramBadge } from "./units";
export type { ProgramBadge };

/** The program's own medals, greyed until earned. */
export function BadgeRow({ badges }: { badges: ProgramBadge[] }) {
  if (!badges.length) return null;
  const n = badges.filter((b) => b.earned).length;
  return (
    <section className="jb" aria-labelledby="jb-h">
      <div className="jn-head"><h2 id="jb-h" className="jn-h">Program medals</h2><span className="jl-note lq-num">{n} of {badges.length} earned</span></div>
      <ul className="jb-row">
        {badges.map((b) => (
          <li key={b.key} data-earned={b.earned ? "" : undefined}>
            <Medal tier={b.tier} size={56} locked={!b.earned} title={b.label} />
            <b>{b.label}</b>
            <small>{b.earned ? "Earned" : b.sub}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Finish line: certificate + choose what's next (two cards, not a wall). */
export function FinishLine({ certificateHref, next }: { certificateHref: string | null; next: { title: string; reason: string; href: string; image: { src: string; focal: string } }[] }) {
  return (
    <section className="jf" aria-labelledby="jf-h">
      <div className="jf-top">
        <Medal tier="gold" size={64} animated />
        <div>
          <h2 id="jf-h" className="jn-h">You crossed the finish line.</h2>
          <p className="jl-note">Every lesson done. {certificateHref ? "Your certificate is ready." : ""}</p>
        </div>
        {certificateHref && <Link href={certificateHref} className="jf-cert lq-press"><Icon name="sparkle" size="xs" />Get your certificate</Link>}
      </div>
      <p className="jn-row-t">Choose what's next</p>
      <div className="jf-grid">
        {next.slice(0, 2).map((n) => (
          <Link key={n.href} href={n.href} className="jf-card lq-press">
            <span className="jf-art"><Image src={n.image.src} alt="" fill sizes="(min-width: 760px) 320px, 100vw" style={{ objectPosition: n.image.focal }} /></span>
            <span className="jf-c"><b>{n.title}</b><small>{n.reason}</small></span>
            <Icon name="arrowRight" size="xs" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CoverActions({ primary, more }: { primary: ReactNode; more: ReactNode }) {
  return <div className="jc-acts">{primary}{more}</div>;
}
