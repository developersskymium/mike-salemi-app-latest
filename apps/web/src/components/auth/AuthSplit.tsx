import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import "./auth.css";

export type AuthPhoto = { src: string; alt: string; focal: string; focalPhone?: string };

/**
 * Sign in / sign up: split screen with Mike in full colour (desktop) and a slim photo header on phone.
 * Wordmark reads just "Mike Salemi" (spec 11 #14).
 */
export function AuthSplit({ photo, quote, children, footer }: { photo: AuthPhoto; quote?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="au">
      <section className="au-photo" aria-label="Mike Salemi">
        <Image src={photo.src} alt={photo.alt} fill priority sizes="(min-width: 960px) 50vw, 100vw" style={{ objectFit: "cover", objectPosition: photo.focal, ["--au-focal-phone" as string]: photo.focalPhone ?? photo.focal }} />
        <Link href="/" className="au-wordmark" aria-label="Mike Salemi, home">Mike Salemi</Link>
        {quote && <p className="au-quote">{quote}</p>}
      </section>
      <section className="au-side">
        <div className="au-card">
          {children}
          {footer && <div className="au-foot">{footer}</div>}
        </div>
      </section>
    </div>
  );
}
