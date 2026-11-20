import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AmbientBackdrop, Button, Chip, Glass, Icon } from "@/components/ui";
import { MovementFigure } from "@/components/graphics";
import type { OutlineSection, SalesPage } from "@/lib/loaders/discover";
import { heroPhoto, includedIn, money } from "../access";

const inline = (t: string) => t.split(/(\*\*[^*]+\*\*)/).map((part, j) => (part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part));

/** Tiny markdown for program descriptions: paragraphs, ## headings, - lists and **bold**. */
export function Prose({ text }: { text: string }) {
  return (
    <div className="dsc-prose-wrap">
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n");
        if (lines[0]!.startsWith("## ")) {
          return (
            <div key={i} className="dsc-prose-sec">
              <h3 className="lq-t20">{lines[0]!.slice(3)}</h3>
              {lines.length > 1 && <p className="lq-t17 dsc-prose">{inline(lines.slice(1).join(" "))}</p>}
            </div>
          );
        }
        if (lines.every((l) => l.startsWith("- ")))
          return (
            <ul key={i} className="dsc-notes dsc-prose-list">
              {lines.map((l) => (
                <li key={l} className="lq-t17">
                  <Icon name="check" size="xs" className="lq-c2" />
                  <span>{inline(l.slice(2))}</span>
                </li>
              ))}
            </ul>
          );
        return (
          <p key={i} className="lq-t17 dsc-prose">
            {inline(block)}
          </p>
        );
      })}
    </div>
  );
}

const MODE_LABEL: Record<string, string> = { immersion: "Immersion, one day at a time", self_guided: "Self-Guided, at your own pace", library: "Every video in the Library" };

type Cta = { label: string; href: string; note?: string; price?: string; per?: string };

/** The one primary action, from the server quote (prices are never computed here). */
export function salesCta(page: SalesPage, signedIn: boolean): Cta {
  const { program: p, quote: q, plans } = page;
  const open = `/programs/${p.slug}`;
  const join = (next: string) => (signedIn ? next : `/signup?next=${encodeURIComponent(next)}`);
  const plan = includedIn(p.id, plans);
  const lowest = plan?.prices.reduce((a, b) => (b.amountCents < a.amountCents ? b : a), plan.prices[0]!);
  if (q.state === "free") return { label: signedIn ? "Open" : "Start free", href: join(open), price: "Free" };
  if (q.state === "included" || q.state === "owned") return { label: "Open in the app", href: open, note: q.state === "owned" ? "You own this program." : "Included in your plan." };
  if (q.state === "purchasable") {
    const disc = plans.flatMap((pl) => pl.benefits.filter((b) => b.programId === p.id && b.benefit === "discount").map((b) => ({ pl, b })))[0];
    return {
      label: `Get ${p.name.split(":")[0]}`,
      href: join(open),
      price: money(q.amount_cents, q.currency),
      per: q.access_days ? `${q.access_days} days access` : "one-time",
      note: disc ? `${disc.pl.name} members save ${disc.b.discountPercent}%.` : undefined,
    };
  }
  if (plan && lowest) {
    return {
      label: `Join ${plan.name}`,
      href: signedIn ? `/pricing` : `/signup?plan=${plan.id}&next=${encodeURIComponent(open)}`,
      price: money(lowest.amountCents, lowest.currency),
      per: lowest.interval === "month" ? "/mo" : "/yr",
      note: `Included with ${plan.name}${plans.some((x) => x.rank > plan.rank && x.benefits.some((b) => b.programId === p.id)) ? " and above" : ""}.`,
    };
  }
  // Retreats, coaching and concepts: an application or an enquiry, not a cart.
  const apply = p.type === "retreat" || p.type === "coaching" || p.type === "challenge" || p.type === "live";
  return { label: apply ? "Request a place" : "Join to get access", href: join(open), note: p.draftNote && /await|concept|draft/i.test(p.draftNote) ? "Dates and pricing are being finalised." : undefined };
}

