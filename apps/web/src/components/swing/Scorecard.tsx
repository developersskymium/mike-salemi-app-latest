"use client";

import { embedUrl, fixFor, SELF_CHECKS, SWING_STEPS, type FaultId, type StepStatus, type SwingClip, type SwingFix, type SwingStepId } from "@ms/core";
import Link from "next/link";
import { useState } from "react";
import { Button, Icon } from "@/components/ui";
import { lessonHref, type SavedCheck } from "@/lib/swing";
import { cueText } from "./Overlay";
import { PostureFigure, PostureLegend } from "./PostureFigure";

const STATUS: Record<StepStatus, string> = { good: "Good", adjust: "Adjust", self: "Self-check", cant: "Can't see it" };
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n))}°`;

/** What the camera measured for a step, in plain words. */
function readout(id: SwingStepId, m: SavedCheck["measures"]): string | null {
  if (id === "hips") {
    const parts: string[] = [];
    if (m.shin != null) parts.push(`Shins ${Math.round(m.shin)}° from vertical`);
    if (m.hip != null) parts.push(m.hip <= 0.05 ? "hips at or below the knees" : m.hip >= 0.95 ? "hips above the shoulders" : "hips between knees and shoulders");
    return parts.join(", ") || null;
  }
  if (id === "back") return m.torsoRatio != null ? `Back length ${Math.round(m.torsoRatio * 100)}% of standing tall` : null;
  if (id === "shoulders") return m.gapRatio != null ? `Shoulder-to-ear gap ${Math.round(m.gapRatio * 100)}% of standing tall` : null;
  if (id === "head") return m.head != null ? `Head ${signed(m.head)} against your back line` : null;
  return null;
}

const CANT_HOW: Partial<Record<SwingStepId, string>> = {
  hips: "Film side-on with your knees and ankles in the frame.",
  back: "Stand tall for the full 2 seconds first, side-on, in fitted clothes.",
  shoulders: "Stand tall for the full 2 seconds first, with your ear and shoulder clear of your arms.",
  head: "Keep your head in the frame and the light in front of you.",
};

export function Scorecard({ check, onAgain, onHome, saving, bellKg }: { check: SavedCheck; onAgain: () => void; onHome: () => void; saving?: "saving" | "saved" | "preview" | "error" | null; bellKg?: number }) {
  const neck = !!check.measures.neck_history;
  const fix = check.main_fault ? fixFor(check.main_fault, neck) : null;
  const also = check.faults.filter((f) => f !== check.main_fault).slice(0, 2).map((f: FaultId) => fixFor(f, neck));
  const measured = SWING_STEPS.filter((s) => s.measured);
  const goodCount = measured.filter((s) => check.steps[s.id] === "good").length;
  const cantAll = measured.every((s) => check.steps[s.id] === "cant");
  const date = new Date(check.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div className="sw-score">
      <header className="sw-score-head">
        <button type="button" className="sw-back" onClick={onHome}><Icon name="back" size="xs" /> Swing Set-Up Coach</button>
        <h1 className="sw-h1">Your set-up, {date}</h1>
        <p className="sw-body sw-c2">
          {cantAll ? "The camera couldn't see your set-up clearly enough to judge it." : `${goodCount} of 4 camera-checked steps look right.`}
          {saving === "saved" && " Saved to your account."}
          {saving === "preview" && " Preview: not saved."}
          {saving === "error" && " This check didn't save."}
        </p>
      </header>

      <div className="sw-score-grid">
        <figure className="sw-figure">
          <div className="sw-pfcard sw-pfcard-lg">
            <PostureFigure check={check} bellKg={bellKg} />
          </div>
          <figcaption><PostureLegend check={check} /></figcaption>
        </figure>

        <div className="sw-score-main">
          {fix ? <FixCard fix={fix} /> : cantAll ? <CantCard /> : <AllGood />}
          {also.length > 0 && (
            <section className="sw-also" aria-labelledby="sw-also-h">
              <h2 id="sw-also-h" className="sw-h3">Next time, after that</h2>
              <ul>
                {also.map((a) => (
                  <li key={a.fault}><b>{a.title}.</b> <span className="sw-c2">“{cueText(a.cue)}”</span></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <section className="sw-steplist" aria-labelledby="sw-steps-h">
        <h2 id="sw-steps-h" className="sw-h2">Mike’s 7 steps</h2>
        <ol>
          {SWING_STEPS.map((s) => {
            const status = check.steps[s.id] ?? "cant";
            const self = s.id === "feet" || s.id === "grip" || s.id === "breath" ? SELF_CHECKS[s.id] : null;
            const read = readout(s.id, check.measures);
            return (
              <li key={s.id} className="sw-step" data-status={status}>
                <span className="sw-step-n" aria-hidden>{s.n}</span>
                <div className="sw-step-body">
                  <p className="sw-step-title">{s.title}</p>
                  {status === "cant" && <p className="sw-step-text">{CANT_HOW[s.id] ?? "Film it side-on, head to feet."}</p>}
                  {status !== "cant" && read && <p className="sw-step-text">{read}{(s.id === "back" || s.id === "shoulders" || s.id === "head") && <span className="sw-c3"> · approximate</span>}</p>}
                  {s.id === "feet" && check.measures.bell_distance && check.measures.bell_distance !== "unsure" && (
                    <p className="sw-step-text">You said the bell was {check.measures.bell_distance === "ok" ? "about a foot in front of your toes" : check.measures.bell_distance === "far" ? "further than 1.5 ft" : "closer than 6 inches"}.</p>
                  )}
                  {self && <p className="sw-step-text">{self.prompt} <span className="sw-quote">“{cueText(self.cue)}”</span></p>}
                </div>
                <span className="sw-pill" data-status={status}>{STATUS[status]}</span>
                <Link href={lessonHref(s.id)} className="sw-step-link" aria-label={`Watch Step ${s.n}: ${s.title}`}><Icon name="play" size="xs" /></Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="sw-actions sw-score-actions">
        <Button variant="filled" size="lg" icon="video" onClick={onAgain}>Check again</Button>
        <Button variant="secondary" size="lg" onClick={onHome}>Back to the coach</Button>
      </div>
      <p className="sw-safety"><Icon name="info" size="xs" /> Pain, dizziness or shortness of breath: stop and see a professional. This check looks at your position only.</p>
    </div>
  );
}


function FixCard({ fix }: { fix: SwingFix }) {
  return (
    <section className="sw-fix" aria-labelledby="sw-fix-h">
      <p className="sw-kicker" data-tone="warm">Fix this first · Step {SWING_STEPS.find((s) => s.id === fix.step)?.n}</p>
      <h2 id="sw-fix-h" className="sw-fix-title">{fix.title}</h2>
      <blockquote className="sw-cue">
        <p>“{cueText(fix.cue)}”</p>
        <cite>Mike Salemi</cite>
      </blockquote>
      <p className="sw-body">{fix.why}</p>
      <p className="sw-body"><b>Do this:</b> {fix.do}</p>
      <ClipPlayer clip={fix.clip} />
    </section>
  );
}

function ClipPlayer({ clip }: { clip: SwingClip }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sw-clip">
      {open ? (
        <div className="sw-clip-frame">
          <iframe src={embedUrl({ providerId: clip.video, privacyHash: null }, { autoplay: true, startAt: clip.start })} title={`Mike: ${clip.label}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <button type="button" className="sw-clip-btn" onClick={() => setOpen(true)}>
          <span className="sw-clip-play" aria-hidden><Icon name="play" size="sm" /></span>
          <span><b>Watch Mike show it</b><small>{clip.label} · from {mmss(clip.start)}</small></span>
        </button>
      )}
      <Link href={lessonHref(clip.step)} className="sw-clip-lesson">Open the full lesson <Icon name="chevron" size="xs" /></Link>
    </div>
  );
}

function AllGood() {
  return (
    <section className="sw-fix" data-tone="ok" aria-labelledby="sw-good-h">
      <p className="sw-kicker" data-tone="ok">Nothing to fix from the camera</p>
      <h2 id="sw-good-h" className="sw-fix-title">Your set-up is on track</h2>
      <p className="sw-body">Run through the three self-checks below: feet, grip and breath. Then make the first rep look like the last.</p>
    </section>
  );
}

function CantCard() {
  return (
    <section className="sw-fix" aria-labelledby="sw-cant-h">
      <p className="sw-kicker">Can’t see it</p>
      <h2 id="sw-cant-h" className="sw-fix-title">Let’s film it again</h2>
      <ul className="sw-list">
        <li>Phone side-on, at hip height, 2–3 m away.</li>
        <li>Head to feet in the frame, the light in front of you.</li>
        <li>Fitted clothes, so the camera can find your hips and knees.</li>
      </ul>
    </section>
  );
}
