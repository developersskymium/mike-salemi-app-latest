import Link from "next/link";
import type { CatalogProgram, PricingPlan } from "@ms/api";
import { Icon, Tag } from "@/components/ui";
import type { ListPrice } from "@/lib/loaders/public";
import { includedIn, isDraft, metaLine, money } from "../access";
import { Draft, Photo } from "./Pieces";
import { photoFor } from "./photos";

/** Outcome lines for catalog rows that have no summary yet (from each program's own curriculum). */
const FALLBACK: Record<string, string> = {
  "athleticism-4-life": "Four weeks of workouts with lessons on mobility, breathing, stretching and working in.",
  "the-path-to-inspired-action": "Mike's group coaching program, the one that became The Grounded King.",
  "men-of-movement": "The preparation series for the retreat, with a module that opens after you return.",
  "kettlebell-roadmap": "The four fundamental lifts, and the step that comes next for you.",
};

function priceLine(p: CatalogProgram, plans: PricingPlan[], list: ListPrice | undefined): { text: string; draft: string | null } | null {
  if (p.isFree || p.access === "free") return { text: "Free", draft: null };
  if (list) return { text: money(list.amountCents, list.currency), draft: list.draftNote };
  const plan = includedIn(p.id, plans);
  if (plan) return { text: `In ${plan.name}`, draft: null };
  return null;
}

/** Program card for the public catalog: photo (no baked-in text), meta, outcome, price or plan. */
export function ProgramTile({ p, plans, list, priority }: { p: CatalogProgram; plans: PricingPlan[]; list?: ListPrice; priority?: boolean }) {
  const price = priceLine(p, plans, list);
  const free = p.isFree || p.access === "free";
  return (
    <Link href={`/explore/${p.slug}`} className="pub-card" prefetch>
      <Photo p={photoFor(p.slug)} sizes="(min-width: 1024px) 380px, (min-width: 720px) 46vw, 92vw" priority={priority}>
        <span className="pub-card-badges">
          {free && <Tag tone="ok">Free</Tag>}
          {isDraft(p) && <Draft note={p.draftNote} onPhoto />}
        </span>
      </Photo>
      <div className="pub-card-body">
        <p className="pub-card-meta">{metaLine(p)}</p>
        <h3 className="lq-d-sm">{p.name}</h3>
        <p>{p.tagline ?? p.summary ?? FALLBACK[p.slug] ?? ""}</p>
        <div className="pub-card-foot">
          <span className="pub-card-go">{free ? "Start free" : "See the program"} <Icon name="arrowRight" size="xs" /></span>
          {price && !free && (
            <span className="pub-card-price">
              {price.text}
              <Draft note={price.draft} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

