import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui";

/** Round progress meter (journey accent). Value 0..1. */
export function Meter({ value, size = 44, label, stroke = 4, onPhoto }: { value: number; size?: number; label?: ReactNode; stroke?: number; onPhoto?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className="jy-meter" data-photo={onPhoto ? "" : undefined} style={{ width: size, height: size } as CSSProperties}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="jy-meter-track" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} className="jy-meter-fill" strokeWidth={stroke} strokeDasharray={`${(c * v).toFixed(2)} ${c.toFixed(2)}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      {label !== undefined && <span className="jy-meter-label">{label}</span>}
    </span>
  );
}

/** Thin bar in the journey accent. */
export function Bar({ value, label }: { value: number; label?: string }) {
  return (
    <span className="jy-bar" role={label ? "progressbar" : undefined} aria-label={label} aria-valuenow={label ? Math.round(value * 100) : undefined} aria-valuemin={label ? 0 : undefined} aria-valuemax={label ? 100 : undefined}>
      <i style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
    </span>
  );
}

export function SectionHead({ eyebrow, title, note, aside, id }: { eyebrow?: string; title: string; note?: string; aside?: ReactNode; id?: string }) {
  return (
    <div className="jy-shead">
      <div>
        {eyebrow && <p className="jy-eyebrow">{eyebrow}</p>}
        <h2 id={id} className="jy-h2">{title}</h2>
        {note && <p className="jy-note">{note}</p>}
      </div>
      {aside}
    </div>
  );
}

/** A lesson row: state glyph, title, sub line, the whole row links. */
export function LessonRow({ href, title, sub, done, now, locked, icon = "play", index }: { href: string; title: string; sub?: string; done?: boolean; now?: boolean; locked?: boolean; icon?: IconName; index?: number }) {
  return (
    <li>
      <Link href={href} className="jy-row lq-press" data-done={done ? "" : undefined} data-now={now ? "" : undefined} prefetch={false}>
        <span className="jy-row-ic" aria-hidden>
          {done ? <Icon name="check" size="xs" /> : locked ? <Icon name="lock" size="xs" /> : index !== undefined ? <b>{index}</b> : <Icon name={icon} size="xs" />}
        </span>
        <span className="jy-row-main">
          <span className="jy-row-t">{title}</span>
          {sub && <span className="jy-row-s">{sub}</span>}
        </span>
        {now && <span className="jy-pill">Up next</span>}
        {done && <span className="lq-sr">Done</span>}
        <Icon name="chevron" size="xs" className="jy-row-go" />
      </Link>
    </li>
  );
}
