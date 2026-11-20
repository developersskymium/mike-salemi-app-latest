import type { DB } from "./client";
import type { Database } from "./database.types";

export type OrgRole = "owner" | "admin" | "coach" | "member";

export interface OrgMemberOverview {
  user_id: string;
  role: OrgRole;
  coach_id: string | null;
  joined_at: string;
  name: string;
  avatar_url: string | null;
  current_program_id: string | null;
  current_program: string | null;
  current_program_slug: string | null;
  current_lesson_id: string | null;
  current_lesson: string | null;
  lessons_done: number;
  last_active_at: string | null;
  streak: number;
  readiness_band_name: string | null;
  readiness_band: "green" | "amber" | "red" | null;
  readiness_at: string | null;
}

export interface OrgOverview {
  org: {
    id: string; name: string; slug: string; logo_url: string | null; status: "active" | "past_due" | "cancelled";
    grace_until: string | null; plan_id: string | null; seats_total: number; seats_used: number;
  };
  viewer_role: OrgRole | "platform_admin";
  members: OrgMemberOverview[];
}

type Fns = Database["public"]["Functions"];
async function rpc<T, F extends keyof Fns & string = keyof Fns & string>(sb: DB, fn: F, args?: Fns[F]["Args"]): Promise<T> {
  const { data, error } = await sb.rpc(fn, (args ?? {}) as never);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Accept an emailed invite (the signed-in email must match the invite). */
export function acceptOrgInvite(sb: DB, token: string) {
  return rpc<{ org_id: string; role: OrgRole }>(sb, "accept_org_invite", { p_token: token });
}

/** Join by the org's join link token, or pass null to join the org that auto-joins your email domain. */
export function joinOrg(sb: DB, joinToken: string | null) {
  return rpc<{ org_id: string; role: OrgRole }>(sb, "join_org", { p_join_token: joinToken ?? "" });
}

/** Owner/admin: create or refresh an invite. Send the email from a server route using the returned token. */
export function inviteToOrg(sb: DB, orgId: string, email: string, role: Exclude<OrgRole, "owner"> = "member") {
  return rpc<{ invite_id: string; email: string; role: OrgRole; token: string; expires_at: string; seats_left: number }>(
    sb, "org_admin_invite", { p_org: orgId, p_email: email, p_role: role },
  );
}

/** Owner/admin: remove a member (their org access ends at once, progress is kept). */
export function removeOrgMember(sb: DB, orgId: string, userId: string) {
  return rpc<void>(sb, "org_remove_member", { p_org: orgId, p_user: userId });
}

/** Owner/admin: assign (or clear with null) a member's coach. */
export function setOrgCoach(sb: DB, orgId: string, memberId: string, coachId: string | null) {
  return rpc<void>(sb, "org_set_coach", { p_org: orgId, p_member: memberId, p_coach: coachId as string } /* null clears */);
}

/** Owner/admin/coach dashboard: seats, status and per-member progress (coaches see their own members). */
export function orgOverview(sb: DB, orgId: string) {
  return rpc<OrgOverview>(sb, "org_overview", { p_org: orgId });
}

/** Organizations the signed-in member belongs to, with their role. */
export async function myOrgs(sb: DB, userId: string) {
  const { data, error } = await sb
    .from("org_members")
    .select("role, status, joined_at, organizations(id, slug, name, logo_url, status, seats)")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Pending invites of an org (owner/admin only by RLS). */
export async function orgInvites(sb: DB, orgId: string) {
  const { data, error } = await sb
    .from("org_invites")
    .select("id, email, role, expires_at, accepted_at")
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .order("expires_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
