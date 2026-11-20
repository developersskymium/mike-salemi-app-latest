import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { MOCK } from "@/lib/mock";
import { CelebrationHost } from "@/components/you/CelebrationHost";
import { NotificationsHost } from "@/components/notifications/NotificationsHost";

/**
 * Member app frame (Trace shell: living night/snow backdrop, rail on desktop, film tab bar on phone).
 * The proxy already gates these routes; this verifies the user and loads the header data.
 * Legacy L0 slots on AppShell (filled by the lead): sidebarResume, sidebarExtra (Unlocked),
 * sidebarMore, announcement, statusBar, phoneHeader, tabBarMore, overlays (More sheet).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/signin");
  const { data: profile } = await supabase.from("profiles").select("display_name, first_name, avatar_url, preferences").eq("id", user.id).single();
  const prefs = (profile?.preferences ?? {}) as { theme?: string };
  const name = profile?.display_name || profile?.first_name || user.email?.split("@")[0] || "Member";
  // Announcement bar: the first live notice placed as "banner" (row rules only return active, in-window notices).
  const { data: notice } = MOCK
    ? { data: null }
    : await supabase.from("notices").select("title, body, link_label, link_url").eq("placement", "banner").order("position").limit(1).maybeSingle();
  const announcement = notice ? (
    <p className="lq-t13">
      <strong>{notice.title}</strong>
      {notice.body ? <> {notice.body}</> : null}
      {notice.link_url ? <> <Link href={notice.link_url} className="lq-link">{notice.link_label || "Learn more"}</Link></> : null}
    </p>
  ) : null;
  return (
    <AppShell user={{ name, avatarUrl: profile?.avatar_url ?? null }} themePreference={prefs.theme ?? null} backdrop="living"
      announcement={announcement}
      overlays={<><CelebrationHost /><NotificationsHost /></>}
    >
      {children}
    </AppShell>
  );
}
