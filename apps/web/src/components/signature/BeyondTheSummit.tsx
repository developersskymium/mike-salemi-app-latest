import Image from "next/image";
import Link from "next/link";
import { Icon } from "../ui/Icon";
import { Tag } from "../ui/Chip";
import type { ImageSource } from "../ui/Media";

export type Peak = {
  title: string;
  /** One line: why it's next, with the price or the unlock rule. */
  sub: string;
  href: string;
  cta: string;
  image: { src: ImageSource; alt: string; position?: string };
  /** BEST NEXT STEP (tag) or a glass badge ("Included", "Applications open"). */
  badge?: { label: string; kind?: "tag" | "badge"; tone?: "accent" | "warm" | "gold" };
  /** Not reachable yet (unlocks at the summit): the CTA turns quiet. */
  locked?: boolean;
};

type Props = {
  title?: string;
  sub?: string;
  /** "See your full path" link. */
  more?: { href: string; label: string };
  peaks: Peak[];
  className?: string;
};

/**
 * Beyond the summit: the next programs tied to the member's progress (Level II, Mastering the
 * Kettlebell, retreats). Growth that reads as the next camp on the climb, never as an ad.
 */
export function BeyondTheSummit({ title = "Beyond the summit", sub, more, peaks, className }: Props) {
  return (
    <section className={className ? `sm-beyond ${className}` : "sm-beyond"} aria-label={title}>
      <div className="sm-beyond-head">
        <div>
          <h3 className="lq-d-xs">{title}</h3>
          {sub && <p className="sm-beyond-sub">{sub}</p>}
        </div>
        {more && (
          <Link href={more.href} className="lq-link">
            {more.label} <Icon name="arrowRight" size="xs" />
          </Link>
        )}
      </div>
      <div className="sm-peaks">
        {peaks.map((p) => (
          <Link key={p.href + p.title} href={p.href} className="sm-peak lq-press" data-locked={p.locked ? "" : undefined}>
            <span className="sm-peak-th">
              <Image src={p.image.src} alt={p.image.alt} fill sizes="(min-width: 1024px) 260px, 50vw" style={{ objectPosition: p.image.position }} />
              {p.badge &&
                (p.badge.kind === "badge" ? (
                  <span className="lq-chip sm-peak-badge" data-level="clear" data-size="sm">
                    {p.locked && <Icon name="lock" size="xs" />}
                    <span>{p.badge.label}</span>
                  </span>
                ) : (
                  <Tag tone={p.badge.tone ?? "accent"} className="sm-peak-badge">
                    {p.badge.label}
                  </Tag>
                ))}
            </span>
            <span className="sm-peak-tx">
              <b>{p.title}</b>
              <span className="sm-peak-s">{p.sub}</span>
              <span className="sm-peak-cta">
                {p.cta} <Icon name="arrowRight" size="xs" />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
