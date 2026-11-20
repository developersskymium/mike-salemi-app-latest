"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button, Icon, Sheet } from "@/components/ui";
import type { CatalogCard } from "./CatalogClient";
import { ProgramCta } from "./ProgramCta";

type Answers = { exp?: "never" | "some" | "regular"; goal?: "strength" | "mobility" | "fat-loss" | "mindset" | "recovery"; days?: "2" | "3" | "4"; pain?: "yes" | "no" };

const QUESTIONS: { key: keyof Answers; q: string; options: { v: string; label: string }[] }[] = [
  { key: "exp", q: "How much have you trained with kettlebells?", options: [{ v: "never", label: "Never or barely" }, { v: "some", label: "A few months" }, { v: "regular", label: "I train with them regularly" }] },
  { key: "goal", q: "What matters most right now?", options: [{ v: "strength", label: "Get stronger" }, { v: "mobility", label: "Move better" }, { v: "fat-loss", label: "Lose fat" }, { v: "mindset", label: "Clear head, more focus" }, { v: "recovery", label: "Recover and restore" }] },
  { key: "days", q: "How many days a week can you train?", options: [{ v: "2", label: "2 days" }, { v: "3", label: "3 days" }, { v: "4", label: "4 or more" }] },
  { key: "pain", q: "Any pain or injury holding you back?", options: [{ v: "no", label: "No, I'm good" }, { v: "yes", label: "Yes, something nags" }] },
];

type Result = { phase: string; slug: string; why: string; path?: string };

/** Find Your Kettlebell Phase: four taps → one recommendation with its reason (All programs #4). */
export function recommend(a: Answers): Result {
  if (a.pain === "yes" || a.goal === "recovery")
    return { phase: "Phase 0 · Restore", slug: "working-in", why: "Short restorative sessions first, so training builds you up instead of wearing you down." };
  if (a.goal === "mindset") return { phase: "Inner work", slug: "the-path-to-inspired-action", why: "You asked for focus and a clear head: Mike's chapters on purpose, habits and action." };
  if (a.exp === "never") return { phase: "Phase 1 · Foundations", slug: "free-6-video-kettlebell-mini-series", why: "Six short free videos teach the swing and the basics safely. Then Kettlebell Lifestyle Level I." };
  if (a.exp === "regular" && a.goal === "mobility") return { phase: "Phase 3 · Skill", slug: "mastering-the-kettlebell", why: "You already train: technique work on every lift will move you further than more volume." };
  if (a.exp === "regular") return { phase: "Phase 3 · Level II", slug: "kettlebell-lifestyle", path: "intermediate", why: `Level II fits someone who already trains, ${a.days === "2" ? "and it works on two days a week" : "with room for your extra days"}.` };
  return { phase: "Phase 2 · Level I", slug: "kettlebell-lifestyle", why: "A day-by-day plan that adapts to your readiness: the best next step after the basics." };
}

export function PhaseQuiz({ open, onClose, programs }: { open: boolean; onClose: () => void; programs: CatalogCard[] }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({});
  const done = step >= QUESTIONS.length;
  const res = done ? recommend(a) : null;
  const prog = res ? programs.find((p) => p.slug === res.slug) : null;
  const close = () => {
    onClose();
    window.setTimeout(() => { setStep(0); setA({}); }, 250);
  };
  const q = QUESTIONS[step];
  return (
    <Sheet open={open} onClose={close} title="Find Your Kettlebell Phase" description={done ? "Your recommendation" : `Question ${step + 1} of ${QUESTIONS.length} · about ${Math.max(15, (QUESTIONS.length - step) * 15)} seconds left`}>
      <div className="ac-quiz">
        <div className="ac-quiz-bar" aria-hidden><span style={{ width: `${(Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100}%` }} /></div>
        {!done && q && (
          <fieldset className="ac-quiz-q">
            <legend className="lq-d-sm">{q.q}</legend>
            {q.options.map((o) => (
              <button
                key={o.v}
                type="button"
                className="ac-quiz-opt lq-t15 lq-press"
                aria-pressed={a[q.key] === o.v}
                onClick={() => {
                  setA((x) => ({ ...x, [q.key]: o.v }));
                  setStep((s) => s + 1);
                }}
              >
                {o.label}
                <Icon name="chevron" size="sm" />
              </button>
            ))}
            {step > 0 && <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>Back</Button>}
          </fieldset>
        )}
        {done && res && (
          <div className="ac-quiz-res">
            <span className="lq-eyebrow" data-tone="warm">{res.phase}</span>
            {prog && (
              <div className="ac-quiz-res-photo">
                <Image src={prog.photo.src} alt={prog.photo.alt} fill sizes="480px" style={{ objectPosition: prog.photo.position }} />
              </div>
            )}
            <h3 className="lq-d-md">{prog?.name ?? res.slug}</h3>
            <p className="lq-t15 lq-c2">{res.why}</p>
            {prog && <ProgramCta access={prog.access} program={prog} size="lg" block />}
            {a.pain !== "yes" && (
              <Link href="/tools/roadmap/test" className="ac-quiz-handoff lq-press">
                <Icon name="map" size="sm" />
                <span><b className="lq-t15">Know for sure: test your phase</b><span className="lq-t13 lq-c2">15–20 minutes of Mike's own benchmarks, counted by the app. Free.</span></span>
                <Icon name="chevron" size="xs" />
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setStep(0); setA({}); }}>Retake</Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
