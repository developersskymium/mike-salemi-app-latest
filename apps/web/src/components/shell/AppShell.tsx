import type { ReactNode } from "react";
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
  /** Extra sidebar content on desktop ("Coming up"). */
  sidebarExtra?: ReactNode;
  /** Force the active tab (gallery/screenshots); normally derived from the path. */
  activeTab?: number;
  children: ReactNode;
};

/**
 * The app frame. Phone: content + floating glass tab bar. Desktop (≥1024px): floating glass
 * sidebar, content centred at 1080px. Pages own their backdrop (AmbientBackdrop) and title.
 */
export function AppShell({ user, themePreference, sidebarExtra, activeTab, children }: Props) {
  return (
    <ShellUserProvider user={user}>
      <ToastProvider>
        <RouteProgress />
        <FxLayer />
        <ThemeSync preference={themePreference} />
        <div className="lq-shell">
          <Sidebar extra={sidebarExtra} active={activeTab} />
          <main id="main" className="lq-main">
            <PageTransition>
              <div className="lq-page">{children}</div>
            </PageTransition>
          </main>
          <div className="lq-edge lq-tabedge" data-side="bottom" aria-hidden />
          <TabBar active={activeTab} />
        </div>
      </ToastProvider>
    </ShellUserProvider>
  );
}
