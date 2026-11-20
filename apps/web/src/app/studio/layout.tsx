import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { FxLayer, Glass, Icon, ToastProvider } from "@/components/ui";
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
        <Glass as="aside" className="st-side" aria-label="Studio sidebar">
          <Link href="/studio" className="st-brand">
            <span className="st-brand-mark" aria-hidden><Icon name="kettlebell" size="sm" /></span>
            <span><b>Studio</b><small>Mike Salemi App</small></span>
          </Link>
          <StudioNav />
          <div className="st-side-foot">
            <span>{admin.email}</span>
            <Link href="/today" style={{ color: "inherit" }}>Back to the app</Link>
          </div>
        </Glass>
        <main id="main" className="st-main">{children}</main>
      </div>
    </ToastProvider>
  );
}
