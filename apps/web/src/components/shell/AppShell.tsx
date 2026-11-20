import type { ReactNode } from "react";
import type { ShellData } from "@/lib/loaders/shell";
import { ToastProvider } from "../ui/Toast";
import { PageTransition } from "./PageTransition";
import { RouteProgress } from "./RouteProgress";
import { ShellUserProvider, type ShellUser } from "./ShellUser";
import { BellMark, Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { ThemeSync } from "./ThemeSwitch";
import { PhoneHeader, TopBar } from "./TopBar";

type Props = {
  user: ShellUser;
  themePreference?: string | null;
  /** Resume card, "Your access" and the shop flag (lib/loaders/shell). */
  shell?: ShellData;
  /** The streak chip (usually a Suspense-wrapped server component). */
  streak?: ReactNode;
  /** Phone variant of the streak chip (number only). */
  streakPhone?: ReactNode;
  /** Desktop rail: a custom resume card (overrides shell.resume). */
  sidebarResume?: ReactNode;
  /** Desktop rail: extra groups after "Your access". */
  sidebarExtra?: ReactNode;
  /** Desktop rail: extra content before the member. */
  sidebarMore?: ReactNode;
  /** Full-width announcement bar at the top of the content column. */
  announcement?: ReactNode;
  /** Replaces the default top bar (greeting, search, streak, notifications). */
  statusBar?: ReactNode;
  /** Replaces the default phone header (mark, greeting, streak, avatar). */
  phoneHeader?: ReactNode;
  /** Phone tab bar: replaces the More button. */
  tabBarMore?: ReactNode;
  /** Overlays mounted with the shell (celebration modal, notifications). */
  overlays?: ReactNode;
  /** Retired (Trace living backdrop). Accepted, ignored: the ground is warm chalk. */
  backdrop?: "living" | "none";
  /** Force the active item (gallery/screenshots); normally derived from the path. */
  activeTab?: number;
  /** Hide the phone header (full-screen flows). */
  bare?: boolean;
  children: ReactNode;
};

/**
 * The Summit app frame (legacy L0). Desktop (≥1024px): the original left rail, an announcement
 * bar and a sticky top bar over the page. Phone: a header (mark, greeting, streak, avatar), the
 * announcement, the page, and a floating glass tab bar (Home / Programs / Profile / More).
 */
export function AppShell({
  user, themePreference, shell, streak, streakPhone, sidebarResume, sidebarExtra, sidebarMore, announcement, statusBar, phoneHeader, tabBarMore, overlays,
  activeTab, bare, children,
}: Props) {
  return (
    <ShellUserProvider user={user}>
      <ToastProvider>
        <RouteProgress />
        <ThemeSync preference={themePreference} />
        <div className="lq-shell sm-app">
          <Sidebar resume={sidebarResume ? null : shell?.resume} access={shell?.access} shop={shell?.shop} extra={sidebarExtra} more={sidebarMore} active={activeTab} />
          {sidebarResume && <div className="sm-rail-slot">{sidebarResume}</div>}
          <main id="main" className="lq-main sm-main">
            {announcement && <div className="lq-announce sm-announce">{announcement}</div>}
            {!bare && (
              <div className="lq-phone-header">
                {phoneHeader ?? (
                  <PhoneHeader
                    streak={streakPhone}
                    mark={
                      <span className="sm-mark" aria-hidden>
                        <BellMark />
                      </span>
                    }
                  />
                )}
              </div>
            )}
            <div className="lq-statusbar">{statusBar ?? <TopBar streak={streak} />}</div>
            <PageTransition>
              <div className="lq-page sm-page">{children}</div>
            </PageTransition>
          </main>
          <TabBar active={activeTab} more={tabBarMore} shop={shell?.shop} />
          {overlays}
        </div>
      </ToastProvider>
    </ShellUserProvider>
  );
}
