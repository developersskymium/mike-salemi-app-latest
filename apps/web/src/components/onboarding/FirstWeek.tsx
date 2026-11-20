"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Icon, IconButton } from "@/components/ui";
import { listDrafts } from "@/components/ui/form";
import { markInstallPrompted, markWelcomeSeen, tickChecklist } from "@/lib/settings/actions";
import type { FirstWeek as FirstWeekData } from "@/lib/settings/loader";
import "./first-week.css";

/** 30-s welcome from Mike, shown once on the first Home visit, then gone for good. */
export function WelcomeVideo({ vimeoId, photo }: { vimeoId: string | null; photo: { src: string; position: string } }) {
  const [open, setOpen] = useState(true);
  const close = () => {
    setOpen(false);
    void markWelcomeSeen();
  };
  if (!open) return null;
  return (
    <section className="fw-welcome" aria-label="Welcome from Mike">
      <div className="fw-welcome-media">
        {vimeoId ? (
          <iframe src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0&title=0&byline=0&portrait=0&dnt=1`} title="Welcome from Mike" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
        ) : (
          <Image src={photo.src} alt="Mike Salemi" fill sizes="(min-width: 960px) 420px, 100vw" style={{ objectFit: "cover", objectPosition: photo.position }} />
        )}
      </div>
      <div className="fw-welcome-body">
        <span className="lq-eyebrow" data-tone="accent">Welcome</span>
        <p className="fw-welcome-quote">&ldquo;Glad you&apos;re here. Start small, show up, and let me guide the rest.&rdquo;</p>
        <span className="fw-welcome-by">— Mike</span>
        <Button size="sm" variant="secondary" onClick={close}>Got it</Button>
      </div>
      <IconButton icon="close" label="Close welcome" size="sm" className="fw-close" onClick={close} />
    </section>
  );
}

/** First-week checklist: first session · reminder time · add to home screen. Hides when done or dismissed. */
export function FirstWeekChecklist({ d, firstSessionHref = "/today" }: { d: FirstWeekData["checklist"]; firstSessionHref?: string }) {
  const [c, setC] = useState(d);
  const items = [
    { id: "first_session" as const, label: "Do your first session", href: firstSessionHref },
    { id: "reminder_time" as const, label: "Pick your reminder time", href: "/you/settings#notifications" },
    { id: "home_screen" as const, label: "Add the app to your home screen", href: null },
  ];
  const done = items.filter((i) => c[i.id]).length;
  if (c.dismissed || done === items.length) return null;
  const tick = (id: (typeof items)[number]["id"] | "dismissed") => {
    setC({ ...c, [id]: true });
    void tickChecklist(id);
  };
  return (
    <section className="fw-check" aria-labelledby="fw-check-h">
      <div className="fw-check-head">
        <h2 id="fw-check-h" className="lq-d-xs">Your first week</h2>
        <span className="lq-num fw-check-count">{done} of {items.length}</span>
        <button type="button" className="fm-link fw-hide" onClick={() => tick("dismissed")}>Hide</button>
      </div>
      <ul>
        {items.map((i) => (
          <li key={i.id} data-done={c[i.id] ? "" : undefined}>
            <span className="fw-tick" aria-hidden>{c[i.id] && <Icon name="check" size="xs" />}</span>
            {c[i.id] ? (
              <s>{i.label}</s>
            ) : i.href ? (
              <Link href={i.href}>{i.label}</Link>
            ) : (
              <button type="button" className="fw-li-btn" onClick={() => tick(i.id)}>{i.label}<span className="fw-li-hint">Browser menu › Add to Home Screen. Tap when done.</span></button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Install prompt after the first completed session (spec 12 › 10). Uses the browser's install
 * prompt where offered (Android/desktop Chrome); iOS gets the Share › Add to Home Screen hint.
 */
export function InstallPrompt({ completedSessions, prompted }: { completedSessions: number; prompted: boolean }) {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    if (prompted || completedSessions < 1) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const onBip = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    // iOS has no install event: show the hint straight away.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isIos) { setIos(true); setShow(true); }
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [completedSessions, prompted]);
  if (!show) return null;
  const done = () => {
    setShow(false);
    void markInstallPrompted();
  };
  return (
    <div className="fw-install" role="dialog" aria-label="Add Mike Salemi to your home screen">
      <span className="fw-install-icon" aria-hidden><Icon name="phone" size="sm" /></span>
      <span className="fw-install-text">
        <b>Nice first session.</b> Keep Mike one tap away{ios ? <>: tap Share, then &ldquo;Add to Home Screen&rdquo;.</> : "."}
      </span>
      {evt && <Button size="sm" onClick={async () => { await evt.prompt(); done(); void tickChecklist("home_screen"); }}>Install</Button>}
      <IconButton icon="close" label="Not now" size="sm" onClick={done} />
    </div>
  );
}

const DRAFT_LABEL: Record<string, string> = { onboarding: "your welcome questions", "kbl-intake": "the KBL intake", "a4l-intake": "the A4L intake", "mtk-intake": "the MTK intake", "retreat-application": "your retreat application", "coaching-application": "your coaching application" };
const DRAFT_HREF: Record<string, string> = { onboarding: "/onboarding" };

/** "Pick up where you left off" — the newest unfinished form draft on this device (Forms 6). */
export function ResumeDraftCard({ hrefs = DRAFT_HREF }: { hrefs?: Record<string, string> }) {
  const [d, setD] = useState<{ key: string; savedAt: string } | null>(null);
  useEffect(() => {
    const first = listDrafts().find((x) => hrefs[x.key]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (first) setD(first);
  }, [hrefs]);
  if (!d) return null;
  return (
    <Link href={hrefs[d.key]!} className="fw-resume lq-press">
      <span className="fw-install-icon" aria-hidden><Icon name="clipboard" size="sm" /></span>
      <span className="fw-install-text"><b>Pick up where you left off</b><br /><span className="fw-li-hint">Finish {DRAFT_LABEL[d.key] ?? "your form"} — your answers are saved.</span></span>
      <Icon name="chevron" size="sm" />
    </Link>
  );
}
