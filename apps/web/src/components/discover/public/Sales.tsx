import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, Tag } from "@/components/ui";
import type { OutlineSection, SalesPage } from "@/lib/loaders/discover";
import { includedIn, money } from "../access";
import { Photo } from "./Pieces";
import type { PubPhoto } from "./photos";

const inline = (t: string) => t.split(/(\*\*[^*]+\*\*)/).map((part, j) => (part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part));

/** Tiny markdown for program descriptions: paragraphs, ## headings, - lists and **bold**. */
export function Prose({ text }: { text: string }) {
  return (
    <div className="pub-prose">
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n");
        if (lines[0]!.startsWith("## ")) {
          return (
            <div key={i} className="pub-prose">
              <h3 className="lq-d-xs">{lines[0]!.slice(3)}</h3>
              {lines.length > 1 && <p>{inline(lines.slice(1).join(" "))}</p>}
            </div>
          );
        }
        if (lines.every((l) => l.startsWith("- ")))
          return (
            <ul key={i}>
              {lines.map((l) => (
                <li key={l}>
                  <Icon name="check" size="xs" />
                  <span>{inline(l.slice(2))}</span>
                </li>
              ))}
            </ul>
          );
        return <p key={i}>{inline(block)}</p>;
      })}
    </div>
  );
}

export const MODE_LABEL: Record<string, string> = { immersion: "Day by day (Immersion)", self_guided: "At your own pace (Self-Guided)", library: "Every video in the Library" };

export type Cta = { label: string; href: string; note?: string; price?: string; per?: string; draft?: string | null };

/** The one primary action, from the server quote (prices are never computed here). */
export function salesCta(page: SalesPage, signedIn: boolean): Cta {
  const { program: p, quote: q, plans } = page;
  const open = `/programs/${p.slug}`;
  const join = (next: string) => (signedIn ? next : `/signup?next=${encodeURIComponent(next)}`);
  const plan = includedIn(p.id, plans);
  const lowest = plan?.prices.reduce((a, b) => (b.amountCents < a.amountCents ? b : a), plan.prices[0]!);
  const short = p.name.split(":")[0];
  if (q.state === "free") return { label: signedIn ? "Open" : "Start free", href: join(open), price: "Free", per: "no card needed" };
  if (q.state === "included" || q.state === "owned") return { label: "Open in the app", href: open, note: q.state === "owned" ? "You own this program." : "Included in your plan." };
  if (q.state === "purchasable") {
    const disc = plans.flatMap((pl) => pl.benefits.filter((b) => b.programId === p.id && b.benefit === "discount").map((b) => ({ pl, b })))[0];
    return {
      label: `Get ${short}`,
      href: join(open),
      price: money(q.amount_cents, q.currency),
      per: q.access_days ? `${q.access_days} days access` : "one-time, yours to keep",
      note: disc ? `${disc.pl.name} members save ${disc.b.discountPercent}%.` : undefined,
    };
  }
  if (plan && lowest) {
    return {
      label: `Join ${plan.name}`,
      href: signedIn ? `/pricing` : `/signup?plan=${encodeURIComponent(plan.name.toLowerCase())}&next=${encodeURIComponent(open)}`,
      price: money(lowest.amountCents, lowest.currency),
      per: lowest.interval === "month" ? "/month" : "/year",
      note: `Included with ${plan.name}${plans.some((x) => x.rank > plan.rank && x.benefits.some((b) => b.programId === p.id)) ? " and above" : ""}.`,
      draft: lowest.draftNote ?? plan.draftNote,
    };
  }
  // Retreats, coaching and concepts: an application or an enquiry, not a cart.
  const apply = p.type === "retreat" || p.type === "coaching" || p.type === "challenge" || p.type === "live";
  return {
    label: p.type === "retreat" ? "Apply for a place" : apply ? "Request a place" : "Join to get access",
    href: join(open),
    note: p.draftNote && /await|concept|draft/i.test(p.draftNote) ? "Dates and pricing are being finalised." : undefined,
  };
}

const titleCase = (t: string) => (t === t.toUpperCase() ? t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : t).replace(/\s{2,}/g, " ");

/** Real sections only (the imported "Home" page is a placeholder). */
export const realSections = (outline: OutlineSection[]) => outline.filter((s) => !(s.lessonCount <= 1 && /^home$/i.test(s.title)) && !/^home$/i.test(s.title));

