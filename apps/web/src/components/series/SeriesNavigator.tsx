"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/ui";
import { KIND_LABEL, chapterProgress, type SeriesChapter, type SeriesItem, type SeriesSignature } from "@/lib/series";

/** Chapters strip (weeks, pillars, steps…) + a grid of small thumbnail cards. Switching is instant client state. */
export function SeriesNavigator({
  slug, chapters, initial, nextId, locked, sig,
}: { slug: string; chapters: SeriesChapter[]; initial: number; nextId: string | null; locked: boolean; sig: SeriesSignature }) {
  const [at, setAt] = useState(initial);
  const ch = chapters[at] ?? chapters[0];
  const stripRef = useRef<HTMLDivElement>(null);
  if (!ch) return null;
  const pr = chapterProgress(ch);
  const many = chapters.length > 1;

  const pick = (i: number) => {
    setAt(i);
    const el = stripRef.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  };

  return (
    <section className="sr-nav" aria-label="Lessons">
      {many && (
        <div className="sr-strip" role="tablist" aria-label={sig === "journey" ? "Weeks" : sig === "pillars" ? "Pillars" : "Chapters"} ref={stripRef} data-sig={sig}>
          {chapters.map((c, i) => {
            const p = chapterProgress(c);
            const state = c.soon && !c.items.length ? "soon" : p.total && p.pct >= 1 ? "done" : c.items.some((x) => x.id === nextId) ? "now" : undefined;
            return (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={i === at}
                className="sr-tab"
                data-state={state}
                onClick={() => pick(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") pick(Math.min(chapters.length - 1, i + 1));
                  if (e.key === "ArrowLeft") pick(Math.max(0, i - 1));
                }}
              >
                <span className="sr-tab-dot" aria-hidden>{state === "done" ? <Icon name="check" size="xs" /> : state === "soon" ? <Icon name="lock" size="xs" /> : null}</span>
                <span className="sr-tab-l">{c.short}</span>
                {p.total > 0 && <span className="sr-tab-m lq-num">{p.done}/{p.total}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="sr-chap" role={many ? "tabpanel" : undefined} key={ch.key}>
        <div className="sr-chap-head">
          <h2 className="sr-h2">{ch.label}</h2>
          {ch.blurb && <p className="sr-muted">{ch.blurb}</p>}
          {pr.total > 0 && !ch.soon && <span className="sr-muted lq-num">{pr.done} of {pr.total} done</span>}
        </div>
        {ch.items.length ? (
          <ul className="sr-grid">
            {ch.items.map((it, i) => (
              <li key={it.id} style={{ "--i": i } as CSSProperties}>
                <SeriesCard item={it} href={`/programs/${slug}/course/${it.id}`} next={it.id === nextId} locked={locked && i > 0} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="sr-soon">
            <Icon name="lock" size="sm" />
            <span><b>{ch.soon ?? "Opening soon"}</b><small>Mike is preparing this part. It appears here when it's ready.</small></span>
          </div>
        )}
      </div>
    </section>
  );
}

export function SeriesCard({ item, href, next, locked, active, onClick, row }: { item: SeriesItem; href: string; next?: boolean; locked?: boolean; active?: boolean; onClick?: () => void; row?: boolean }) {
  const inner = (
    <>
      <span className="sr-card-thumb">
        <Image src={item.thumb ?? item.photo.src} alt="" fill sizes="(min-width: 1024px) 240px, 45vw" style={{ objectPosition: item.thumb ? "50% 50%" : item.photo.position }} />
        {item.kind !== "lesson" && <span className="sr-badge" data-kind={item.kind}>{KIND_LABEL[item.kind]}</span>}
        <span className="sr-card-state" aria-hidden>
          {locked ? <Icon name="lock" size="xs" /> : item.done ? <Icon name="check" size="xs" /> : item.video ? <Icon name="play" size="xs" /> : <Icon name="file" size="xs" />}
        </span>
        {item.done && <span className="sr-card-done" aria-hidden />}
      </span>
      <span className="sr-card-body">
        <b className="sr-card-t">{item.title}</b>
        <small className="sr-card-m">
          {next ? <em>Up next</em> : item.done ? "Done" : item.n ? <span className="lq-num">{String(item.n).padStart(2, "0")}</span> : null}
          {item.minutes ? <span className="lq-num"> · {item.minutes} min</span> : null}
        </small>
      </span>
    </>
  );
  return (
    <Link href={href} className="sr-card lq-press" data-done={item.done ? "" : undefined} data-next={next ? "" : undefined} aria-current={active ? "true" : undefined} data-row={row ? "" : undefined} onClick={onClick} prefetch scroll={!row}>
      {inner}
    </Link>
  );
}
