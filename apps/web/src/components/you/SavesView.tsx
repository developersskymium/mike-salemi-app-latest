"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { EmptyScene, ReadinessDial } from "@/components/graphics";
import { Button, EmptyState, Glass, Icon, Segmented } from "@/components/ui";
import type { SavesData } from "@/lib/loaders/today-plan-you";
import "@/components/today/tpy.css";

type Tab = "videos" | "tools" | "readiness";
const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
const mins = (s: number | null) => (s ? `${Math.max(1, Math.round(s / 60))} min` : null);

function csv(rows: SavesData["readiness"]) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [["Date", "Lesson", "Score", "Band", "Outcome"].map(q).join(",")];
  for (const r of rows) lines.push([r.created_at.slice(0, 10), r.lesson_title, r.score, r.band_name, r.outcome].map(q).join(","));
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "readiness-history.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function summary(r: Record<string, unknown>) {
  for (const k of ["headline", "label", "title", "summary", "recommendation"]) if (typeof r[k] === "string") return r[k] as string;
  return null;
}

/** Saved videos, tool results and readiness history, one segment each. */
export function SavesView({ d }: { d: SavesData }) {
  const [tab, setTab] = useState<Tab>("videos");
  return (
    <div className="tpy-stack">
      <Segmented<Tab>
        label="Saved items"
        value={tab}
        onChange={setTab}
        options={[
          { value: "videos", label: `Videos${d.videos.length ? ` ${d.videos.length}` : ""}` },
          { value: "tools", label: `Tools${d.toolResults.length ? ` ${d.toolResults.length}` : ""}` },
          { value: "readiness", label: "Readiness" },
        ]}
      />

      {tab === "videos" &&
        (d.videos.length ? (
          <Glass radius="card" className="tpy-list">
            {d.videos.map((v) => (
              <Link key={v.id} href={`/library/${v.id}`} className="tpy-row">
                <span style={{ position: "relative", width: 72, height: 46, borderRadius: 10, overflow: "hidden", flex: "none", background: "var(--fill)" }}>
                  {v.thumbnail_url && <Image src={v.thumbnail_url} alt="" fill sizes="72px" style={{ objectFit: "cover" }} />}
                </span>
                <span className="tpy-row-main">
                  <span className="lq-t15" style={{ fontWeight: 600 }}>{v.title}</span>
                  <span className="lq-t13 lq-c2">{[v.category, mins(v.duration_seconds)].filter(Boolean).join(" · ") || `Saved ${when(v.saved_at)}`}</span>
                </span>
                <Icon name="chevron" size="sm" className="tpy-chev" />
              </Link>
            ))}
          </Glass>
        ) : (
          <Glass radius="card">
            <EmptyState
              title="No saved videos"
              body="Tap the bookmark on any video in the Library and it waits for you here."
              illustration={<EmptyScene scene="nothing-saved" size={200} />}
              action={<Button icon="library" href="/library">Browse the Library</Button>}
            />
          </Glass>
        ))}

      {tab === "tools" &&
        (d.toolResults.length ? (
          <Glass radius="card" className="tpy-list">
            {d.toolResults.map((r) => (
              <Link key={r.id} href={`/tools/${r.tool_id}`} className="tpy-row">
                <span className="tpy-row-icon" aria-hidden><Icon name="sparkle" size="sm" /></span>
                <span className="tpy-row-main">
                  <span className="lq-t15" style={{ fontWeight: 600 }}>{summary(r.result) ?? r.tool_name}</span>
                  <span className="lq-t13 lq-c2">{r.tool_name} · {when(r.created_at)}</span>
                </span>
                <Icon name="chevron" size="sm" className="tpy-chev" />
              </Link>
            ))}
          </Glass>
        ) : (
          <Glass radius="card">
            <EmptyState
              title="No tool results yet"
              body="Try the Kettlebell Selector, Stretch Test, Readiness Check or Roadmap. Your results are kept here."
              illustration={<EmptyScene scene="nothing-saved" size={200} />}
              action={<Button icon="compass" href="/programs?tab=tools">Try a free tool</Button>}
            />
          </Glass>
        ))}

      {tab === "readiness" &&
        (d.readiness.length ? (
          <>
            <Glass radius="card" className="tpy-list">
              {d.readiness.map((r) => (
                <div key={r.id} className="tpy-row">
                  <ReadinessDial score={r.score} size={44} />
                  <span className="tpy-row-main">
                    <span className="lq-t15" style={{ fontWeight: 600 }}>{r.band_name}</span>
                    <span className="lq-t13 lq-c2">{r.lesson_title} · {when(r.created_at)}</span>
                  </span>
                  <span className="lq-t17 lq-num">{r.score}</span>
                </div>
              ))}
            </Glass>
            <Button variant="glass" icon="down" onClick={() => csv(d.readiness)}>Download CSV</Button>
          </>
        ) : (
          <Glass radius="card">
            <EmptyState
              title="No readiness checks yet"
              body="Before each workout day you answer five quick questions. Your scores build a history here, ready to export."
              illustration={<EmptyScene scene="caught-up" size={200} />}
            />
          </Glass>
        ))}
    </div>
  );
}
