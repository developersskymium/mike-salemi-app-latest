import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Chip, cx } from "@/components/ui";
import { BellMark } from "@/components/shell/Sidebar";
import { focalVars, type PubPhoto } from "./photos";

/** A fixed photo frame (zero layout shift): full colour, focal point per breakpoint, cover crop. */
export function Photo({ p, sizes, priority, className, style, children }: { p: PubPhoto; sizes: string; priority?: boolean; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div className={cx("pub-photo", className)} style={{ ...focalVars(p), ...style }}>
      <Image src={p.src} alt={p.alt} fill sizes={sizes} priority={priority} />
      {children}
    </div>
  );
}

/** Public wordmark: the bell in an ink tile, "Mike Salemi", a quiet sub line. */
export function PubWordmark({ onPhoto, href = "/" }: { onPhoto?: boolean; href?: string }) {
  return (
    <Link href={href} className="pub-wordmark" data-on-photo={onPhoto ? "" : undefined} aria-label="Mike Salemi, home">
      <span className="pub-mark">
        <BellMark />
      </span>
      <span>
        <b>Mike Salemi</b>
        <small>Kettlebell · Movement</small>
      </span>
    </Link>
  );
}

/** Section head: eyebrow, display title, optional lede and a right-side action. */
export function SectionHead({ eyebrow, title, lede, action, id, tone = "accent", center }: { eyebrow?: string; title: ReactNode; lede?: ReactNode; action?: ReactNode; id?: string; tone?: "accent" | "warm"; center?: boolean }) {
  return (
    <header className="pub-sechead" data-center={center ? "" : undefined}>
      <div>
        {eyebrow && <p className="lq-eyebrow" data-tone={tone}>{eyebrow}</p>}
        <h2 id={id} className="lq-d-lg pub-h2">{title}</h2>
        {lede && <p className="lq-lede pub-lede">{lede}</p>}
      </div>
      {action && <div className="pub-sechead-act">{action}</div>}
    </header>
  );
}

/** Quiet marker on prices and facts Mike hasn't confirmed yet. */
export function Draft({ note, onPhoto }: { note?: string | null; onPhoto?: boolean }) {
  if (!note) return null;
  return (
    <Chip variant={onPhoto ? "clear" : "outline"} size="sm" className="pub-draft" title={note} aria-label={`Draft: ${note}`}>
      Draft
    </Chip>
  );
}
