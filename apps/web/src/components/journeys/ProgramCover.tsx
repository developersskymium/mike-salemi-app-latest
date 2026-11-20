import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/ui";

/**
 * Program main-page cover (spec 11 §13): one big full-colour photo (no text baked in, focal points
 * so faces stay in frame), title, a one-line promise, progress and ONE primary action.
 * Desktop: copy over a left scrim. Phone: photo on top, copy below on the surface.
 */
export function ProgramCover({
  eyebrow,
  title,
  promise,
  image,
  cta,
  progress,
  theme,
  back = { href: "/programs", label: "Programs" },
  badge,
}: {
  eyebrow: string;
  title: string;
  promise: string;
  image: { src: string; alt: string; focal: string; focalPhone: string };
  cta: ReactNode;
  progress?: { value: number; label: string } | null;
  theme?: string;
  back?: { href: string; label: string };
  badge?: ReactNode;
}) {
  const pct = progress ? Math.round(Math.max(0, Math.min(1, progress.value)) * 100) : 0;
  return (
    <header className="jc" data-theme={theme}>
      <nav className="jc-crumb" aria-label="Breadcrumb">
        <Link href={back.href}><Icon name="back" size="xs" /> {back.label}</Link>
      </nav>
      <div className="jc-frame">
        <figure className="jc-photo" style={{ "--focal": image.focal, "--focal-phone": image.focalPhone } as CSSProperties}>
          <Image src={image.src} alt={image.alt} fill priority sizes="(min-width: 1024px) 1200px, 100vw" />
          {badge && <span className="jc-badge">{badge}</span>}
        </figure>
        <div className="jc-copy">
          <p className="jc-eyebrow">{eyebrow}</p>
          <h1 className="jc-title">{title}</h1>
          <p className="jc-promise">{promise}</p>
          <div className="jc-act">{cta}</div>
          {progress && (
            <div className="jc-prog">
              <span className="jc-prog-track" role="progressbar" aria-label={progress.label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${pct}%` }} />
              </span>
              <span className="jc-prog-l lq-num">{progress.label}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
