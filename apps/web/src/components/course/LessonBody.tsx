"use client";

import { Fragment, useState, type ReactNode } from "react";
import { inlineText, parseMarkdown, prettyResourceTitle, type LessonResource, type MdBlock, type MdInline } from "@ms/core";
import { CourseVideo } from "./CourseVideo";
import { Doc, Download, External, Headphones } from "./glyphs";
import type { VideoRef } from "@ms/core";

/* ------------------------------------------------------------------ markdown */

function Inline({ nodes }: { nodes: MdInline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case "text":
            return <Fragment key={i}>{n.v}</Fragment>;
          case "strong":
            return <strong key={i}><Inline nodes={n.c} /></strong>;
          case "em":
            return <em key={i}><Inline nodes={n.c} /></em>;
          case "code":
            return <code key={i}>{n.v}</code>;
          case "br":
            return <br key={i} />;
          case "link": {
            const external = /^https?:/i.test(n.href);
            return (
              <a key={i} href={n.href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
                <Inline nodes={n.c} />
              </a>
            );
          }
        }
      })}
    </>
  );
}

/** Body images from the legacy host may not be mirrored yet: hide quietly instead of a broken box. */
function BodyImage({ src, alt }: { src: string; alt: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary imported content sizes */}
      <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setOk(false)} />
    </figure>
  );
}

function Block({ b }: { b: MdBlock }): ReactNode {
  switch (b.t) {
    case "h": {
      const H = (`h${Math.min(4, b.level + 1)}`) as "h2" | "h3" | "h4";
      return <H><Inline nodes={b.c} /></H>;
    }
    case "p":
      return <p><Inline nodes={b.c} /></p>;
    case "lead":
      return <p className="crs-lead"><Inline nodes={b.c} /></p>;
    case "ul":
      return <ul>{b.items.map((it, i) => <li key={i}><Inline nodes={it} /></li>)}</ul>;
    case "ol":
      return <ol start={b.start}>{b.items.map((it, i) => <li key={i}><Inline nodes={it} /></li>)}</ol>;
    case "quote":
      return <blockquote>{b.c.map((x, i) => <Block key={i} b={x} />)}</blockquote>;
    case "img":
      return <BodyImage src={b.src} alt={b.alt} />;
    case "hr":
      return <hr />;
    case "table":
      return (
        <div className="crs-table">
          <table>
            <thead><tr>{b.head.map((c, i) => <th key={i}><Inline nodes={c} /></th>)}</tr></thead>
            <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Inline nodes={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
  }
}

/**
 * Reading body. `hide` drops bold-only lines that merely named a video shown above or in the
 * breakdowns (the source pages put a heading where each embed was); separators left dangling are collapsed.
 */
export function Markdown({ source, hide }: { source: string; hide?: Set<string> }) {
  const norm = (s: string) => s.replace(/[*_:\s]+/g, " ").trim().toLowerCase();
  const hidden = new Set([...(hide ?? [])].map(norm));
  const blocks = parseMarkdown(source).filter((b) => !(b.t === "lead" && hidden.has(norm(inlineText(b.c)))));
  const tidy = blocks.filter((b, i, a) => !(b.t === "hr" && (i === 0 || i === a.length - 1 || a[i - 1]!.t === "hr")));
  if (!tidy.length) return null;
  return <div className="crs-read">{tidy.map((b, i) => <Block key={i} b={b} />)}</div>;
}

/* ------------------------------------------------------------------ audio, files, clips */

export function AudioList({ items }: { items: LessonResource[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!items.length) return null;
  return (
    <div className="crs-audio">
      {items.map((r) => {
        const playable = /\.(mp3|m4a|wav|ogg)(\?|$)/i.test(r.url);
        return (
          <div key={r.url}>
            <div className="crs-arow">
              <button
                type="button"
                className="crs-x crs-arow-ic"
                aria-label={playable ? `Listen to ${prettyResourceTitle(r.title)}` : prettyResourceTitle(r.title)}
                onClick={() => (playable ? setOpen((o) => (o === r.url ? null : r.url)) : window.open(r.url, "_blank", "noopener"))}
              >
                <Headphones />
              </button>
              <span className="crs-arow-main">
                <b>{prettyResourceTitle(r.title)}</b>
                <small>Audio session{playable ? " · tap to listen" : ""}</small>
              </span>
              <a className="crs-ghost" href={r.url} target="_blank" rel="noreferrer" download aria-label={`Download ${prettyResourceTitle(r.title)}`}>
                <Download />
              </a>
            </div>
            {open === r.url && <audio className="crs-audio-player" src={r.url} controls autoPlay preload="none" />}
          </div>
        );
      })}
    </div>
  );
}

export function Downloads({ items }: { items: LessonResource[] }) {
  if (!items.length) return null;
  return (
    <section className="crs-files" aria-labelledby="crs-files-h">
      <h2 id="crs-files-h" className="crs-h">Downloads</h2>
      <div className="crs-files-list">
        {items.map((r) => (
          <a key={r.url} className="crs-frow" href={r.url} target="_blank" rel="noreferrer">
            {r.kind === "link" ? <External /> : <Doc />}
            <span className="crs-ellipsis">{prettyResourceTitle(r.title)}</span>
            {r.kind === "link" ? <External /> : <Download />}
          </a>
        ))}
      </div>
    </section>
  );
}

export function Clips({ clips, fallbackImage }: { clips: (VideoRef & { title: string })[]; fallbackImage: string | null }) {
  if (!clips.length) return null;
  return (
    <section className="crs-clips" aria-labelledby="crs-clips-h">
      <h2 id="crs-clips-h" className="crs-h">Technique breakdowns · {clips.length}</h2>
      <div className="crs-clip-grid">
        {clips.map((c, i) => (
          <div key={`${c.providerId}-${i}`} className="crs-clip">
            <CourseVideo video={c} poster={c.thumbnailUrl ?? null} title={prettyResourceTitle(c.title)} fallbackImage={fallbackImage} kicker={`Clip ${String(i + 1).padStart(2, "0")}`} compact />
            <p><span>{String(i + 1).padStart(2, "0")}</span><span className="crs-clip-t crs-ellipsis">{prettyResourceTitle(c.title)}</span></p>
          </div>
        ))}
      </div>
    </section>
  );
}
