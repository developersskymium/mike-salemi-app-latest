"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import type { CatalogProgram } from "@ms/api";
import { EmptyState, Icon, IconButton, Tag } from "@/components/ui";
import { coverFor, MIKE_FACE } from "@/lib/covers";
import type { Enrollment, ProgramsCopy } from "@/lib/loaders/discover";
import { recommend } from "./recommend";
import "./catalog.css";
import { lessonHrefOf, programHref as finalProgramHref } from "@/lib/hrefs";

/* Programs catalog (approved Summit mockup 05, legacy layout L2): PageHead + search + filters with
   "Your path with Mike" → Flagship (Kettlebell Lifestyle) → verticals of image-led cards with
   progress and reasons → "Tell Mike your goals" → closing note. */

export const VERTICALS = [
  { id: "mastery", eyebrow: "Technique & progressions", title: "Kettlebell Mastery", note: "Technique, progressions and the details that make every lift click." },
  { id: "athletic", eyebrow: "Strength & conditioning", title: "Athletic Performance", note: "Structured training blocks for strength, power and movement capacity." },
  { id: "mind-body", eyebrow: "Recovery & inner work", title: "Mind-Body, Longevity & Retreats", note: "Inner work, recovery and in-person journeys with Mike." },
  { id: "deeper", eyebrow: "Go deeper", title: "Coaching & specializations", note: "Direct work with Mike and small-group experiences." },
] as const;
type VerticalId = (typeof VERTICALS)[number]["id"];

const VERTICAL_OF: Record<string, VerticalId> = {
  "mastering-the-kettlebell": "mastery",
  "what-your-kettlebell-swing-is-missing": "mastery",
  "free-6-video-kettlebell-mini-series": "mastery",
  "essential-kettlebell-training-strength": "mastery",
  "athleticism-4-life": "athletic",
  "the-training-room": "athletic",
  "working-in": "mind-body",
  "men-of-movement": "mind-body",
  "men-of-movement-retreats": "mind-body",
  "the-path-to-inspired-action": "mind-body",
};
/** Kettlebell Roadmap lives in Tools › Free resources; Kettlebell Lifestyle is the flagship block. */
const HIDDEN = new Set(["kettlebell-roadmap", "kettlebell-lifestyle"]);
const KBL = "kettlebell-lifestyle";

function verticalOf(p: CatalogProgram): VerticalId {
  // 1:1 coaching sits with the training programs (approved mockup); concept programs go deeper.
  if (p.slug === "coaching") return "athletic";
  if (p.type === "coaching" || p.type === "challenge" || p.type === "live") return "deeper";
  const v = p.vertical as VerticalId | null;
  if (v && VERTICALS.some((x) => x.id === v)) return v;
  if (VERTICAL_OF[p.slug]) return VERTICAL_OF[p.slug]!;
  if (p.type === "retreat") return "mind-body";
  return "mastery";
}

const isOpen = (p: CatalogProgram) => ["owned", "free", "included", "org"].includes(p.access);
const isDraft = (p: CatalogProgram) => Boolean(p.draftNote && /await|concept|draft|tbc/i.test(p.draftNote)) || /draft|to be confirmed/i.test(p.priceLabel ?? "");

/** Where a program opens: courses go straight to their journey home. */
/** The program's final URL (lib/hrefs): courses → journey home, experiences → their own page, no redirect hop. */
export function programHref(p: Pick<CatalogProgram, "slug" | "type">) {
  return finalProgramHref(p.slug, p.type);
}

function cardCover(p: CatalogProgram) {
  const m = p.media.find((x) => x.role === "card") ?? p.media.find((x) => x.role === "hero") ?? p.media[0];
  return coverFor(p.slug, m?.url ?? null, p.cover);
}

type Filter = "all" | "plan" | "free" | "course" | "retreat" | "coaching";
const FILTERS: { id: Filter; label: string; test: (p: CatalogProgram) => boolean }[] = [
  { id: "all", label: "All programs", test: () => true },
  { id: "plan", label: "Included with your plan", test: (p) => ["owned", "included", "org"].includes(p.access) },
  { id: "free", label: "Free", test: (p) => p.access === "free" || p.isFree },
  { id: "course", label: "Courses", test: (p) => p.type === "course" || p.type === "day_program" },
  { id: "retreat", label: "Retreats", test: (p) => p.type === "retreat" },
  { id: "coaching", label: "Coaching", test: (p) => p.type === "coaching" || p.type === "live" || p.type === "challenge" },
];

