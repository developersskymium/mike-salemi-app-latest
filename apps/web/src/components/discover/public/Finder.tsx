"use client";

import { useState } from "react";
import { Button, Icon, Tag, type IconName } from "@/components/ui";
import { Photo } from "./Pieces";
import { photoFor } from "./photos";

/** Programs the finder can recommend (only those that exist in the live catalog are passed in). */
export type FinderProgram = { slug: string; name: string; line: string | null; free: boolean };

type Level = "new" | "some" | "years";
type Goal = "strength" | "technique" | "move" | "reset";
type Style = "daily" | "own" | "mike";
type Answers = { level?: Level; goal?: Goal; style?: Style };

const QUESTIONS = [
  {
    key: "level" as const,
    q: "Where are you with kettlebells?",
    opts: [
      { v: "new", t: "Brand new", s: "I've never really trained with one", icon: "sparkle" as IconName },
      { v: "some", t: "I've swung a bell", s: "Some experience, no real plan", icon: "kettlebell" as IconName },
      { v: "years", t: "I train regularly", s: "I want the next level", icon: "trophy" as IconName },
    ],
  },
  {
    key: "goal" as const,
    q: "What do you want most right now?",
    opts: [
      { v: "strength", t: "Get strong and consistent", s: "A plan I can actually follow", icon: "dumbbell" as IconName },
      { v: "technique", t: "Master the technique", s: "Swing, clean, press and snatch done right", icon: "steps" as IconName },
      { v: "move", t: "Move and feel better", s: "Mobility, breath and recovery", icon: "leaf" as IconName },
      { v: "reset", t: "Step away and reset", s: "Time on the mountain with other men", icon: "mountain" as IconName },
    ],
  },
  {
    key: "style" as const,
    q: "How do you like to learn?",
    opts: [
      { v: "daily", t: "Tell me what to do each day", s: "A day-by-day plan", icon: "calendar" as IconName },
      { v: "own", t: "At my own pace", s: "Lessons I can work through", icon: "library" as IconName },
      { v: "mike", t: "Directly with Mike", s: "Coaching or in person", icon: "coaching" as IconName },
    ],
  },
];

type Rec = { slug: string; why: string[]; also?: string };

function recommend(a: Required<Answers>, has: (s: string) => boolean): Rec {
  const pick = (...slugs: string[]) => slugs.find(has) ?? "kettlebell-lifestyle";
  if (a.goal === "reset") {
    return {
      slug: pick("men-of-movement-retreats", "men-of-movement"),
      why: ["Four days of movement, breath and brotherhood on Mount Shasta", "Apply, talk it through with the team, then confirm your place", "A free preparation series opens before you go"],
      also: a.style !== "mike" ? "kettlebell-lifestyle" : undefined,
    };
  }
  if (a.style === "mike") {
    return {
      slug: pick("coaching"),
      why: ["Your program adapted to your body, schedule and goals", "Feedback on your technique from Mike", "Accountability week to week"],
      also: a.goal === "technique" ? "mastering-the-kettlebell" : "kettlebell-lifestyle",
    };
  }
  if (a.goal === "move") {
    return a.level === "years"
      ? { slug: pick("athleticism-4-life", "working-in"), why: ["Athletic movement, breathing and mobility in one course", "Built for people who already train", "Work through it at your own pace"], also: "working-in" }
      : { slug: pick("working-in", "athleticism-4-life"), why: ["Short practices for breath, flow and grounding", "Made by Mike with Paul Chek", "A calm counterweight to hard training days"], also: "kettlebell-lifestyle" };
  }
  if (a.goal === "technique" && a.level !== "new") {
    return {
      slug: pick("mastering-the-kettlebell"),
      why: ["Every movement broken down, from foundations to performance", "Choose a focus: ballistics, overhead or lower body", a.style === "daily" ? "Pair it with Kettlebell Lifestyle for the daily plan" : "Learn at your own pace"],
      also: "what-your-kettlebell-swing-is-missing",
    };
  }
  return {
    slug: pick("kettlebell-lifestyle"),
    why: [
      a.level === "years" ? "Start at Level II: denser conditioning, double bells and snatch work" : "Start at Level I: the swing, squat, press and clean from the ground up",
      a.style === "own" ? "Self-Guided mode lets you go at your own pace" : "Nine weeks, day by day: warm-up, workout and stretch in order",
      "A readiness check adapts each day to how you feel",
    ],
    also: a.level === "new" ? "what-your-kettlebell-swing-is-missing" : "mastering-the-kettlebell",
  };
}

