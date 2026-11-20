"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { JournalEntry } from "@/lib/loaders/you-extras";

const day = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
type Local = { lessonId?: string; lessonTitle?: string; program?: string; question?: string; answer?: string; at?: string };

/**
 * Journal entries: server (day_notes + session notes) merged with reflections saved on this device
 * (`ms-journal`, written by the lesson page), newest first, de-duplicated by text.
 */
export function JournalList({ entries }: { entries: JournalEntry[] }) {
  const [list, setList] = useState(entries);
  useEffect(() => {
    try {
      const local = (JSON.parse(window.localStorage.getItem("ms-journal") ?? "[]") as Local[])
        .filter((e) => e.answer && e.at)
        .map((e, i) => ({ id: `l:${i}:${e.at}`, at: e.at!, kind: "day" as const, title: e.lessonTitle ?? e.question ?? "Reflection", body: e.answer!, href: null }));
      if (!local.length) return;
      const seen = new Set(entries.map((e) => e.body.trim()));
      setList([...entries, ...local.filter((e) => !seen.has(e.body.trim()))].sort((a, z) => z.at.localeCompare(a.at)));
    } catch {
      /* private mode */
    }
  }, [entries]);
  if (!list.length) return <p className="lq-t13 lq-c2 yc-empty">Notes and reflections you write on a lesson or after a session collect here.</p>;
  return (
    <ul className="yc-journal" role="list">
      {list.slice(0, 6).map((e) => {
        const inner = (
          <>
            <span className="lq-t12 lq-c3">
              {day(e.at)} · {e.title}
            </span>
            <span className="lq-serif yc-jr-body">{e.body}</span>
          </>
        );
        return <li key={e.id}>{e.href ? <Link href={e.href} className="yc-jr-item">{inner}</Link> : <div className="yc-jr-item">{inner}</div>}</li>;
      })}
    </ul>
  );
}
