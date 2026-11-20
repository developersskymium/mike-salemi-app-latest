import Image from "next/image";
import Link from "next/link";
import { ProgramCta } from "./ProgramCta";
import { getAccessMap } from "@/lib/access";
import { coverFor } from "@/lib/covers";
import { programHref } from "@/lib/hrefs";
import "./access.css";

type Next = { slug: string; name: string; type: string; why: string };

/** Two next steps per finished program (spec 11 moments): never a wall, always a reason. */
const NEXT: Record<string, [Next, Next]> = {
  "kettlebell-lifestyle": [
    { slug: "athleticism-4-life", name: "Athleticism 4 Life", type: "course", why: "Strength block: turn your base into speed and power." },
    { slug: "mastering-the-kettlebell", name: "Mastering the Kettlebell", type: "course", why: "Mobility & skill: refine every lift you learned." },
  ],
  "mastering-the-kettlebell": [
    { slug: "athleticism-4-life", name: "Athleticism 4 Life", type: "course", why: "Put your technique to work in a strength block." },
    { slug: "kettlebell-lifestyle", name: "Kettlebell Lifestyle", type: "day_program", why: "Daily training that adapts to your readiness." },
  ],
  "athleticism-4-life": [
    { slug: "working-in", name: "Working-In", type: "course", why: "Recover as hard as you trained." },
    { slug: "coaching", name: "1:1 with Mike", type: "coaching", why: "Review your progress and plan the next block." },
  ],
  "working-in": [
    { slug: "kettlebell-lifestyle", name: "Kettlebell Lifestyle", type: "day_program", why: "Bring your energy back to daily training." },
    { slug: "the-path-to-inspired-action", name: "The Path to Inspired Action", type: "course", why: "Keep going with the inner work." },
  ],
  "the-path-to-inspired-action": [
    { slug: "coaching", name: "1:1 with Mike", type: "coaching", why: "Take the inner work further, one on one." },
    { slug: "men-of-movement-retreats", name: "Men of Movement retreat", type: "retreat", why: "Four days of movement, breathwork and nature." },
  ],
};
const FREE_NEXT: [Next, Next] = [
  { slug: "kettlebell-lifestyle", name: "Kettlebell Lifestyle", type: "day_program", why: "The full day-by-day program. Day 1 is open to try." },
  { slug: "mastering-the-kettlebell", name: "Mastering the Kettlebell", type: "course", why: "Technique for every kettlebell lift." },
];

/**
 * Completion / certificate "Choose your next step": two cards with state-aware actions.
 *   <ChooseNextStep program="kettlebell-lifestyle" />
 */
export async function ChooseNextStep({ program, title = "Choose your next step" }: { program: string; title?: string }) {
  const pair = NEXT[program] ?? FREE_NEXT;
  const access = await getAccessMap();
  return (
    <section className="ac-next" aria-label={title}>
      <h2 className="lq-d-sm">{title}</h2>
      <div className="ac-next-grid">
        {pair.map((n) => {
          const a = access.get(n.slug) ?? null;
          const c = coverFor(n.slug);
          return (
            <article key={n.slug} className="ac-next-card">
              <Link href={programHref(n.slug, n.type)} prefetch className="ac-next-photo" aria-label={n.name}>
                <Image src={c.src} alt={c.alt} fill sizes="(min-width: 900px) 420px, 100vw" style={{ objectPosition: c.focal }} />
              </Link>
              <div className="ac-next-body">
                <h3 className="lq-d-xs">{n.name}</h3>
                <p className="lq-t13 lq-c2">{n.why}</p>
                <ProgramCta access={a} program={{ id: a?.programId ?? n.slug, slug: n.slug, name: n.name }} size="sm" variant="glass" />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
