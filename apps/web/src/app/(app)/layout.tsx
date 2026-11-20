import { redirect } from "next/navigation";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { ShellStreak, StreakSlot } from "@/components/shell/ShellStreak";
import { Announcement } from "@/components/shell/Announcement";
import { NOTICE_COOKIE } from "@/components/shell/notice";
import { getUser } from "@/lib/supabase/server";
import { MOCK } from "@/lib/mock";
import { loadShell, loadStreak } from "@/lib/loaders/shell";
import { CelebrationHost } from "@/components/you/CelebrationHost";
import { NotificationsHost } from "@/components/notifications/NotificationsHost";
import { ReducedMotionSync } from "@/components/settings/ReducedMotionSync";

/**
 * Member app frame (Summit shell, legacy L0): the original rail on desktop (resume card, nav,
 * "Your access", "Additional", member + theme), the top bar (greeting, search, streak,
 * notifications), the announcement bar, and on phones a header + glass tab bar.
 * The proxy already gates these routes; this verifies the user and loads the shell in parallel:
 * profile, the banner notice and my_enrollments (one RPC for the resume card and access list).
 * The streak streams in afterwards so it never holds up the frame.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/signin");
  const [{ data: profile }, { data: notice }, shell] = await Promise.all([
    MOCK
      ? Promise.resolve({ data: { display_name: "Daniel Test", first_name: "Daniel", avatar_url: null, preferences: {}, created_at: "2026-09-02T00:00:00Z" } })
      : supabase.from("profiles").select("display_name, first_name, avatar_url, preferences, created_at").eq("id", user.id).single(),
    MOCK
      ? Promise.resolve({ data: { title: "Men of Movement · The Breakthrough", body: "— applications open for May 13–16, 2027 on Mount Shasta", link_label: "Apply", link_url: "/experiences" } })
      : supabase.from("notices").select("title, body, link_label, link_url").eq("placement", "banner").order("position").limit(1).maybeSingle(),
    loadShell(supabase),
  ]);
  const prefs = (profile?.preferences ?? {}) as { theme?: string };
  const name = profile?.display_name || profile?.first_name || user.email?.split("@")[0] || "Member";
  const since = profile?.created_at ? `Member since ${new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : null;
  const streak = loadStreak();
  // Announcement bar: the first live notice placed as "banner" (row rules only return active, in-window notices),
  // unless the member dismissed this one (cookie set by <Announcement>).
  const noticeId = notice ? noticeKey(notice.title, notice.body) : null;
  const dismissed = noticeId && (await cookies()).get(NOTICE_COOKIE)?.value === noticeId;
  const announcement =
    notice && noticeId && !dismissed ? (
      <Announcement id={noticeId} title={notice.title} body={notice.body} linkLabel={notice.link_label} linkUrl={notice.link_url} />
    ) : null;
  return (
    <AppShell
      user={{ name, avatarUrl: profile?.avatar_url ?? null, subtitle: since }}
      themePreference={prefs.theme ?? null}
      shell={shell}
      streak={<Suspense fallback={<StreakSlot />}><ShellStreak days={streak} /></Suspense>}
      streakPhone={<Suspense fallback={<StreakSlot compact />}><ShellStreak days={streak} compact /></Suspense>}
      announcement={announcement}
      overlays={<><CelebrationHost /><NotificationsHost /><ReducedMotionSync /></>}
    >
      {children}
    </AppShell>
  );
}

/** A short stable key for a notice (dismissing it hides this notice only; a new notice shows again). */
function noticeKey(title: string, body: string | null | undefined) {
  const s = `${title}|${body ?? ""}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `n${(h >>> 0).toString(36)}`;
}
