"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CatalogProgram } from "@ms/api";
import { Chip, EmptyState, Glass, Icon, IconButton } from "@/components/ui";
import { MovementFigure, type MoveName } from "@/components/graphics";
import type { Enrollment, ProgramsCopy } from "@/lib/loaders/discover";
import "./catalog.css";

/* Programs catalog, legacy layout (src/routes/_authenticated/programs.index.tsx): PageHead → search →
   Flagship (Kettlebell Lifestyle) → verticals with card grids → closing note. */

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

function verticalOf(p: CatalogProgram): VerticalId {
  const v = p.vertical as VerticalId | null;
  if (v && VERTICALS.some((x) => x.id === v)) return v;
  if (VERTICAL_OF[p.slug]) return VERTICAL_OF[p.slug]!;
  if (p.type === "coaching" || p.type === "challenge" || p.type === "live") return "deeper";
  if (p.type === "retreat") return "mind-body";
  return "mastery";
}

const TYPE: Record<string, string> = { course: "Course", day_program: "Program", challenge: "Group challenge", live: "Live program", retreat: "Retreat", coaching: "Coaching", tool: "Free tool" };
const GLYPH: Record<string, MoveName> = { coaching: "press", challenge: "swing", live: "breathing", retreat: "walking", course: "getup", tool: "squat" };
const DRAFTY = /await|concept|draft|tbc/i;

function photo(p: CatalogProgram) {
  const m = p.media.find((x) => x.role === "card") ?? p.media.find((x) => x.role === "hero") ?? p.media[0];
  return m ? { src: m.url, alt: m.alt || p.name } : null;
}

function accessLabel(p: CatalogProgram) {
  if (p.draftNote && DRAFTY.test(p.draftNote) && p.access !== "included" && p.access !== "owned") return "Draft";
  return p.access === "owned" ? "Owned" : p.access === "free" ? "Free" : p.access === "included" || p.access === "org" ? "Included" : p.access === "preview" ? "Preview" : "Locked";
}
const isOpen = (p: CatalogProgram) => ["owned", "free", "included", "org"].includes(p.access);

type Props = { catalog: CatalogProgram[]; enrollments: Enrollment[]; copy?: ProgramsCopy };

