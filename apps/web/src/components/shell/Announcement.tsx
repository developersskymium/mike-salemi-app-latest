"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "../ui/Icon";
import { NOTICE_COOKIE } from "./notice";


/**
 * The announcement (first live "banner" notice), rendered inside AppShell's announcement slot. Desktop: a slim centred strip over the top bar.
 * Phone: a compact two-line card under the header (icon, title, one line of detail, chevron), the
 * whole card one tap target (D15). Members can dismiss it; the choice is a cookie the layout reads,
 * so a dismissed notice never renders (and never shifts the page) on the next load.
 */
export function Announcement({ id, title, body, linkLabel, linkUrl }: { id: string; title: string; body?: string | null; linkLabel?: string | null; linkUrl?: string | null }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const dismiss = () => {
    document.cookie = `${NOTICE_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    setHidden(true);
  };
  const detail = body?.replace(/^[\s—–-]+/, "") || null;
  const text = (
    <>
      <span className="lq-tag sm-ann-new" data-tone="warm">New</span>
      <span className="sm-ann-ic" aria-hidden>
        <Icon name="mountain" size="xs" />
      </span>
      <span className="sm-announce-t">
        <strong>{title}</strong>
        {detail ? <span className="sm-ann-d"><span className="sm-ann-sep"> — </span>{detail}</span> : null}
      </span>
    </>
  );
  return (
    <div className="sm-ann">
        {linkUrl ? (
          <Link href={linkUrl} className="sm-ann-main" prefetch>
            {text}
            <span className="sm-announce-a">
              <span className="sm-ann-l">{linkLabel || "Learn more"}</span> <Icon name="arrowRight" size="xs" />
            </span>
          </Link>
        ) : (
          <span className="sm-ann-main">{text}</span>
        )}
        <button type="button" className="sm-ann-x" onClick={dismiss} aria-label="Dismiss announcement">
          <Icon name="close" size="xs" />
        </button>
    </div>
  );
}
