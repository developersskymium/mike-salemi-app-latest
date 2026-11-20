"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";

/**
 * next/image that swaps to a designed fallback when the poster fails (Vimeo posters that are
 * domain-restricted or not backfilled yet), including errors that happen before hydration.
 */
export function SafeImage({ fallback, ...props }: ImageProps & { fallback: ReactNode }) {
  const [broken, setBroken] = useState(false);
  if (broken || !props.src) return <>{fallback}</>;
  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      {...props}
      ref={(el) => {
        if (el && el.complete && el.naturalWidth === 0) setBroken(true);
      }}
      onError={() => setBroken(true)}
    />
  );
}