export function Catalog({ catalog, enrollments, copy }: Props) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const enrolledBy = useMemo(() => {
    const m = new Map<string, Enrollment>();
    for (const e of [...enrollments].sort((a, b) => (a.last_active_at ?? "").localeCompare(b.last_active_at ?? ""))) m.set(e.program_id, e);
    return m;
  }, [enrollments]);
  const match = (p: CatalogProgram) => !needle || [p.name, p.summary, p.tagline, ...p.highlights].some((x) => x?.toLowerCase().includes(needle));
  const listed = catalog.filter((p) => !HIDDEN.has(p.slug) && p.catalogGroup !== "hidden" && match(p));
  const ordered = [...listed.filter(isOpen), ...listed.filter((p) => !isOpen(p))];
  const kbl = catalog.find((p) => p.slug === "kettlebell-lifestyle");
  const showKbl = kbl && (!needle || `${kbl.name} immersion self-guided ${kbl.summary ?? ""} ${kbl.highlights.join(" ")}`.toLowerCase().includes(needle));
  const kblEnrolled = kbl ? enrollments.filter((e) => e.program_id === kbl.id && !e.completed_at).sort((a, b) => (b.last_active_at ?? "").localeCompare(a.last_active_at ?? ""))[0] : undefined;
  const any = showKbl || ordered.length > 0;
  const retreat = catalog.find((p) => p.type === "retreat");

  return (
    <div className="w1-cat">
      <div className="w1-cat-intro">
        <h2 className="lq-t22">{copy?.title || "Choose your next program"}</h2>
        <p className="lq-t17 lq-c2 w1-cat-lede">{copy?.intro || "Every course, guided experience and deeper practice in one place. Start with what supports you now."}</p>
      </div>

      <label className="w1-cat-search">
        <Icon name="search" size="sm" className="lq-c2" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search programs, skills or outcomes" aria-label="Search programs" className="lq-t15" enterKeyHint="search" />
        {query && <IconButton icon="close" label="Clear search" variant="plain" size="sm" iconSize="xs" onClick={() => setQuery("")} />}
      </label>

      {showKbl && kbl && (
        <section aria-labelledby="flag-t" className="w1-cat-group">
          <GroupHead id="flag-t" eyebrow="Flagship program" title="Kettlebell Lifestyle" />
          <Link href={`/programs/${kbl.slug}`} className="w1-cat-flag lq-lift" aria-label="Enter Kettlebell Lifestyle">
            {photo(kbl) && <Image src={photo(kbl)!.src} alt="" fill sizes="(min-width: 1024px) 1100px, 100vw" priority />}
            <span className="w1-cat-flag-scrim" aria-hidden />
            <span className="w1-cat-flag-copy">
              <span className="w1-cat-badge lq-t12">Mike Salemi · Flagship</span>
              <span className="w1-cat-flag-title">{kbl.name}</span>
              <span className="lq-t15 lq-c2">{copy?.kblCopy || "The complete kettlebell journey — follow it day by day or train at your own pace across two levels."}</span>
              <span className="w1-cat-chips">
                {[`${kbl.paths.filter((x) => x.kind === "level").length || 2} levels`, "4 phases", "Immersion or Self-Guided"].map((c) => (
                  <Chip key={c} variant="glass">{c}</Chip>
                ))}
              </span>
              {kblEnrolled && (
                <span className="w1-cat-flag-progress">
                  <Arc value={kblEnrolled.lessons_total ? kblEnrolled.lessons_done / kblEnrolled.lessons_total : 0} size={36} />
                  <span className="lq-t13">
                    <strong>{kblEnrolled.path_name?.split("·")[0]?.trim()}</strong> · <span className="lq-num">{kblEnrolled.lessons_done} of {kblEnrolled.lessons_total}</span> days
                  </span>
                </span>
              )}
              <span className="lq-btn w1-cat-flag-cta" data-variant="filled" data-size="md" aria-hidden>
                <span>{kblEnrolled ? "Continue" : "Enter program"}</span>
                <Icon name="chevron" size="xs" />
              </span>
            </span>
          </Link>
        </section>
      )}

      {VERTICALS.map((v) => {
        const items = ordered.filter((p) => verticalOf(p) === v.id);
        if (!items.length) return null;
        return (
          <section key={v.id} aria-labelledby={`v-${v.id}`} className="w1-cat-group">
            <GroupHead id={`v-${v.id}`} eyebrow={v.eyebrow} title={v.title} note={v.note} />
            <ul className="w1-cat-grid">
              {items.map((p) => (
                <li key={p.id}>
                  <ProgramTile p={p} e={enrolledBy.get(p.id)} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {!any && (
        <EmptyState title={`Nothing matches “${query.trim()}”`} body="Try a movement, a skill or an outcome, like swing, strength or recovery." icon="search" />
      )}

      <div className="w1-cat-rows">
      <Link href="/tools" className="w1-cardlink">
        <Glass radius="card" interactive className="w1-cat-free lq-lift">
          <span className="w1-cat-free-art" aria-hidden><MovementFigure move="getup" size={56} animated={false} /></span>
          <span className="w1-cat-free-text">
            <span className="w1-eyebrow">Free resources</span>
            <span className="lq-t17">Kettlebell Roadmap and coaching tools</span>
            <span className="lq-t13 lq-c2">Four training phases with skills and videos, plus the bell selector, stretch test and readiness check.</span>
          </span>
          <Icon name="chevron" size="sm" className="lq-c3" />
        </Glass>
      </Link>
      {retreat && (
        <Link href={`/programs/${retreat.slug}`} className="w1-cardlink">
          <Glass radius="card" interactive className="w1-cat-free lq-lift">
            <span className="w1-cat-free-art w1-cat-free-photo" aria-hidden>
              {photo(retreat) ? <Image src={photo(retreat)!.src} alt="" fill sizes="64px" /> : <MovementFigure move="walking" size={56} animated={false} />}
            </span>
            <span className="w1-cat-free-text">
              <span className="w1-eyebrow">Retreats &amp; gatherings</span>
              <span className="lq-t17">{retreat.name}</span>
              <span className="lq-t13 lq-c2">{retreat.tagline ?? retreat.summary ?? "In-person journeys with Mike."}</span>
            </span>
            <Icon name="chevron" size="sm" className="lq-c3" />
          </Glass>
        </Link>
      )}
      </div>

      <p className="lq-t13 lq-c2 w1-cat-note">
        Everything here lives inside your account. Open a program to read the full breakdown, and anything you already have access to opens straight into the experience.
      </p>
    </div>
  );
}

function GroupHead({ id, eyebrow, title, note }: { id: string; eyebrow: string; title: string; note?: string }) {
  return (
    <div className="w1-cat-head">
      <p className="w1-eyebrow">{eyebrow}</p>
      <h2 id={id} className="lq-t28">{title}</h2>
      {note && <p className="lq-t15 lq-c2">{note}</p>}
    </div>
  );
}

/** Journey arc (signature): your progress through the program, drawn as an arc. */
function Arc({ value, size = 44 }: { value: number; size?: number }) {
  const r = 18;
  const len = Math.PI * 1.5 * r; // 270° arc
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} className="w1-arc" aria-hidden>
      <path d="M9.27 34.73 A18 18 0 1 1 34.73 34.73" className="w1-arc-track" />
      <path d="M9.27 34.73 A18 18 0 1 1 34.73 34.73" className="w1-arc-fill" strokeDasharray={len} strokeDashoffset={len * (1 - Math.max(0, Math.min(1, value)))} />
      <text x="22" y="26" textAnchor="middle" className="w1-arc-text">{Math.round(value * 100)}</text>
    </svg>
  );
}

function ProgramTile({ p, e }: { p: CatalogProgram; e?: Enrollment }) {
  const img = photo(p);
  const open = isOpen(p);
  const label = accessLabel(p);
  const pct = e && e.lessons_total ? e.lessons_done / e.lessons_total : null;
  const done = Boolean(e?.completed_at);
  const href = e?.current_lesson_id ? `/programs/${p.slug}/learn/${e.current_lesson_id}` : `/programs/${p.slug}`;
  const cta = e ? (done ? "Review" : "Continue") : p.ctaLabel ?? (open ? "Open program" : p.type === "coaching" ? "Book a call" : "View program");
  const counts = p.lessonCount > 0;
  return (
    <Glass as="article" radius="card" className="w1-cat-card">
      <Link href={`/programs/${p.slug}`} className="w1-cat-art" aria-label={`${p.name}: details`}>
        {img ? (
          <Image src={img.src} alt="" fill sizes="(min-width: 1100px) 360px, (min-width: 640px) 46vw, 92vw" />
        ) : (
          <span className="w1-cat-glyph" aria-hidden><MovementFigure move={GLYPH[p.type] ?? "breathing"} size={110} animated={false} /></span>
        )}
        <span className="w1-cat-access"><Chip variant="clear" icon={label === "Locked" ? "lock" : label === "Draft" ? "sparkle" : open ? "check" : undefined}>{label}</Chip></span>
        {p.badge && <span className="w1-cat-badge w1-cat-badge-pos lq-t12">{p.badge}</span>}
      </Link>
      <div className="w1-cat-body">
        <p className="w1-cat-kicker">{[TYPE[p.type] ?? "Program", p.instructor].filter(Boolean).join(" · ")}</p>
        <h3 className="lq-t20">{p.name}</h3>
        {(p.summary || p.tagline) && <p className="lq-t13 lq-c2 w1-clamp2">{p.summary || p.tagline}</p>}
        {p.offer && <p className="w1-cat-offer lq-t12">{p.offer}</p>}
        {p.highlights.length > 0 && (
          <ul className="w1-cat-ticks">
            {p.highlights.slice(0, 3).map((h) => (
              <li key={h} className="lq-t13 lq-c2"><Icon name="check" size="xs" /> {h}</li>
            ))}
          </ul>
        )}
        <div className="w1-cat-meta lq-t12 lq-c2">
          {counts ? (
            <>
              <span><Icon name="steps" size="xs" /> <span className="lq-num">{p.sectionCount}</span> sections</span>
              <span><Icon name="play" size="xs" /> <span className="lq-num">{p.lessonCount}</span> lessons</span>
            </>
          ) : (
            <span>{p.priceLabel ?? p.durationLabel ?? p.formatLabel ?? p.audience ?? TYPE[p.type]}</span>
          )}
        </div>
        <div className="w1-cat-foot">
          <Link href={href} className="w1-cat-cta lq-t15">
            {!open && <Icon name="lock" size="xs" />}
            {cta} <Icon name="chevron" size="xs" />
          </Link>
          {pct !== null && (
            <span className="w1-cat-prog" title={`${e!.lessons_done} of ${e!.lessons_total} done`}>
              <Arc value={done ? 1 : pct} size={40} />
            </span>
          )}
        </div>
      </div>
    </Glass>
  );
}
