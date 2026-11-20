import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getUser } from "@/lib/supabase/server";

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
  return (
    <AppShell user={{ name, avatarUrl: profile?.avatar_url ?? null }} themePreference={prefs.theme ?? null} backdrop="living">
      {children}
    </AppShell>
  );
}
