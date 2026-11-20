"use client";

import { useState, useTransition } from "react";
import type { OrgOverview } from "@ms/api";
import { Avatar, Button, Chip, Glass, Icon, IconButton, Segmented, Sheet, useToast } from "@/components/ui";
import { inviteToOrgAction, removeOrgMemberAction, setOrgCoachAction } from "@/lib/actions/commerce";
import type { OrgInviteView } from "@/lib/loaders/commerce";
import { dayMonth, relativeDays } from "@/components/commerce/format";
import { Band, ROLE_LABEL } from "./OrgParts";

type Role = "member" | "coach" | "admin";

export function InvitePanel({ orgId, invites, joinLink, seatsLeft }: { orgId: string; invites: OrgInviteView[]; joinLink: string | null; seatsLeft: number }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [sent, setSent] = useState<OrgInviteView[]>([]);
  const send = () =>
    start(async () => {
      setError(null);
      const r = await inviteToOrgAction(orgId, email, role);
      if (r.ok) {
        setSent((s) => [{ id: crypto.randomUUID(), email, role, expires_at: new Date(Date.now() + 14 * 86400000).toISOString() }, ...s]);
        setEmail("");
        toast("Invite sent", { tone: "success", icon: "check" });
      } else setError(r.message);
    });
  const copy = async () => {
    if (!joinLink) return;
    await navigator.clipboard.writeText(new URL(joinLink, window.location.origin).toString()).catch(() => {});
    toast("Link copied", { icon: "check" });
  };
  const all = [...sent, ...invites];
  return (
    <Glass radius="card" className="com-panel com-stack" style={{ gap: 16 }}>
      <form className="org-invite" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="com-field">
          <label htmlFor="org-email">Invite by email</label>
          <input id="org-email" type="email" required className="com-input" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </div>
        <Segmented label="Role" size="sm" variant="fill" options={[{ value: "member", label: "Member" }, { value: "coach", label: "Coach" }, { value: "admin", label: "Admin" }] as const} value={role} onChange={(v) => setRole(v as Role)} />
        <Button type="submit" size="md" icon="plus" disabled={pending || !email || seatsLeft <= 0} aria-busy={pending}>{pending ? "Sending…" : "Invite"}</Button>
      </form>
      <div aria-live="polite">
        {error && <p className="com-error" role="alert"><Icon name="close" size="xs" /> {error}</p>}
        {seatsLeft <= 0 && <p className="lq-t13 lq-c2">All seats are taken. Remove a member or add seats to invite more.</p>}
      </div>
      {joinLink && (
        <Glass radius="panel" className="org-link" level="thick">
          <Icon name="share" size="sm" />
          <code>{joinLink}</code>
          <Button size="sm" variant="fill" onClick={copy}>Copy link</Button>
        </Glass>
      )}
      {all.length > 0 && (
        <div>
          <div className="exp-kicker" style={{ marginBottom: 4 }}>Pending invites</div>
          <ul className="com-list" role="list">
            {all.map((i) => (
              <li key={i.id} className="com-li">
                <Icon name="bell" size="sm" />
                <span className="com-grow lq-t15" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{i.email}</span>
                <Chip variant="outline">{ROLE_LABEL[i.role] ?? i.role}</Chip>
                <span className="lq-t12 lq-c3 lq-num">until {dayMonth(i.expires_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Glass>
  );
}

export function MemberManager({ overview }: { overview: OrgOverview }) {
  const toast = useToast();
  const [members, setMembers] = useState(overview.members);
  const [removing, setRemoving] = useState<OrgOverview["members"][number] | null>(null);
  const [pending, start] = useTransition();
  const coaches = members.filter((m) => m.role === "coach" || m.role === "owner" || m.role === "admin");
  const nameOf = (id: string | null) => members.find((m) => m.user_id === id)?.name ?? null;

  const assign = (userId: string, coachId: string | null) => {
    const before = members;
    setMembers((ms) => ms.map((m) => (m.user_id === userId ? { ...m, coach_id: coachId } : m)));
    start(async () => {
      const r = await setOrgCoachAction(overview.org.id, userId, coachId);
      if (r.ok) toast(coachId ? `Coach set to ${nameOf(coachId)}` : "Coach removed", { icon: "check" });
      else {
        setMembers(before);
        toast(r.message, { icon: "close" });
      }
    });
  };
  const remove = () =>
    start(async () => {
      if (!removing) return;
      const r = await removeOrgMemberAction(overview.org.id, removing.user_id);
      if (r.ok) {
        setMembers((ms) => ms.filter((m) => m.user_id !== removing.user_id));
        toast(`${removing.name} removed`, { icon: "check" });
        setRemoving(null);
      } else toast(r.message, { icon: "close" });
    });

  return (
    <Glass radius="card" className="com-panel" style={{ paddingBlock: 8 }}>
      <ul className="org-members" role="list">
        {members.map((m) => (
          <li key={m.user_id} className="org-member">
            <Avatar name={m.name} src={m.avatar_url} size="md" />
            <div style={{ minWidth: 0 }}>
              <div className="com-row" style={{ gap: 8 }}>
                <span className="lq-t15" style={{ fontWeight: 600 }}>{m.name}</span>
                <Chip variant={m.role === "member" ? "outline" : "fill"}>{ROLE_LABEL[m.role]}</Chip>
              </div>
              <div className="org-member-meta lq-t13 lq-c2">
                <span>{m.current_lesson ? `${m.current_program} · ${m.current_lesson}` : "Not started"}</span>
              </div>
            </div>
            <div className="org-member-meta lq-t13 lq-c2 org-hide-phone">
              <Band band={m.readiness_band} name={m.readiness_band_name} />
              <span>{m.last_active_at ? relativeDays(m.last_active_at) : "—"}</span>
            </div>
            <div className="org-member-tools">
              {m.role === "member" && (
                <select className="org-select" aria-label={`Coach for ${m.name}`} value={m.coach_id ?? ""} onChange={(e) => assign(m.user_id, e.target.value || null)} disabled={pending}>
                  <option value="">No coach</option>
                  {coaches.map((c) => <option key={c.user_id} value={c.user_id}>{c.name}</option>)}
                </select>
              )}
              {m.role !== "owner" && <IconButton icon="close" label={`Remove ${m.name}`} variant="fill" size="sm" onClick={() => setRemoving(m)} />}
            </div>
          </li>
        ))}
      </ul>
      <Sheet
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.name ?? "member"}?`}
        detents={["medium"]}
        description="Their access through this organization ends now. Their progress is kept if they join again or subscribe on their own."
        footer={
          <div className="com-stack" style={{ gap: 8 }}>
            <Button block variant="glass" onClick={remove} disabled={pending} aria-busy={pending}>{pending ? "Removing…" : "Remove member"}</Button>
            <Button block variant="plain" onClick={() => setRemoving(null)}>Keep</Button>
          </div>
        }
      />
    </Glass>
  );
}