/** Outline grouped into chapters by section subtitle (MTK) or shown flat (KBL phases). */
export function Outline({ outline, lessonLabel }: { outline: OutlineSection[]; lessonLabel: string }) {
  const rows = outline.filter((s) => !(s.lessonCount <= 1 && /^home$/i.test(s.title)));
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
    <Glass radius="card" className="dsc-outline">
      <div className="dsc-outline-head lq-t13 lq-c2">
        <span className="lq-num">{flat ? rows.length : groups.length} {flat ? "parts" : "chapters"}</span>
        <span className="lq-num">{plural(total)}</span>
      </div>
      {flat
        ? rows.map((s, i) => (
            <details key={s.id} className="dsc-ol-row" open={i === 0}>
              <summary>
                <span className="dsc-ol-n lq-num">{i + 1}</span>
                <span className="dsc-ol-t">
                  <span className="lq-t17">{s.title}</span>
                  {s.subtitle && <span className="lq-t13 lq-c2">{s.subtitle}</span>}
                </span>
                <span className="lq-t13 lq-c2 lq-num">{plural(s.lessonCount)}</span>
                <Icon name="chevronDown" size="sm" className="dsc-ol-chev lq-c3" />
              </summary>
              <ul>
                {s.lessons.map((l) => (
                  <li key={l} className="lq-t15 lq-c2">{l}</li>
                ))}
                {s.lessonCount > s.lessons.length && <li className="lq-t13 lq-c3">and {s.lessonCount - s.lessons.length} more</li>}
              </ul>
            </details>
          ))
        : groups.map((g, i) => (
            <details key={`${g.title}-${i}`} className="dsc-ol-row" open={i === 0}>
              <summary>
                <span className="dsc-ol-n lq-num">{i + 1}</span>
                <span className="dsc-ol-t">
                  <span className="lq-t17">{g.title ?? g.sections[0]!.title}</span>
                  <span className="lq-t13 lq-c2 dsc-clamp1">{g.sections.map((s) => titleCase(s.title)).join(" · ")}</span>
                </span>
                <span className="lq-t13 lq-c2 lq-num">{plural(g.sections.reduce((n, s) => n + s.lessonCount, 0))}</span>
                <Icon name="chevronDown" size="sm" className="dsc-ol-chev lq-c3" />
              </summary>
              <ul>
                {g.sections.map((s) => (
                  <li key={s.id} className="lq-t15 lq-c2">
                    {titleCase(s.title)} <span className="lq-c3 lq-num">· {s.lessonCount}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
    </Glass>
  );
}

const titleCase = (t: string) => (t === t.toUpperCase() ? t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : t).replace(/\s{2,}/g, " ");

/** Facts-only FAQ built from the program's own data. */
export function faq(page: SalesPage, cta: Cta): { q: string; a: ReactNode }[] {
  const p = page.program;
  const out: { q: string; a: ReactNode }[] = [];
  out.push({ q: "How do I get access?", a: [cta.note, cta.price ? `${cta.price}${cta.per ? ` ${cta.per}` : ""}.` : null, "Your account works on the web now, with the phone apps to follow."].filter(Boolean).join(" ") });
  if (p.modes.length) out.push({ q: "Can I go at my own pace?", a: `Yes. ${p.modes.map((m) => MODE_LABEL[m]).filter(Boolean).join("; ")}.` });
  if (p.paths.length > 1)
    out.push({ q: p.paths[0]!.kind === "level" ? "Which level should I start with?" : "Do I have to do everything?", a: p.paths[0]!.kind === "level" ? `There are ${p.paths.length} levels: ${p.paths.map((x) => x.name).join(", ")}. New to kettlebells? Start with ${p.paths[0]!.shortName ?? p.paths[0]!.name}.` : `No. Pick a focus: ${p.paths.map((x) => x.shortName ?? x.name).join(", ")}.` });
  if (p.type === "day_program" || p.type === "course")
    out.push({ q: "What equipment do I need?", a: <>A kettlebell or two and some floor space. Not sure which weights? The free <Link href="/signup?next=/tools/kettlebell-selector" className="dsc-link">Kettlebell Selector</Link> tells you.</> });
  return out;
}

export function SalesHero({ page, cta }: { page: SalesPage; cta: Cta }) {
  const p = page.program;
  const photo = heroPhoto(p);
  return (
    <section className="dsc-sales-hero">
      {photo && <AmbientBackdrop src={photo.src} />}
      <div className="dsc-sales-hero-in">
        <div className="dsc-sales-copy">
          <p className="lq-t15 dsc-eyebrow lq-c2">{[p.formatLabel, p.durationLabel].filter(Boolean).join(" · ") || "Program"}</p>
          <h1 className="dsc-display">{p.name}</h1>
          {(p.tagline || p.summary) && <p className="lq-t20 lq-c2 dsc-sales-lede">{p.tagline ?? p.summary}</p>}
          {p.paths.length > 1 && (
            <div className="dsc-sales-paths">
              {p.paths.map((x) => (
                <Chip key={x.id} variant="fill">{x.name}</Chip>
              ))}
            </div>
          )}
          <div className="dsc-sales-buy">
            <Button href={cta.href} size="lg" className="dsc-sales-cta">{cta.label}</Button>
            {cta.price && (
              <span className="dsc-sales-price">
                <span className="lq-t22 lq-num">{cta.price}</span>
                {cta.per && <span className="lq-t13 lq-c2">{cta.per}</span>}
              </span>
            )}
          </div>
          {cta.note && <p className="lq-t13 lq-c2">{cta.note}</p>}
        </div>
        <div className="dsc-sales-media">
          {photo ? (
            <Image src={photo.src} alt={photo.alt} fill priority sizes="(min-width: 1024px) 520px, 92vw" />
          ) : (
            <span className="dsc-sales-art"><MovementFigure move="breathing" size={220} animated /></span>
          )}
        </div>
      </div>
    </section>
  );
}
