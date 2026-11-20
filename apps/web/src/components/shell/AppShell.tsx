import type { ReactNode } from "react";
import { LivingBackdrop } from "../signature/Sky";
import { FxLayer } from "../ui/FxLayer";
import { ToastProvider } from "../ui/Toast";
import { PageTransition } from "./PageTransition";
import { RouteProgress } from "./RouteProgress";
import { ShellUserProvider, type ShellUser } from "./ShellUser";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { ThemeSync } from "./ThemeSwitch";

type Props = {
  user: ShellUser;
  themePreference?: string | null;
  /** Desktop rail: the training resume card, under the wordmark (legacy L0). */
  sidebarResume?: ReactNode;
  /** Desktop rail: groups after the primary nav ("Unlocked", "Coming up"). */
  sidebarExtra?: ReactNode;
  /** Desktop rail: more destinations (Tools, Coaching, Referrals) before the member. */
  sidebarMore?: ReactNode;
  /** Full-width announcement bar at the top of the content column. */
  announcement?: ReactNode;
  /** Status bar under the announcement: a centred context line and one action. */
  statusBar?: ReactNode;
  /** Phone only: a site header above the page (wordmark/greeting + menu). */
  phoneHeader?: ReactNode;
  /** Phone tab bar: an extra trailing item (e.g. a "More" button that opens a sheet). */
  tabBarMore?: ReactNode;
  /** Overlays mounted with the shell (More sheet, celebration modal). */
  overlays?: ReactNode;
  /** The living backdrop behind every page: star trails at night, contours on snow. */
  backdrop?: "living" | "none";
  /** Force the active tab (gallery/screenshots); normally derived from the path. */
  activeTab?: number;
  children: ReactNode;
};

/**
 * The app frame. Phone: content + floating film tab bar. Desktop (≥1024px): the left rail
 * (legacy layout), content centred. Behind everything: the living night/snow exposure.
 */
export function AppShell({
  user, themePreference, sidebarResume, sidebarExtra, sidebarMore, announcement, statusBar, phoneHeader, tabBarMore, overlays,
  backdrop = "living", activeTab, children,
}: Props) {
  return (
    <ShellUserProvider user={user}>
      <ToastProvider>
        <RouteProgress />
        <FxLayer />
        <ThemeSync preference={themePreference} />
        <div className="lq-shell">
          {backdrop === "living" && <LivingBackdrop fixed />}
          <Sidebar resume={sidebarResume} extra={sidebarExtra} more={sidebarMore} active={activeTab} />
          <main id="main" className="lq-main">
            {phoneHeader && <div className="lq-phone-header">{phoneHeader}</div>}
            {announcement && <div className="lq-announce">{announcement}</div>}
            {statusBar && <div className="lq-statusbar">{statusBar}</div>}
            <PageTransition>
              <div className="lq-page">{children}</div>
            </PageTransition>
          </main>
          <div className="lq-edge lq-tabedge" data-side="bottom" aria-hidden />
          <TabBar active={activeTab} more={tabBarMore} />
          {overlays}
        </div>
      </ToastProvider>
    </ShellUserProvider>
  );
}