/** The 3-tap program finder: three questions, one recommendation with the reasons and one action. */
export function Finder({ programs, signedIn }: { programs: FinderProgram[]; signedIn: boolean }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({});
  const by = new Map(programs.map((p) => [p.slug, p]));
  const done = step >= QUESTIONS.length;
  const rec = done ? recommend(a as Required<Answers>, (s) => by.has(s)) : null;
  const prog = rec ? by.get(rec.slug) : undefined;
  const also = rec?.also ? by.get(rec.also) : undefined;
  const q = QUESTIONS[Math.min(step, QUESTIONS.length - 1)]!;

  const choose = (v: string) => {
    setA((x) => ({ ...x, [q.key]: v }));
    setStep((s) => s + 1);
  };
  const reset = () => {
    setA({});
    setStep(0);
  };

  return (
    <div className="pub-finder-card" aria-live="polite">
      <div className="pub-finder-top">
        <div className="pub-finder-dots" aria-label={done ? "Your recommendation" : `Question ${step + 1} of 3`}>
          {QUESTIONS.map((_, i) => (
            <i key={i} data-done={i < step ? "" : undefined} data-on={i === step ? "" : undefined} />
          ))}
        </div>
        {step > 0 && (
          <button type="button" className="pub-finder-back" onClick={done ? reset : () => setStep((s) => s - 1)}>
            <Icon name={done ? "repeat" : "back"} size="xs" /> {done ? "Start over" : "Back"}
          </button>
        )}
      </div>

      {!done ? (
        <>
          <p className="lq-eyebrow" data-tone="warm" style={{ margin: 0 }}>Question {step + 1} of 3</p>
          <h3 className="lq-d-md pub-finder-q">{q.q}</h3>
          <div className="pub-finder-opts" key={q.key}>
            {q.opts.map((o) => (
              <button key={o.v} type="button" className="pub-opt" onClick={() => choose(o.v)} aria-pressed={a[q.key] === o.v}>
                <span className="pub-opt-ic"><Icon name={o.icon} size="sm" /></span>
                <span>
                  <b>{o.t}</b>
                  <small>{o.s}</small>
                </span>
                <Icon name="chevron" size="xs" />
              </button>
            ))}
          </div>
        </>
      ) : prog && rec ? (
        <div className="pub-rec">
          <p className="lq-eyebrow" data-tone="warm" style={{ margin: 0 }}>Your best next step</p>
          <div className="pub-rec-card">
            <Photo p={photoFor(prog.slug)} sizes="(min-width: 720px) 180px, 90vw" />
            <div className="pub-rec-body">
              <Tag tone={prog.free ? "ok" : "accent"}>{prog.free ? "Free" : "Recommended"}</Tag>
              <h4 className="lq-d-sm">{prog.name}</h4>
              <ul className="pub-rec-why">
                {rec.why.map((w) => (
                  <li key={w}>
                    <Icon name="check" size="xs" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pub-rec-actions">
            <Button href={`/explore/${prog.slug}`} size="md" iconAfter="arrowRight">See {prog.name.split(":")[0]}</Button>
            {!signedIn && <Button href="/signup" size="md" variant="secondary">Start free</Button>}
          </div>
          {also && also.slug !== prog.slug && (
            <p className="pub-rec-also">
              Also good: <a className="pub-link" href={`/explore/${also.slug}`}>{also.name}</a>
              {also.free ? " (free)" : ""}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