type Props = { catalog: CatalogProgram[]; enrollments: Enrollment[]; copy?: ProgramsCopy };

export function Catalog({ catalog, enrollments, copy }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const needle = query.trim().toLowerCase();
  const enrolledBy = useMemo(() => {
    const m = new Map<string, Enrollment>();
    for (const e of [...enrollments].sort((a, b) => (a.last_active_at ?? "").localeCompare(b.last_active_at ?? ""))) m.set(e.program_id, e);
    return m;
  }, [enrollments]);
  const { reasons, best } = useMemo(() => recommend(catalog, enrollments), [catalog, enrollments]);
  const f = FILTERS.find((x) => x.id === filter)!;
  const match = (p: CatalogProgram) => f.test(p) && (!needle || [p.name, p.summary, p.tagline, ...p.highlights].some((x) => x?.toLowerCase().includes(needle)));
  const listed = catalog.filter((p) => !HIDDEN.has(p.slug) && p.catalogGroup !== "hidden");
  const shown = listed.filter(match);
  const ordered = [...shown.filter(isOpen), ...shown.filter((p) => !isOpen(p))];
  const kbl = catalog.find((p) => p.slug === KBL);
  const showKbl = kbl && match(kbl);
  const kblE = kbl ? enrollments.filter((e) => e.program_id === kbl.id && !e.completed_at).sort((a, b) => (b.last_active_at ?? "").localeCompare(a.last_active_at ?? ""))[0] : undefined;
  const any = showKbl || ordered.length > 0;
  const count = (id: Filter) => [...listed, ...(kbl ? [kbl] : [])].filter(FILTERS.find((x) => x.id === id)!.test).length;

  return (
    <div className="pc">
      <header className="pc-head">
        <div className="pc-intro">
          <p className="pc-eyebrow">Beyond the program</p>
          <h1 className="pc-title">{copy?.title || "Choose your next program"}</h1>
          <p className="pc-lede">{copy?.intro || "Every course, guided experience and deeper practice in one place. Start with what supports you now — anything you own opens straight into the experience."}</p>
          <label className="pc-search">
            <Icon name="search" size="sm" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search programs, skills or outcomes" aria-label="Search programs" enterKeyHint="search" />
            {query && <IconButton icon="close" label="Clear search" variant="plain" size="sm" iconSize="xs" onClick={() => setQuery("")} />}
          </label>
          <div className="pc-filters" role="radiogroup" aria-label="Show">
            {FILTERS.map((x) => {
              const n = x.id === "plan" || x.id === "free" ? count(x.id) : null;
              if (n === 0) return null;
              return (
                <button key={x.id} type="button" role="radio" aria-checked={filter === x.id} className="pc-filter" onClick={() => setFilter(x.id)}>
                  {x.label}{n !== null && <span className="lq-num"> · {n}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <PathCard catalog={catalog} enrollments={enrollments} kblE={kblE} />
      </header>

      {showKbl && kbl && (
        <section aria-labelledby="pc-flag-t" className="pc-group">
          <GroupHead id="pc-flag-t" eyebrow="Flagship program" title="Kettlebell Lifestyle" />
          <Flagship kbl={kbl} e={kblE} copy={copy?.kblCopy ?? null} />
        </section>
      )}

      {VERTICALS.map((v) => {
        const items = ordered.filter((p) => verticalOf(p) === v.id);
        if (!items.length) return null;
        return (
          <section key={v.id} aria-labelledby={`pc-${v.id}`} className="pc-group">
            <GroupHead id={`pc-${v.id}`} eyebrow={v.eyebrow} title={v.title} note={v.note} count={items.length} />
            <ul className="pc-grid">
              {items.map((p, i) => (
                <li key={p.id}>
                  <ProgramCard p={p} e={enrolledBy.get(p.id)} reason={reasons.get(p.slug)?.reason ?? null} best={best === p.slug} priority={i < 3 && v.id === "mastery"} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {!any && (
        <EmptyState title={`Nothing matches “${query.trim() || f.label}”`} body="Try a movement, a skill or an outcome, like swing, strength or recovery." icon="search" />
      )}

      <Link href="/tools" className="pc-free lq-press">
        <span className="pc-free-ic" aria-hidden><Icon name="route" size="sm" /></span>
        <span className="pc-free-t">
          <span className="pc-eyebrow">Free resources</span>
          <b>Kettlebell Roadmap and coaching tools</b>
          <small>Find your phase of training, plus the bell selector, stretch test and readiness check.</small>
        </span>
        <Icon name="chevron" size="sm" />
      </Link>

      <section className="pc-goals" aria-labelledby="pc-goals-h">
        <div>
          <p className="pc-eyebrow" data-tone="light">Not sure what&apos;s next?</p>
          <h2 id="pc-goals-h">Tell Mike your goals — get a recommendation in 2 minutes.</h2>
          <p>Answer a few questions and we&apos;ll map the right program, level and pace for you.</p>
        </div>
        <Link href="/onboarding" className="pc-goals-cta lq-press">Find my program <Icon name="arrowRight" size="xs" /></Link>
      </section>

      <p className="pc-note">Everything here lives inside your account. Open a program to read the full breakdown, and anything you already have access to opens straight into the experience.</p>
    </div>
  );
}

function GroupHead({ id, eyebrow, title, note, count }: { id: string; eyebrow: string; title: string; note?: string; count?: number }) {
  return (
    <div className="pc-ghead">
      <div>
        <p className="pc-eyebrow">{eyebrow}</p>
        <h2 id={id} className="pc-h2">{title}</h2>
        {note && <p className="pc-gnote">{note}</p>}
      </div>
      {count !== undefined && <span className="pc-gcount lq-num">{count} {count === 1 ? "program" : "programs"}</span>}
    </div>
  );
}

function Ring({ value, size = 50 }: { value: number; size?: number }) {
  const r = size / 2 - 3.5;
  const c = 2 * Math.PI * r;
  return (
    <span className="pc-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} className="pc-ring-t" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} strokeLinecap="round" className="pc-ring-f" strokeDasharray={`${(c * Math.max(0, Math.min(1, value))).toFixed(1)} ${c.toFixed(1)}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="lq-num">{Math.round(value * 100)}%</span>
    </span>
  );
}

function Flagship({ kbl, e, copy }: { kbl: CatalogProgram; e?: Enrollment; copy: string | null }) {
  const cover = coverFor(KBL);
  const pct = e && e.lessons_total ? e.lessons_done / e.lessons_total : 0;
  const levels = kbl.paths.filter((x) => x.kind === "level").length || 2;
  const day = e?.current_lesson_title?.match(/^Day\s+(\d+)/i)?.[1];
  return (
    <Link href={`/programs/${kbl.slug}`} className="pc-flag lq-press" aria-label={`${e ? "Continue" : "Enter"} Kettlebell Lifestyle`}>
      <span className="pc-flag-photo" style={{ "--focal": cover.focal, "--focal-phone": cover.focalPhone } as CSSProperties}>
        <Image src={cover.src} alt="" fill sizes="(min-width: 1024px) 1180px, 100vw" priority />
      </span>
      <span className="pc-flag-copy">
        <Tag tone="light">Mike Salemi · Flagship</Tag>
        <span className="pc-flag-title">{kbl.name}</span>
        <span className="pc-flag-p">{copy || "The complete kettlebell journey — follow it day by day, or train at your own pace across two levels."}</span>
        <span className="pc-flag-chips">
          {[`${levels} levels`, "4 phases", "61 days per level", "Immersion or Self-Guided"].map((c) => <span key={c}>{c}</span>)}
        </span>
        <span className="pc-flag-acts">
          <span className="lq-btn" data-variant="filled" data-size="md" aria-hidden>
            <span>{e ? "Continue" : "Enter program"}</span>
            <Icon name="arrowRight" size="xs" />
          </span>
          {e && <span className="pc-flag-where">You&apos;re on <b>{day ? `Day ${day}` : e.current_lesson_title ?? "your next day"}</b>{e.path_name ? ` · ${e.path_name.split("·")[0]!.trim()}` : ""}</span>}
        </span>
      </span>
      {e && (
        <span className="pc-flag-prog">
          <Ring value={pct} />
          <span>
            <b>{e.path_name?.split("·")[0]?.trim() ?? "Level I"}{e.current_section_title ? ` · ${e.current_section_title}` : ""}</b>
            <small className="lq-num">{e.lessons_done} of {e.lessons_total} days</small>
          </span>
        </span>
      )}
    </Link>
  );
}

/** "Your path with Mike": Level I → Level II → Mastery → Retreat, and the one thing to resume. */
function PathCard({ catalog, enrollments, kblE }: { catalog: CatalogProgram[]; enrollments: Enrollment[]; kblE?: Enrollment }) {
  const levelTwo = /level ii\b/i.test(kblE?.path_name ?? "");
  const kblDone = enrollments.some((e) => e.program_slug === KBL && e.completed_at);
  const mtk = enrollments.find((e) => e.program_slug === "mastering-the-kettlebell");
  const pct = (e?: Enrollment) => (e && e.lessons_total ? e.lessons_done / e.lessons_total : 0);
  const steps = [
    { label: "Level I", sub: levelTwo || kblDone ? "Done" : kblE ? `${Math.round(pct(kblE) * 100)}%` : "Day 1", state: levelTwo || kblDone ? "done" : "now" },
    { label: "Level II", sub: levelTwo ? `${Math.round(pct(kblE) * 100)}%` : "Day 61", state: levelTwo ? "now" : "ahead" },
    { label: "Mastery", sub: mtk ? `MTK · ${Math.round(pct(mtk) * 100)}%` : "MTK", state: mtk?.completed_at ? "done" : "ahead" },
    { label: "Retreat", sub: "Shasta", state: "ahead" },
  ];
  const doneN = steps.filter((s) => s.state === "done").length;
  const recent = [...enrollments].filter((e) => !e.completed_at).sort((a, b) => (b.last_active_at ?? "").localeCompare(a.last_active_at ?? ""))[0];
  const rp = recent ? catalog.find((p) => p.id === recent.program_id) : undefined;
  const rc = recent ? coverFor(recent.program_slug, null) : null;
  const href = recent && rp ? (rp.type === "course" ? `/programs/${rp.slug}/course/resume` : lessonHrefOf(rp.slug, recent.current_lesson_id, { type: rp.type, mode: recent.mode })) : null;
  return (
    <aside className="pc-path" aria-label="Your path with Mike">
      <div className="pc-path-top">
        <span className="pc-eyebrow" data-tone="warm">Your path with Mike</span>
        <span className="pc-path-n lq-num">{doneN} of {steps.length} complete</span>
      </div>
      <ol className="pc-ladder">
        {steps.map((s, i) => (
          <li key={s.label} data-state={s.state}>
            <span className="pc-ladder-dot" aria-hidden>{s.state === "done" ? <Icon name="check" size="xs" /> : s.state === "now" ? <i /> : <b className="lq-num">{i + 1}</b>}</span>
            <b>{s.label}</b>
            <small className="lq-num">{s.sub}</small>
          </li>
        ))}
      </ol>
      {recent && rc && href && (
        <div className="pc-path-resume">
          <span className="pc-path-photo"><Image src={rc.src} alt="" fill sizes="48px" style={{ objectPosition: rc.focal }} /></span>
          <span className="pc-path-meta">
            <b>{recent.program_name}{recent.path_name ? ` · ${recent.path_name.split("·")[0]!.trim()}` : ""}</b>
            <span className="pc-bar"><i style={{ width: `${Math.round(pct(recent) * 100)}%` }} /></span>
          </span>
          <span className="pc-path-pct lq-num">{Math.round(pct(recent) * 100)}%</span>
          <Link href={href} className="lq-btn" data-variant="filled" data-size="sm">Resume</Link>
        </div>
      )}
    </aside>
  );
}

function access(p: CatalogProgram, e?: Enrollment): { label: string; tone: "ok" | "own" | "lock"; icon: "check" | "lock" | "calendar" | "people" } {
  if (p.type === "retreat") return { label: "By application", tone: "lock", icon: "people" };
  if (p.type === "coaching" && !isOpen(p)) return { label: "Book a call", tone: "lock", icon: "calendar" };
  if (p.access === "owned" || (e && p.access !== "free")) return { label: e?.completed_at ? "Completed" : "Owned", tone: "own", icon: "check" };
  if (p.access === "free" || p.isFree) return { label: "Free", tone: "ok", icon: "check" };
  if (p.access === "included" || p.access === "org") return { label: "Included", tone: "ok", icon: "check" };
  return { label: isDraft(p) ? "Coming soon" : p.type === "course" ? "Not unlocked" : "Locked", tone: "lock", icon: "lock" };
}

function ProgramCard({ p, e, reason, best, priority }: { p: CatalogProgram; e?: Enrollment; reason: string | null; best: boolean; priority?: boolean }) {
  const cover = cardCover(p);
  const pct = e && e.lessons_total ? e.lessons_done / e.lessons_total : null;
  const done = Boolean(e?.completed_at);
  const a = access(p, e);
  const open = isOpen(p);
  const base = programHref(p);
  const href = e && p.type === "course" ? `${base}/resume` : base;
  const cta = e ? (done ? "Review" : "Continue") : p.ctaLabel ?? (p.type === "retreat" ? "Apply" : p.type === "coaching" ? "Book" : p.access === "free" ? "Join program" : open ? "Open program" : p.type === "course" && !isDraft(p) && p.priceLabel ? "Unlock" : "View program");
  const counts = p.lessonCount > 0 ? `${p.sectionCount} ${p.sectionCount === 1 ? "section" : "sections"} · ${p.lessonCount} lessons` : p.durationLabel ?? p.formatLabel ?? null;
  const tag = best ? { label: "Best next step for you", tone: "accent" as const } : p.badge ? { label: p.badge, tone: "warm" as const } : p.access === "free" && !e ? { label: "Free", tone: "light" as const } : null;
  return (
    <article className="pc-card" data-best={best ? "" : undefined}>
      <Link href={base} className="pc-card-photo" aria-label={`${p.name}: details`} tabIndex={-1}>
        <Image src={cover.src} alt={cover.alt} fill sizes="(min-width: 1100px) 380px, (min-width: 640px) 46vw, 92vw" priority={priority} style={{ objectPosition: cover.focal }} />
        {tag && <Tag tone={tag.tone} className="pc-card-tag">{tag.label}</Tag>}
        {pct !== null && (
          <span className="pc-card-prog" aria-label={`${Math.round((done ? 1 : pct) * 100)}% complete`}>
            <span className="pc-bar" data-photo=""><i style={{ width: `${Math.round((done ? 1 : pct) * 100)}%` }} /></span>
            <span className="lq-num">{Math.round((done ? 1 : pct) * 100)}%</span>
          </span>
        )}
      </Link>
      <div className="pc-card-body">
        <p className="pc-inst"><Image src={MIKE_FACE} alt="" width={22} height={22} />{p.instructor ?? "Mike Salemi"}{p.slug === "working-in" ? " & Paul Chek" : ""}</p>
        <h3><Link href={href}>{p.name}</Link></h3>
        {(p.summary || p.tagline) && <p className="pc-sum">{p.summary || p.tagline}</p>}
        {e && !done && e.current_lesson_title ? (
          <p className="pc-reason" data-tone="resume"><Icon name="play" size="xs" />Next: {e.current_lesson_title}</p>
        ) : reason ? (
          <p className="pc-reason"><Icon name="sparkle" size="xs" />{reason}</p>
        ) : p.offer ? (
          <p className="pc-reason"><Icon name="gift" size="xs" />{p.offer}</p>
        ) : null}
        {p.highlights.length > 0 && (
          <ul className="pc-ticks">
            {p.highlights.slice(0, 2).map((h) => <li key={h}><Icon name="check" size="xs" />{h}</li>)}
          </ul>
        )}
        {counts && <p className="pc-counts lq-num">{counts}</p>}
        <div className="pc-foot">
          <span className="pc-access" data-tone={a.tone}><Icon name={a.icon} size="xs" />{a.label}</span>
          <span className="pc-foot-r">
            {!open && !e && p.priceLabel && !/draft|confirm|application/i.test(p.priceLabel) && <b className="pc-price">{p.priceLabel.replace(/\s*\/\s*session$/i, "")}</b>}
            <Link href={href} className="lq-btn" data-variant={best || (e && !done) ? "filled" : "glass"} data-size="sm">
              {cta}{(e || p.access === "free") && <Icon name="arrowRight" size="xs" />}
            </Link>
          </span>
        </div>
      </div>
    </article>
  );
}
