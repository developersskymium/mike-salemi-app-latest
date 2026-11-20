import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { FxLayer, Icon, ToastProvider } from "@/components/ui";
import { BellMark } from "@/components/shell/Sidebar";
import { StudioNav } from "@/components/studio/Nav";
import { studioAdmin } from "@/lib/studio/guard";
import "@/components/studio/studio.css";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Studio" }, robots: { index: false, follow: false } };

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const admin = await studioAdmin();
  return (
    <ToastProvider>
      <FxLayer />
      <div className="st-root">
        <aside className="st-side" aria-label="Studio sidebar">
          <Link href="/studio" className="st-brand" prefetch>
            <span className="st-brand-mark" aria-hidden><BellMark /></span>
            <span><b>Studio</b><small>Mike Salemi</small></span>
          </Link>
          <StudioNav />
          <div className="st-side-foot">
            <span className="st-side-who">
              <span className="st-side-av" aria-hidden>{(admin.email[0] ?? "A").toUpperCase()}</span>
              <span><b>Admin</b><small>{admin.email}</small></span>
            </span>
            <span className="st-side-links">
              <Link href="/today"><Icon name="home" size="xs" /> App</Link>
              <Link href="/" target="_blank"><Icon name="external" size="xs" /> Site</Link>
            </span>
          </div>
        </aside>
        <main id="main" className="st-main">{children}</main>
      </div>
    </ToastProvider>
  );
}
