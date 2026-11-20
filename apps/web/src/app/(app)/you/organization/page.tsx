import type { Metadata } from "next";
import { Avatar, Button, Chip, EmptyState, Glass, Icon, IconButton, LargeTitle } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { dateShort } from "@/components/commerce/format";
import { InvitePanel, MemberManager } from "@/components/orgs/OrgAdmin";
import { OrgLogo, ROLE_LABEL, Seats } from "@/components/orgs/OrgParts";
import { SectionHead } from "@/components/experiences/RunParts";
import { loadMyOrg } from "@/lib/loaders/commerce";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";
import "@/components/orgs/orgs.css";

export const metadata: Metadata = { title: "Organization" };

export default async function OrganizationPage(props: PageProps<"/you/organization">) {
  const sp = await props.searchParams;
  const data = await loadMyOrg(typeof sp.preview === "string" ? sp.preview : null);
  const org = data.orgs[0];
  const back = <IconButton icon="back" label="Back to You" href="/you" size="sm" />;

  if (!org) {
    return (
      <div className="com-page">
        <LargeTitle title="Organization" eyebrow="You" leading={back} />
        <Glass radius="card">
          <EmptyState
            illustration={<EmptyScene scene="caught-up" size={168} />}
            title="You’re training on your own"
            body="If your team, club or company gave you access, open the invite link from your email and you’ll join right away."
            action={<Button variant="glass" size="md" href="/you">Back to You</Button>}
          />
        </Glass>
      </div>
    );
  }

  const manager = org.role === "owner" || org.role === "admin";
  const ov = data.overview;
  const used = ov?.org.seats_used ?? 0;
  const total = ov?.org.seats_total ?? org.seats;

  return (
    <div className="com-page">
      <LargeTitle title="Organization" eyebrow="You" leading={back} />

      {ov && ov.org.status !== "active" && (
        <Glass radius="panel" className="org-banner" role="status">
          <Icon name="clock" size="sm" />
          <p className="lq-t13">
            {ov.org.status === "past_due" ? "Payment for this organization is overdue." : "This organization’s plan has ended."}
            {ov.org.grace_until ? ` Members keep access until ${dateShort(ov.org.grace_until)}.` : ""}
          </p>
        </Glass>
      )}

      <Glass as="section" radius="card" className="org-hero" aria-label={org.name}>
        <OrgLogo name={org.name} src={org.logo_url} />
        <div>
          <div className="com-row" style={{ gap: 8 }}>
            <span className="exp-kicker">Your organization</span>
            <Chip variant="fill">{ROLE_LABEL[org.role]}</Chip>
          </div>
          <h2 className="lq-t28">{org.name}</h2>
          <p className="lq-t13 lq-c2">Member since <span className="lq-num">{dateShort(org.joined_at)}</span>{ov?.org.plan_id ? ` · ${ov.org.plan_id[0]!.toUpperCase()}${ov.org.plan_id.slice(1)} access for every member` : ""}</p>
        </div>
        {manager ? <Seats used={used} total={total} /> : null}
      </Glass>

      {!manager && (
        <section className="exp-section" aria-label="Your coach">
          <SectionHead title="Your coach" kicker="Assigned by your organization" />
          <Glass radius="card" className="com-panel com-row">
            {data.myCoach ? (
              <>
                <Avatar name={data.myCoach.name} src={data.myCoach.avatar_url} size="lg" />
                <div className="com-grow">
                  <div className="lq-t17">{data.myCoach.name}</div>
                  <div className="lq-t13 lq-c2">Sees your progress and readiness check-ins.</div>
                </div>
              </>
            ) : (
              <p className="lq-t15 lq-c2">No coach assigned yet. Your admin can assign one.</p>
            )}
          </Glass>
          <p className="lq-t13 lq-c3" style={{ margin: "12px 4px 0" }}>Your organization sees your program, progress and readiness band, never your notes or answers.</p>
        </section>
      )}

      {manager && (
        <>
          <section className="exp-section" aria-label="Invite">
            <SectionHead title="Invite people" kicker="Seats" />
            <InvitePanel orgId={org.id} invites={data.invites} joinLink={data.joinLink} seatsLeft={Math.max(0, total - used)} />
          </section>
          {ov && (
            <section className="exp-section" aria-label="Members">
              <SectionHead title="Members" kicker={`${ov.members.length} people`} aside={<Button size="sm" variant="glass" href={`/org/${org.slug}`} iconAfter="chevron">Coach view</Button>} />
              <MemberManager overview={ov} />
            </section>
          )}
        </>
      )}
      {org.role === "coach" && (
        <div className="exp-section"><Button variant="filled" href={`/org/${org.slug}`} iconAfter="chevron">Open coach view</Button></div>
      )}
    </div>
  );
}
