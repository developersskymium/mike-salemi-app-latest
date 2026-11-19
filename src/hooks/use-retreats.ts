import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSiteSettings, type RetreatCohort } from "@/lib/site-settings.functions";
import { retreats as baseRetreats, type Retreat } from "@/content/retreats";

/** Applies admin-set cohort dates/status/capacity over the static retreat content. */
export function applyCohort(retreat: Retreat, c?: Partial<RetreatCohort>): Retreat {
  if (!c) return retreat;
  const out = { ...retreat };
  if (c.startsOn) out.startsAt = `${c.startsOn}T12:00:00-07:00`;
  if (c.endsOn) out.endsAt = `${c.endsOn}T12:00:00-07:00`;
  if (c.status) out.status = c.status;
  if (typeof c.capacity === "number" && c.capacity > 0) out.capacity = c.capacity;
  if (typeof c.datesTbd === "boolean") out.demoDates = c.datesTbd;
  if (c.startsOn && c.endsOn && !c.datesTbd) {
    const s = new Date(out.startsAt);
    const e = new Date(out.endsAt);
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const label = out.status === "waitlist" ? "Join the waitlist" : `Apply for ${fmt(s)}–${fmt(e)}, ${e.getFullYear()}`;
    out.ctaLabel = out.status === "past" ? out.ctaLabel : label;
  } else if (c.status === "waitlist") {
    out.ctaLabel = "Join the waitlist";
  }
  return out;
}

export function useRetreats() {
  const fn = useServerFn(getSiteSettings);
  const { data } = useQuery({ queryKey: ["site-settings"], queryFn: () => fn() });
  const cohorts = data?.retreats?.cohorts ?? {};
  const list = baseRetreats.map((r) => applyCohort(r, cohorts[r.slug]));
  return { retreats: list, find: (slug: string) => list.find((r) => r.slug === slug) ?? null };
}
