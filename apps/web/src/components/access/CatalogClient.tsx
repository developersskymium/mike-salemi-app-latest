"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { ProgramAccess } from "@ms/api";
import { Button, Icon, Sheet, cx } from "@/components/ui";
import { programHref } from "@/lib/hrefs";
import { GOALS, type Facts, type Goal } from "./catalog-meta";
import { FactsRow } from "./FactsRow";
import { ProgramCta } from "./ProgramCta";
import { PhaseQuiz } from "./PhaseQuiz";

export type CatalogCard = {
  id: string;
  slug: string;
  name: string;
  type: string;
  tagline: string | null;
  photo: { src: string; alt: string; position: string };
  access: ProgramAccess | null;
  goals: Goal[];
  facts: Facts | null;
  also: string | null;
  experience: boolean;
  format: string | null;
  lessons: number;
};

type Props = { yours: CatalogCard[]; included: CatalogCard[]; explore: CatalogCard[]; inPerson: CatalogCard[]; planName: string | null };

const TYPES = [
  { key: "all", label: "All" },
  { key: "free", label: "Free" },
  { key: "program", label: "Programs" },
  { key: "course", label: "Courses" },
] as const;
type TypeKey = (typeof TYPES)[number]["key"];

const money = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

/** Access-state label on every card (All programs #2). */
export function stateLabel(a: ProgramAccess | null): { text: string; tone: "ok" | "accent" | "warm" | "plain"; icon?: "check" | "lock" } {
  switch (a?.state) {
    case "owned":
      return { text: "Owned", tone: "ok", icon: "check" };
    case "included":
      return { text: a.planName ? `In your ${a.planName} plan` : "Included", tone: "ok", icon: "check" };
    case "free":
      return { text: "Free", tone: "accent" };
    case "buy":
      return { text: a.amountCents != null ? money(a.amountCents) : "Buy", tone: "plain", icon: "lock" };
    case "upgrade":
      return { text: `In ${a.upgradePlanName ?? "a plan"}`, tone: "plain", icon: "lock" };
    case "apply":
      return { text: "By application", tone: "warm" };
    default:
      return { text: "Coming soon", tone: "plain" };
  }
}

function matches(c: CatalogCard, goal: Goal | null, type: TypeKey) {
  if (goal && !c.goals.includes(goal)) return false;
  if (type === "free") return c.access?.state === "free";
  if (type === "program") return c.type === "day_program";
  if (type === "course") return c.type === "course" || c.type === "tool";
  return true;
}

function Card({ c, picked, onPick, canPick }: { c: CatalogCard; picked: boolean; onPick: () => void; canPick: boolean }) {
  const label = stateLabel(c.access);
  const [preview, setPreview] = useState(false);
  const timer = useRef<number | null>(null);
  const start = () => {
    setPreview(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPreview(false), 6000);
  };
  const stop = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setPreview(false);
  };
  const href = programHref(c.slug, c.type);
  return (
    <article className="ac-card" data-preview={preview ? "" : undefined}>
      <Link
        href={href}
        prefetch
        className="ac-card-photo"
        onMouseEnter={start}
        onMouseLeave={stop}
        onTouchStart={() => (timer.current = window.setTimeout(start, 450))}
        onTouchEnd={() => !preview && timer.current && window.clearTimeout(timer.current)}
        aria-label={c.name}
      >
        <Image src={c.photo.src} alt={c.photo.alt} fill sizes="(min-width: 1200px) 380px, (min-width: 700px) 45vw, 100vw" style={{ objectPosition: c.photo.position }} />
        <span className={cx("ac-state lq-t12")} data-tone={label.tone}>
          {label.icon && <Icon name={label.icon} size="xs" />} {label.text}
        </span>
        {preview && (
          <span className="ac-preview lq-t12" aria-hidden>
            <Icon name="play" size="xs" /> Lesson 1 preview
          </span>
        )}
      </Link>
      <div className="ac-card-body">
        <h3 className="lq-d-xs">
          <Link href={href} prefetch className="ac-card-title">{c.name}</Link>
        </h3>
        {c.tagline && <p className="lq-t13 lq-c2 ac-clamp">{c.tagline}</p>}
        {c.facts && <FactsRow facts={c.facts} compact />}
        {c.also && <p className="lq-t12 lq-c3 ac-also">Members also took {c.also}</p>}
        <div className="ac-card-foot">
          <ProgramCta access={c.access} program={c} variant={c.access?.state === "buy" || c.access?.state === "upgrade" ? "glass" : "filled"} size="sm" showNote={false} />
          {canPick && (
            <label className="ac-pick lq-t12">
              <input type="checkbox" checked={picked} onChange={onPick} /> Compare
            </label>
          )}
        </div>
      </div>
    </article>
  );
}

