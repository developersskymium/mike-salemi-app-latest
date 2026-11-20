import { hasAccess, type CatalogProgram, type ProgramAccess } from "@ms/api";
import { Button, EmptyState } from "@/components/ui";
import { programPhoto } from "@/components/discover/access";
import { getAccessMap } from "@/lib/access";
import { coverFor } from "@/lib/covers";
import { loadProgramsTab } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import { metaFor } from "./catalog-meta";
import { CatalogClient, type CatalogCard } from "./CatalogClient";
import "./access.css";

/** Programs that are part of another program (pre-retreat prep) or not ready to sell stay out of the catalog. */
const HIDDEN = new Set(["men-of-movement"]);
const EXPERIENCE = new Set(["coaching", "retreat", "live", "challenge"]);

function toCard(p: CatalogProgram, a: ProgramAccess | null, names: Map<string, string>): CatalogCard {
  const photo = programPhoto(p) ?? (() => { const c = coverFor(p.slug); return { src: c.src, alt: c.alt, position: c.focal }; })();
  const meta = metaFor(p.slug);
  const also = (meta?.also ?? []).map((s) => names.get(s)).filter((x): x is string => !!x).slice(0, 1);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    tagline: p.tagline ?? p.summary,
    photo,
    access: a,
    goals: meta?.goals ?? [],
    facts: meta?.facts ?? null,
    also: also[0] ?? null,
    experience: EXPERIENCE.has(p.type) || a?.state === "apply",
    format: p.formatLabel ?? p.durationLabel,
    lessons: p.lessonCount,
  };
}

/**
 * Programs catalog (spec 11/12 "All programs"): Your programs · Included in your plan · Explore
 * (free first, then paid) · Train with Mike in person (coaching & retreats, by application).
 * Every card carries its access state and the one right action.
 */
export async function ProgramsCatalog() {
  const { supabase } = await getUser();
  let tab;
  try {
    tab = await loadProgramsTab(supabase);
  } catch {
    return (
      <EmptyState
        title="Programs didn't load"
        body="Check your connection and try again."
        action={<Button variant="glass" size="md" href="/programs">Try again</Button>}
      />
    );
  }
  const access = await getAccessMap();
  const names = new Map(tab.catalog.map((p) => [p.slug, p.name.replace(/ with Paul Chek & Mike Salemi$/, "")]));
  const cards = tab.catalog
    .filter((p) => !HIDDEN.has(p.slug) && p.catalogGroup !== "hidden")
    .map((p) => toCard(p, access.get(p.slug) ?? access.get(p.id) ?? null, names));

  // Enrolled programs say Continue everywhere (enrollments are the shell's source of truth too).
  const enrolledIds = new Set(tab.enrollments.map((e) => e.program_id));
  for (const c of cards) if (c.access && enrolledIds.has(c.id) && hasAccess(c.access)) c.access = { ...c.access, enrolled: true };
  const going = (c: CatalogCard) => !!c.access && (c.access.enrolled || c.access.started || enrolledIds.has(c.id));

  const yours = cards.filter((c) => !c.experience && hasAccess(c.access) && going(c));
  const included = cards.filter((c) => !c.experience && (c.access?.state === "included" || c.access?.state === "owned") && !going(c));
  const rank = (c: CatalogCard) => (c.access?.state === "free" ? 0 : c.access?.state === "buy" ? 1 : c.access?.state === "upgrade" ? 2 : 3);
  const explore = cards
    .filter((c) => !c.experience && !yours.includes(c) && !included.includes(c))
    .sort((a, b) => rank(a) - rank(b));
  const inPerson = cards.filter((c) => c.experience);
  const planName = [...access.values()].find((a) => a.state === "included")?.planName ?? null;

  return <CatalogClient yours={yours} included={included} explore={explore} inPerson={inPerson} planName={planName} />;
}
