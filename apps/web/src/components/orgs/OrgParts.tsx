import type { OrgMemberOverview } from "@ms/api";
import { Avatar, Chip, Glass, Rings } from "@/components/ui";
import { StreakFlame } from "@/components/graphics";
import { relativeDays } from "@/components/commerce/format";
import "./orgs.css";

export const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", coach: "Coach", member: "Member", platform_admin: "Platform admin" };

export function OrgLogo({ name, src }: { name: string; src?: string | null }) {
  return (
    <span className="org-logo" aria-hidden>
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name.trim()[0]?.toUpperCase()}
    </span>
  );
}

export function Seats({ used, total }: { used: number; total: number }) {
  return (
    <div className="org-seats">
      <Rings size={56} stroke={7} rings={[{ value: total ? used / total : 0, tone: 1 }]} label={`${used} of ${total} seats used`} />
      <div>
        <div className="lq-t17 lq-num">{used} of {total}</div>
        <div className="lq-t13 lq-c2">seats used · {Math.max(0, total - used)} free</div>
      </div>
    </div>
  );
}

export function Band({ band, name }: { band: OrgMemberOverview["readiness_band"]; name: string | null }) {
  if (!band) return <span className="org-band"><i />None yet</span>;
  return <span className="org-band" data-band={band}><i />{name ?? band}</span>;
}

/** Coach view card: where one member is and how they're doing. */
export function MemberCard({ m, coachName }: { m: OrgMemberOverview; coachName?: string | null }) {
  return (
    <Glass as="article" radius="card" className="org-card lq-lift" aria-label={m.name}>
      <div className="com-row">
        <Avatar name={m.name} src={m.avatar_url} size="md" />
        <div className="com-grow">
          <div className="lq-t17">{m.name}</div>
          <div className="lq-t13 lq-c2">{m.last_active_at ? `Active ${relativeDays(m.last_active_at)}` : "Not started yet"}</div>
        </div>
        {m.role !== "member" && <Chip variant="fill">{ROLE_LABEL[m.role]}</Chip>}
      </div>
      <div>
        <div className="exp-kicker">{m.current_program ?? "No program yet"}</div>
        <div className="lq-t15">{m.current_lesson ?? "—"}</div>
      </div>
      <div className="org-card-stats">
        <div className="org-stat"><span className="lq-t11 lq-c2">Done</span><b>{m.lessons_done}</b></div>
        <div className="org-stat"><span className="lq-t11 lq-c2">Streak</span><b><StreakFlame size={16} lit={m.streak > 0} animated={false} />{m.streak}</b></div>
        <div className="org-stat"><span className="lq-t11 lq-c2">Readiness</span><Band band={m.readiness_band} name={m.readiness_band_name} /></div>
      </div>
      {coachName !== undefined && <div className="lq-t12 lq-c3">Coach: {coachName ?? "Not assigned"}</div>}
    </Glass>
  );
}