function Section({ title, sub, cards, picked, toggle }: { title: string; sub?: string; cards: CatalogCard[]; picked: string[]; toggle: (id: string) => void }) {
  if (!cards.length) return null;
  return (
    <section className="ac-sec" aria-label={title}>
      <header className="ac-sec-head">
        <h2 className="lq-d-sm">{title}</h2>
        {sub && <p className="lq-t13 lq-c2">{sub}</p>}
      </header>
      <div className="ac-grid">
        {cards.map((c) => (
          <Card key={c.id} c={c} picked={picked.includes(c.id)} onPick={() => toggle(c.id)} canPick={picked.includes(c.id) || picked.length < 3} />
        ))}
      </div>
    </section>
  );
}

export function CatalogClient({ yours, included, explore, inPerson, planName }: Props) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [type, setType] = useState<TypeKey>("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [quiz, setQuiz] = useState(false);
  const all = useMemo(() => [...yours, ...included, ...explore, ...inPerson], [yours, included, explore, inPerson]);
  const f = (list: CatalogCard[]) => list.filter((c) => matches(c, goal, type));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));
  const chosen = picked.map((id) => all.find((c) => c.id === id)).filter((c): c is CatalogCard => !!c);
  const shown = [f(yours), f(included), f(explore)];
  const nothing = shown.every((l) => l.length === 0);

  return (
    <div className="ac-cat">
      <header className="ac-cat-head">
        <div>
          <h1 className="lq-d-xl">Programs</h1>
          <p className="lq-lede lq-c2">Train with Mike: your programs, what your plan includes, and where to go next.</p>
        </div>
        <button type="button" className="ac-quiz-cta lq-press" onClick={() => setQuiz(true)}>
          <span className="ac-quiz-ico" aria-hidden><Icon name="compass" size="md" /></span>
          <span>
            <span className="lq-t15" style={{ fontWeight: 650, display: "block" }}>Not sure where to start?</span>
            <span className="lq-t13 lq-c2">Find Your Kettlebell Phase — 60 seconds</span>
          </span>
          <Icon name="chevron" size="sm" />
        </button>
      </header>

      <div className="ac-filters" role="toolbar" aria-label="Filter programs">
        {TYPES.map((t) => (
          <button key={t.key} type="button" className="ac-chip lq-t13" aria-pressed={type === t.key} onClick={() => setType(t.key)}>
            {t.label}
          </button>
        ))}
        <span className="ac-filters-sep" aria-hidden />
        {GOALS.map((g) => (
          <button key={g.key} type="button" className="ac-chip lq-t13" aria-pressed={goal === g.key} onClick={() => setGoal(goal === g.key ? null : g.key)}>
            {g.label}
          </button>
        ))}
      </div>

      <Section title="Your programs" cards={shown[0]!} picked={picked} toggle={toggle} />
      <Section title="Included in your plan" sub={planName ? `Part of your ${planName} plan — start any time.` : undefined} cards={shown[1]!} picked={picked} toggle={toggle} />
      <Section title="Explore" sub="Free first, then programs you can add." cards={shown[2]!} picked={picked} toggle={toggle} />
      {nothing && (
        <p className="lq-t15 lq-c2 ac-empty">
          Nothing matches those filters.{" "}
          <button type="button" className="ac-link" onClick={() => { setGoal(null); setType("all"); }}>Clear filters</button>
        </p>
      )}

      {inPerson.length > 0 && type === "all" && !goal && (
        <section className="ac-band" aria-label="Train with Mike in person">
          <header className="ac-sec-head">
            <h2 className="lq-d-sm">Train with Mike in person</h2>
            <p className="lq-t13 lq-c2">Coaching, challenges and retreats. Each starts with a short application.</p>
          </header>
          <div className="ac-band-row">
            {inPerson.map((c) => (
              <Link key={c.id} href={programHref(c.slug, c.type)} prefetch className="ac-band-card">
                <Image src={c.photo.src} alt={c.photo.alt} fill sizes="(min-width: 1000px) 300px, 70vw" style={{ objectPosition: c.photo.position }} />
                <span className="ac-band-scrim" />
                <span className="ac-band-text">
                  <span className="lq-t12 ac-band-eyebrow">{c.facts?.level ?? "By application"}</span>
                  <span className="lq-d-xs">{c.name}</span>
                  <span className="lq-t12 ac-band-apply">Apply <Icon name="chevron" size="xs" /></span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {chosen.length > 0 && (
        <div className="ac-compare-bar" role="region" aria-label="Compare">
          <span className="lq-t13">{chosen.length} selected{chosen.length < 2 ? " — pick one more" : ""}</span>
          <Button variant="ghost" size="sm" onClick={() => setPicked([])}>Clear</Button>
          <Button variant="filled" size="sm" disabled={chosen.length < 2} onClick={() => setComparing(true)}>Compare</Button>
        </div>
      )}

      <Sheet open={comparing} onClose={() => setComparing(false)} title="Compare programs">
        <div className="ac-compare" style={{ gridTemplateColumns: `120px repeat(${chosen.length}, minmax(0, 1fr))` }}>
          <span />
          {chosen.map((c) => (
            <div key={c.id} className="ac-compare-head">
              <div className="ac-compare-thumb"><Image src={c.photo.src} alt="" fill sizes="200px" style={{ objectPosition: c.photo.position }} /></div>
              <b className="lq-t15">{c.name}</b>
            </div>
          ))}
          {([
            ["Access", (c: CatalogCard) => stateLabel(c.access).text],
            ["Length", (c: CatalogCard) => c.facts?.weeks ?? c.format ?? "—"],
            ["Per session", (c: CatalogCard) => c.facts?.minutes ?? "—"],
            ["Equipment", (c: CatalogCard) => c.facts?.equipment ?? "—"],
            ["Level", (c: CatalogCard) => c.facts?.level ?? "—"],
            ["Good for", (c: CatalogCard) => c.goals.map((g) => GOALS.find((x) => x.key === g)?.label).join(", ") || "—"],
            ["Lessons", (c: CatalogCard) => (c.lessons ? String(c.lessons) : "—")],
          ] as const).map(([label, get]) => (
            <div key={label} className="ac-compare-row" style={{ display: "contents" }}>
              <span className="lq-t12 lq-c2 ac-compare-label">{label}</span>
              {chosen.map((c) => (
                <span key={c.id} className="lq-t13 ac-compare-cell">{get(c)}</span>
              ))}
            </div>
          ))}
          <span />
          {chosen.map((c) => (
            <div key={c.id} className="ac-compare-cell">
              <ProgramCta access={c.access} program={c} size="sm" showNote={false} />
            </div>
          ))}
        </div>
      </Sheet>

      <PhaseQuiz open={quiz} onClose={() => setQuiz(false)} programs={all} />
    </div>
  );
}
