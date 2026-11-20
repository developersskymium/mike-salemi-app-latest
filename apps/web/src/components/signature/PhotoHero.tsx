import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { ImageSource } from "../ui/Media";

export type PhotoFocus = {
  src: ImageSource;
  /** Empty string for decorative photos. */
  alt: string;
  /**
   * Focal point as CSS object-position ("78% 30%"): the part of the photo that must stay in frame
   * (Mike's face). Pick it so no crop cuts a face at any width.
   */
  focal?: string;
  /** A different focal point for phones (portrait crops), e.g. "62% 20%". */
  focalPhone?: string;
  /** cover (default) or contain (never crop: letterboxed on the ink ground). */
  fit?: "cover" | "contain";
  blurDataURL?: string;
};

type Props = {
  image: PhotoFocus;
  /** One ink scrim for legibility, never a tint: left (desktop heroes), bottom (phone, cards), soft, none. */
  scrim?: "left" | "bottom" | "soft" | "none";
  /** Scrim on phones (defaults to bottom when `scrim` is left). */
  scrimPhone?: "left" | "bottom" | "soft" | "none";
  /** Minimum height (px or CSS); the hero grows with its content. */
  minHeight?: number | string;
  /** Fixed aspect ratio instead of a min height, e.g. "16/10". */
  aspect?: string;
  radius?: number | string;
  priority?: boolean;
  sizes?: string;
  /** Overlay content (eyebrow, headline, actions), white on the scrim. */
  children?: ReactNode;
  /** Absolutely placed extras (badges, a quote card). */
  overlay?: ReactNode;
  as?: "section" | "div" | "header";
  className?: string;
  style?: CSSProperties;
};

/**
 * Summit photo hero: Mike in full colour (never graded), a single ink scrim so white type reads,
 * content laid over it, and a focal point so faces are never cropped (object-position per breakpoint).
 * Fixed boxes (min-height/aspect) and `fill` images keep layout shift at zero.
 */
export function PhotoHero({ image, scrim = "left", scrimPhone, minHeight = 420, aspect, radius, priority, sizes = "(min-width: 1024px) 1100px, 100vw", children, overlay, as: Tag = "section", className, style }: Props) {
  const sp = scrimPhone ?? (scrim === "left" ? "bottom" : scrim);
  return (
    <Tag
      className={className ? `sm-hero ${className}` : "sm-hero"}
      data-scrim={scrim}
      data-scrim-phone={sp}
      style={{
        minHeight: aspect ? undefined : minHeight,
        aspectRatio: aspect,
        borderRadius: radius,
        "--focal": image.focal ?? "50% 30%",
        "--focal-phone": image.focalPhone ?? image.focal ?? "50% 30%",
        ...style,
      } as CSSProperties}
    >
      <div className="sm-hero-photo" data-fit={image.fit ?? "cover"}>
        <Image src={image.src} alt={image.alt} fill priority={priority} sizes={sizes} placeholder={typeof image.src !== "string" || image.blurDataURL ? "blur" : "empty"} blurDataURL={image.blurDataURL} />
      </div>
      {children !== undefined && <div className="sm-hero-content">{children}</div>}
      {overlay}
    </Tag>
  );
}
