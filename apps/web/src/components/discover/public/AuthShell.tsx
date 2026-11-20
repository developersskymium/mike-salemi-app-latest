import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui";
import { Photo, PubWordmark } from "./Pieces";
import type { PubPhoto } from "./photos";

const TILES: { icon: IconName; text: string }[] = [
  { icon: "calendar", text: "Structured daily training" },
  { icon: "library", text: "Video library and smart tools" },
  { icon: "mountain", text: "Progress that follows you" },
];

/**
 * Sign in / sign up / reset (legacy L31): a brand panel with Mike in full colour, the headline and
 * three feature tiles beside the form panel (desktop); on phones the photo compresses into a header.
 */
export function AuthShell({ photo, mode, next, title, lede, children, footer }: { photo: PubPhoto; mode: "signin" | "signup" | "reset"; next?: string; title: string; lede?: string; children: ReactNode; footer?: ReactNode }) {
  const q = next && next !== "/today" ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="pub pub-auth">
      <section className="pub-auth-brand" aria-label="Mike Salemi">
        <Photo p={photo} sizes="(min-width: 1024px) 52vw, 100vw" priority />
        <PubWordmark />
        <div className="pub-auth-pitch">
          <h2 className="lq-d-xl">Train with Mike, one day at a time.</h2>
          <div className="pub-auth-tiles">
            {TILES.map((t) => (
              <div key={t.text} className="pub-auth-tile">
                <Icon name={t.icon} size="sm" />
                <b>{t.text}</b>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="pub-auth-side">
        <div className="pub-auth-card">
          {mode !== "reset" && (
            <nav className="pub-auth-mode" aria-label="Account">
              <Link href={`/signin${q}`} aria-current={mode === "signin" ? "page" : undefined} replace>Sign in</Link>
              <Link href={`/signup${q}`} aria-current={mode === "signup" ? "page" : undefined} replace>Create account</Link>
            </nav>
          )}
          <h1 className="lq-d-lg">{title}</h1>
          {lede && <p className="lq-lede">{lede}</p>}
          <div className="pub-auth-panel">{children}</div>
          {footer && <div className="pub-auth-foot">{footer}</div>}
          <div className="pub-auth-trust">
            <span><Icon name="check" size="xs" /> Free to start</span>
            <span><Icon name="check" size="xs" /> No card needed</span>
            <span><Icon name="lock" size="xs" /> Private to you</span>
          </div>
        </div>
      </section>
    </div>
  );
}
