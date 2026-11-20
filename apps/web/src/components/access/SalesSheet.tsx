import Image from "next/image";
import Link from "next/link";
import { ctaFor, type CatalogProgram, type PricingPlan, type ProgramAccess } from "@ms/api";
import { Icon } from "@/components/ui";
import { programPhoto } from "@/components/discover/access";
import { lessonHrefOf } from "@/lib/hrefs";
import type { OutlineSection } from "@/lib/loaders/discover";
import { coverFor } from "@/lib/covers";
import { metaFor } from "./catalog-meta";
import { FactsRow } from "./FactsRow";
import { ProgramCta } from "./ProgramCta";
import "./access.css";

type Props = {
  program: CatalogProgram;
  access: ProgramAccess | null;
  outline: OutlineSection[];
  previewLessonId: string | null;
  from: string | null;
  plans: PricingPlan[] | null;
};

const money = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

/** In-app sales sheet: photo, why, the one action, the free taste, and the outline with locks. */
export function SalesSheet({ program, access, outline, previewLessonId, from, plans }: Props) {
  const photo = programPhoto(program) ?? (() => { const c = coverFor(program.slug); return { src: c.src, alt: c.alt, position: c.focal }; })();
  const cta = ctaFor(access);
  const meta = metaFor(program.slug);
  const previewHref = previewLessonId
    ? lessonHrefOf(program.slug, previewLessonId, { type: program.type })
    : null;
  const upgrade = access?.upgradePlanId ? plans?.find((p) => p.id === access.upgradePlanId) : null;
  const month = upgrade?.prices.find((p) => p.interval === "month");
  const why =
    access?.state === "upgrade" ? `${program.name} is part of the ${access.upgradePlanName} plan.`
    : access?.state === "buy" ? `Own ${program.name} for life with a one-time purchase.`
    : access?.state === "apply" ? "This one starts with a short application. Mike reviews every one."
    : "This program isn't open yet.";
  return (
    <div className="ac-sheet" data-rise="">
      <div className="ac-sheet-photo">
        <Image src={photo.src} alt={photo.alt} fill priority sizes="(min-width: 1024px) 560px, 100vw" style={{ objectPosition: photo.position }} />
        <span className="ac-sheet-lock lq-t12"><Icon name="lock" size="xs" /> Not in your access yet</span>
      </div>
      <div className="ac-sheet-body">
        {from && <p className="lq-eyebrow" data-tone="accent">That lesson is part of {program.name}</p>}
        <h1 className="lq-d-lg">{program.name}</h1>
        {program.tagline && <p className="lq-lede lq-c2">{program.tagline}</p>}
        {meta && <FactsRow facts={meta.facts} />}
        <p className="lq-t15">{why}</p>
        <div className="ac-sheet-actions">
          <ProgramCta access={access} program={program} size="lg" showNote={false} />
          {previewHref && (
            <Link href={previewHref} prefetch className="lq-btn lq-fx lq-press" data-variant="glass" data-size="lg" data-fx="">
              <Icon name="play" size="sm" />
              <span>Watch the free preview</span>
            </Link>
          )}
        </div>
        {cta.kind === "buy" && access?.upgradePlanName && (
          <p className="lq-t13 lq-c2">
            Or get it in <b>{access.upgradePlanName}</b>{month ? ` — ${money(month.amountCents)}/mo` : ""}, with every program in the plan. Purchases from the last 30 days count toward a plan.
          </p>
        )}
        {program.highlights.length > 0 && (
          <ul className="ac-ticks">
            {program.highlights.slice(0, 3).map((h) => (
              <li key={h} className="lq-t15"><Icon name="check" size="xs" /> {h}</li>
            ))}
          </ul>
        )}
        {outline.length > 0 && (
          <section className="ac-outline" aria-label="What's inside">
            <h2 className="lq-d-xs">What&rsquo;s inside</h2>
            <ol>
              {outline.filter((s) => s.lessonCount > 0).slice(0, 8).map((s, i) => (
                <li key={s.id} className="ac-outline-row">
                  <span className="ac-outline-ico" data-open={i === 0 && previewHref ? "" : undefined} aria-hidden>
                    <Icon name={i === 0 && previewHref ? "play" : "lock"} size="xs" />
                  </span>
                  <span className="lq-t15">{s.title}</span>
                  <span className="lq-t12 lq-c2 lq-num">{s.lessonCount} {s.lessonCount === 1 ? "lesson" : "lessons"}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
        <Link href="/programs" className="lq-t13 ac-back">All programs</Link>
      </div>
    </div>
  );
}
