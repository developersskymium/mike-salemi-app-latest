import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState, Glass, IconButton, LargeTitle, StatTile } from "@/components/ui";
import { MemberCard, OrgLogo, Seats } from "@/components/orgs/OrgParts";
import { SectionHead } from "@/components/experiences/RunParts";
import { getUser } from "@/lib/supabase/server";
import { loadOrgBySlug } from "@/lib/loaders/commerce";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";
import "@/components/orgs/orgs.css";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Coach view" };

/** Owners, admins and coaches: everyone's progress at a glance (coaches see their own members). */
export default async function OrgCoachView(props: PageProps<"/org/[slug]">) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const ov = await loadOrgBySlug(slug, typeof sp.preview === "string" ? sp.preview : null);
  if (!ov) notFound();
  const { user } = await getUser();
  const me = user?.id ?? "";
  const people = ov.members.filter((m) => m.user_id !== me && (ov.viewer_role !== "coach" || m.coach_id === me));
  const active7 = people.filter((m) => m.last_active_at && requestTime() - new Date(m.last_active_at).getTime() < 7 * 86400000).length;
  const ready = people.filter((m) => m.readiness_band === "green").length;
  const nameOf = (id: string | null) => ov.members.find((m) => m.user_id === id)?.name ?? null;

  return (
    <div className="com-page">
      <LargeTitle title={ov.org.name} eyebrow="Coach view" leading={<IconButton icon="back" label="Back to organization" href="/you/organization" size="sm" />} trailing={<OrgLogo name={ov.org.name} src={ov.org.logo_url} />} />
      <Glass radius="card" className="org-hero" style={{ gridTemplateColumns: "1fr", gap: 20 }}>
        <div className="com-grid-3" style={{ alignItems: "center" }}>
          <Seats used={ov.org.seats_used} total={ov.org.seats_total} />
          <StatTile value={active7} unit={` / ${people.length}`} label="Active this week" swatch={1} />
          <StatTile value={ready} unit={` / ${people.length}`} label="Ready today" swatch={2} />
        </div>
      </Glass>
      <section className="exp-section" aria-label="Members">
        <SectionHead title="Progress" kicker={ov.viewer_role === "coach" ? "Your members" : "Everyone"} />
        {people.length ? (
          <div className="org-grid">
            {people.map((m) => <MemberCard key={m.user_id} m={m} coachName={m.role === "member" ? nameOf(m.coach_id) : undefined} />)}
          </div>
        ) : (
          <Glass radius="card"><EmptyState icon="people" title="No members yet" body="Invite people from your organization page and their progress shows up here." /></Glass>
        )}
      </section>
    </div>
  );
}