/** Curriculum overview: chapters grouped by section subtitle (MTK) or flat parts (KBL phases). */
export function Curriculum({ outline, lessonLabel, summary }: { outline: OutlineSection[]; lessonLabel: string; summary?: string | null }) {
  // Day programs carry overview pages alongside the days, so raw counts would overstate the days: show the program's own summary instead.
  const counts = lessonLabel !== "Day";
  const rows = realSections(outline);
  const groups: { title: string | null; sections: OutlineSection[] }[] = [];
  for (const s of rows) {
    const last = groups.at(-1);
    if (last && s.subtitle && last.title === s.subtitle) last.sections.push(s);
    else groups.push({ title: s.subtitle, sections: [s] });
  }
  const flat = groups.every((g) => g.sections.length === 1);
  const total = rows.reduce((n, s) => n + s.lessonCount, 0);
  const plural = (n: number) => `${n} ${lessonLabel.toLowerCase()}${n === 1 ? "" : "s"}`;
  return (
    <div className="pub-curr">
      <div className="pub-curr-head">
        <span className="lq-num">{flat ? rows.length : groups.length} {flat ? "parts" : "chapters"}</span>
        <span className="lq-num">{counts ? plural(total) : summary ?? ""}</span>
      </div>
      {flat
        ? rows.map((s, i) => (
            <details key={s.id} open={i === 0}>
              <summary>
                <span className="pub-curr-n lq-num">{i + 1}</span>
                <span className="pub-curr-t">
                  <b>{titleCase(s.title)}</b>
                  {s.subtitle && <span>{s.subtitle}</span>}
                </span>
                <span className="pub-curr-c">{counts ? plural(s.lessonCount) : ""}</span>
                <Icon name="chevronDown" size="sm" className="pub-curr-chev" />
              </summary>
              <ul>
                {s.lessons.map((l) => (
                  <li key={l}>
                    <Icon name="play" size="xs" />
                    {l}
                  </li>
                ))}
                {s.lessonCount > s.lessons.length && <li className="more">and {s.lessonCount - s.lessons.length} more</li>}
              </ul>
            </details>
          ))
        : groups.map((g, i) => (
            <details key={`${g.title}-${i}`} open={i === 0}>
              <summary>
                <span className="pub-curr-n lq-num">{i + 1}</span>
                <span className="pub-curr-t">
                  <b>{titleCase(g.title ?? g.sections[0]!.title)}</b>
                  <span>{g.sections.map((s) => titleCase(s.title)).join(" · ")}</span>
                </span>
                <span className="pub-curr-c">{plural(g.sections.reduce((n, s) => n + s.lessonCount, 0))}</span>
                <Icon name="chevronDown" size="sm" className="pub-curr-chev" />
              </summary>
              <ul>
                {g.sections.map((s) => (
                  <li key={s.id}>
                    <Icon name="play" size="xs" />
                    {titleCase(s.title)} <span className="lq-c3 lq-num">· {s.lessonCount}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
    </div>
  );
}

/** The first lesson as a preview: what you open on day one, and what follows it. */
export function FirstLesson({ outline, photo, href, signedIn }: { outline: OutlineSection[]; photo: PubPhoto; href: string; signedIn: boolean }) {
  const first = realSections(outline)[0];
  if (!first || !first.lessons.length) return null;
  const [lesson, ...next] = first.lessons;
  return (
    <div className="pub-first">
      <Photo p={photo} sizes="(min-width: 1024px) 440px, 92vw">
        <Tag tone="light">First up</Tag>
        <span className="pub-first-play" aria-hidden><Icon name="play" /></span>
      </Photo>
      <div className="pub-first-body">
        <p className="lq-eyebrow" data-tone="warm">{titleCase(first.title)}{first.subtitle ? ` · ${first.subtitle}` : ""}</p>
        <h3 className="lq-d-sm">{lesson}</h3>
        <p>Where everyone starts. {signedIn ? "Open it in the app." : "Create a free account to save your place; it opens as soon as you have access."}</p>
        {next.length > 0 && (
          <ul className="pub-first-next" aria-label="Up next">
            {next.slice(0, 3).map((l) => (
              <li key={l}>
                <Icon name="play" size="xs" />
                {l}
              </li>
            ))}
          </ul>
        )}
        <Link href={href} className="pub-link lq-t15" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {signedIn ? "Open the program" : "Save my place"} <Icon name="arrowRight" size="xs" />
        </Link>
      </div>
    </div>
  );
}

/** Facts-only FAQ built from the program's own data. */
export function faq(page: SalesPage, cta: Cta): { q: string; a: ReactNode }[] {
  const p = page.program;
  const out: { q: string; a: ReactNode }[] = [];
  out.push({ q: "How do I get access?", a: [cta.note, cta.price ? `${cta.price}${cta.per ? ` ${cta.per}` : ""}.` : null, "Your account works on the web now, with the phone apps to follow."].filter(Boolean).join(" ") });
  if (p.modes.length) out.push({ q: "Can I go at my own pace?", a: `Yes. ${p.modes.map((m) => MODE_LABEL[m]).filter(Boolean).join("; ")}.` });
  if (p.paths.length > 1)
    out.push({
      q: p.paths[0]!.kind === "level" ? "Which level should I start with?" : "Do I have to do everything?",
      a: p.paths[0]!.kind === "level" ? `There are ${p.paths.length} levels: ${p.paths.map((x) => x.name).join(", ")}. New to kettlebells? Start with ${p.paths[0]!.shortName ?? p.paths[0]!.name}.` : `No. Pick a focus: ${p.paths.map((x) => x.shortName ?? x.name).join(", ")}.`,
    });
  if (p.type === "day_program" || p.type === "course")
    out.push({ q: "What equipment do I need?", a: <>A kettlebell or two and some floor space. Not sure which weights? The free <Link href="/signup?next=/tools/kettlebell-selector" className="pub-link">Kettlebell Selector</Link> tells you.</> });
  if (p.type === "retreat")
    out.push({ q: "How does applying work?", a: "Apply with a short form, then schedule a call with the team. If it's a fit, you confirm your place with payment. A free preparation series opens before the retreat." });
  return out;
}
