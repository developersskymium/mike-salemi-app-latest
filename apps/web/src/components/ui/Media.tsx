import Image, { type StaticImageData } from "next/image";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Glass, type GlassLevel } from "./Glass";

export type ImageSource = string | StaticImageData;

type Photo = {
  src: ImageSource;
  /** Empty string for decorative photos. */
  alt: string;
  /** CSS object-position, e.g. "46% 22%". */
  position?: string;
  sizes?: string;
  priority?: boolean;
  /** Base64 blur placeholder for remote images (static imports get one automatically). */
  blurDataURL?: string;
};

function Photo({ src, alt, position, sizes = "100vw", priority, blurDataURL }: Photo) {
  const placeholder = typeof src !== "string" || blurDataURL ? "blur" : "empty";
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      style={{ objectPosition: position }}
    />
  );
}

/* ------------------------------------------------------------------ Card */

type CardProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  image: Photo;
  /** Content of the glass footer. */
  footer?: ReactNode;
  footerLevel?: GlassLevel;
  /** Anything else layered over the photo. */
  children?: ReactNode;
  height?: number | string;
  radius?: "card" | "hero" | "panel";
  interactive?: boolean;
  as?: "section" | "article" | "div";
};

/** Media card: photo + clear-glass footer, continuous radius. */
export function Card({ image, footer, footerLevel = "clear-deep", children, height, radius = "card", interactive = true, as: Tag = "section", className, style, ...rest }: CardProps) {
  return (
    <Tag
      className={cx("lq-card", interactive && "lq-fx lq-lift", className)}
      data-fx={interactive ? "" : undefined}
      style={{ height, borderRadius: `var(--r-${radius})`, ...style }}
      {...rest}
    >
      <div className="lq-media">
        <Photo sizes="(min-width: 1024px) 700px, 100vw" {...image} />
      </div>
      {children}
      {footer && (
        <Glass level={footerLevel} className="lq-foot">
          {footer}
        </Glass>
      )}
    </Tag>
  );
}

/* ---------------------------------------------------------------- Poster */

type PosterProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  image: Photo;
  /** Centre slot: play button or a custom glyph from components/graphics. */
  glyph?: ReactNode;
  /** Overlay slot (chips, progress), positioned by the caller. */
  children?: ReactNode;
  aspect?: string;
  height?: number | string;
  /** Hero photos drift at a fraction of scroll speed. */
  parallax?: boolean;
};

export function Poster({ image, glyph, children, aspect, height, parallax, className, style, ...rest }: PosterProps) {
  return (
    <div className={cx("lq-poster", parallax && "lq-parallax", className)} style={{ aspectRatio: aspect, height, ...style }} {...rest}>
      <div className="lq-media">
        <Photo sizes="(min-width: 1024px) 900px, 100vw" {...image} />
      </div>
      {glyph && <div className="lq-glyph">{glyph}</div>}
      {children && <div className="lq-over">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------- AmbientBackdrop */

type AmbientProps = {
  src: ImageSource;
  position?: string;
  /** Pin to the viewport (page backdrop) instead of the parent. */
  fixed?: boolean;
  /** Custom wash, e.g. the player's warmer wash. */
  wash?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Blurred, saturated copy of a photo as the page's colour field. Loads a tiny rendition
 * (it's blurred by 70px), so it costs a few KB.
 */
export function AmbientBackdrop({ src, position = "50% 30%", fixed, wash, className, style }: AmbientProps) {
  return (
    <div className={cx("lq-ambient", className)} data-fixed={fixed ? "" : undefined} aria-hidden style={style}>
      <div className="lq-ambient-img">
        <Image src={src} alt="" fill sizes="96px" style={{ objectPosition: position }} />
      </div>
      <div className="lq-wash" style={wash ? { background: wash } : undefined} />
    </div>
  );
}

/** A full-bleed hero photo that fades into the page, with an optional top scrim for white text. */
export function HeroPhoto({ image, height = 600, fade = "74%", scrim = true, parallax = true }: { image: Photo; height?: number | string; fade?: string; scrim?: boolean; parallax?: boolean }) {
  const mask = `linear-gradient(#000 ${fade}, transparent)`;
  return (
    <div className={cx(parallax && "lq-parallax")} style={{ position: "absolute", inset: "0 0 auto", height, overflow: "hidden", WebkitMask: mask, mask }} aria-hidden={image.alt === "" || undefined}>
      <Photo priority sizes="100vw" {...image} />
      {scrim && <div className="lq-photo-scrim" />}
    </div>
  );
}
