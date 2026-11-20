import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "../ui/Icon";
import { Tag } from "../ui/Chip";
import type { ImageSource } from "../ui/Media";

type Props = {
  /** Small label over the title: "Up next · Level I", "Best next step". */
  eyebrow?: string;
  /** A tag on the photo (CONTINUE, BEST NEXT STEP). */
  tag?: { label: string; tone?: "accent" | "warm" | "light" | "gold" };
  title: string;
  /** One line under the title (phase · steps · minutes, or the value in one sentence). */
  meta?: ReactNode;
  href: string;
  /** The one action; the whole card is the link. */
  cta: string;
  ctaIcon?: IconName;
  /** glacier (do this) or ember (resume / progress). */
  tone?: "glacier" | "ember";
  image?: { src: ImageSource; alt: string; position?: string };
  /** 0–1 progress shown under the meta. */
  progress?: number;
  /** row: photo left (desktop); stack: photo on top. */
  layout?: "row" | "stack";
  className?: string;
};

/**
 * One obvious next step: a single card, one action. Used on Home, at the end of a day, in empty
 * states and for "beyond the summit" offers (a cross-sell reads as the next camp, never an ad).
 */
export function NextStepCard({ eyebrow, tag, title, meta, href, cta, ctaIcon = "arrowRight", tone = "glacier", image, progress, layout = "row", className }: Props) {
  return (
    <Link href={href} className={className ? `sm-next lq-press ${className}` : "sm-next lq-press"} data-layout={layout} prefetch>
      {image && (
        <span className="sm-next-photo">
          <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 240px, 100vw" style={{ objectPosition: image.position }} />
          {tag && (
            <Tag tone={tag.tone ?? "accent"} className="sm-next-tag">
              {tag.label}
            </Tag>
          )}
        </span>
      )}
      <span className="sm-next-body">
        {!image && tag && <Tag tone={tag.tone ?? "accent"}>{tag.label}</Tag>}
        {eyebrow && <span className="lq-eyebrow" data-tone={tone === "ember" ? "warm" : "accent"}>{eyebrow}</span>}
        <b className="sm-next-title">{title}</b>
        {meta && <span className="sm-next-meta">{meta}</span>}
        {progress !== undefined && (
          <span className="lq-progress" data-size="thin" data-tone={tone === "ember" ? "warm" : undefined} style={{ ["--p" as string]: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`, marginTop: 6 }}>
            <i />
          </span>
        )}
        <span className="lq-btn sm-next-cta" data-variant={tone === "ember" ? "warm" : "filled"} data-size="sm">
          <span>{cta}</span>
          <Icon name={ctaIcon} size="xs" />
        </span>
      </span>
    </Link>
  );
}
