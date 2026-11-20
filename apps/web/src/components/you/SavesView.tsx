"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useNow } from "@/lib/hooks/clock";
import { EmptyScene, ReadinessDial } from "@/components/graphics";
import { Button, EmptyState, Glass, Icon, Segmented, type IconName } from "@/components/ui";
import type { SavesV2 } from "@/lib/loaders/you";
import { fmtDayYear, fmtMonth, monthKey, splitDay } from "./format";
import { SaveDetail, type SaveItem } from "./SaveDetail";

export type SaveKind = "all" | "tools" | "plans" | "videos";
type Range = "all" | "7" | "30" | "90";

const ICON: Record<SaveItem["kind"], IconName> = { tool: "compass", plan: "steps", video: "play" };
const RANGE_LABEL: Record<Range, string> = { all: "All time", "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days" };

function items(d: SavesV2): SaveItem[] {
  const out: SaveItem[] = [
    ...d.tools.map((t) => ({ kind: "tool" as const, id: t.id, date: t.created_at, title: t.title, source: t.tool_name, tool: t })),
    ...d.plans.map((p) => {
      const day = splitDay(p.lesson_title);
      return { kind: "plan" as const, id: p.id, date: p.created_at, title: day.day ? `Day ${day.day} · ${day.title}` : p.lesson_title, source: [p.section_title, p.band_name].filter(Boolean).join(" · "), plan: p };
    }),
    ...d.videos.map((v) => ({ kind: "video" as const, id: v.id, date: v.saved_at, title: v.title, source: v.category ? `Library · ${v.category.replace(/-/g, " ")}` : "Library", video: v })),
  ];
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function readinessCsv(d: SavesV2) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [["Date", "Day", "Phase", "Score", "Band", "Outcome", "Table"].map(q).join(",")];
  for (const p of d.plans) lines.push([p.created_at.slice(0, 10), p.lesson_title, p.section_title ?? "", p.score, p.band_name, p.outcome, p.table?.title ?? ""].map(q).join(","));
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "session-plans.csv";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function SaveCard({ item, onOpen }: { item: SaveItem; onOpen: () => void }) {
  const [broken, setBroken] = useState(false);
  const thumb = item.kind === "video" && !broken ? item.video.thumbnail_url : null;
  return (
    <Glass as="button" type="button" radius="card" interactive className="yu-save" onClick={onOpen} data-kind={item.kind}>
      <span className="yu-save-top">
        {item.kind === "plan" ? (
          <span className="yu-save-dial" aria-hidden>
            <ReadinessDial score={Math.max(0, 60 - item.plan.score)} band={item.plan.band as "green" | "amber" | "red"} size={52} bare animated={false} />
          </span>
        ) : thumb ? (
          <span className="yu-save-thumb" aria-hidden>
            <Image src={thumb} alt="" fill sizes="96px" style={{ objectFit: "cover" }} onError={() => setBroken(true)} />
            <Icon name="play" size="xs" />
          </span>
        ) : (
          <span className="yu-save-ic" aria-hidden><Icon name={ICON[item.kind]} size="sm" /></span>
        )}
        <span className="yu-save-kind lq-t11">{item.kind === "tool" ? "Tool result" : item.kind === "plan" ? "Session plan" : "Video"}</span>
      </span>
      <span className="yu-save-title lq-t17">{item.title}</span>
      <span className="lq-t13 lq-c2 yu-save-src">{item.source}</span>
      <span className="yu-save-foot">
        <span className="lq-t13 lq-c2 lq-num">{fmtDayYear(item.date)}</span>
        <span className="lq-t13 yu-save-cta">{item.kind === "video" ? "Open" : "View result"} <Icon name="chevron" size="xs" /></span>
      </span>
    </Glass>
  );
}

/** Saves (legacy layout): kind segmented with counts + per-tool and date filters, month groups of cards, detail sheet. */
export function SavesView({ d, initialKind = "all", initialOpen }: { d: SavesV2; initialKind?: SaveKind; initialOpen?: string }) {
  const all = useMemo(() => items(d), [d]);
  const [kind, setKind] = useState<SaveKind>(initialKind);
  const [tool, setTool] = useState("all");
  const [range, setRange] = useState<Range>("all");
  const [open, setOpen] = useState<SaveItem | null>(() => all.find((i) => i.id === initialOpen) ?? null);
  const now = useNow(60_000);

  const toolNames = useMemo(() => [...new Map(d.tools.map((t) => [t.tool_id, t.tool_name])).entries()], [d.tools]);
  const counts = { all: all.length, tools: d.tools.length, plans: d.plans.length, videos: d.videos.length };
  const shown = all.filter((i) => {
    if (kind === "tools" && i.kind !== "tool") return false;
    if (kind === "plans" && i.kind !== "plan") return false;
    if (kind === "videos" && i.kind !== "video") return false;
    if (kind === "tools" && tool !== "all" && i.kind === "tool" && i.tool.tool_id !== tool) return false;
    if (range !== "all" && now && Date.parse(i.date) < now - Number(range) * 864e5) return false;
    return true;
  });
  const months = new Map<string, SaveItem[]>();
  for (const i of shown) months.set(monthKey(i.date), [...(months.get(monthKey(i.date)) ?? []), i]);

  const setUrl = (k: SaveKind, id?: string | null) => {
    const u = new URL(window.location.href);
    if (k === "all") u.searchParams.delete("kind");
    else u.searchParams.set("kind", k);
    if (id) u.searchParams.set("open", id);
    else u.searchParams.delete("open");
    window.history.replaceState(null, "", u);
  };

  const empty: Record<SaveKind, { title: string; body: string; action?: React.ReactNode; scene: "nothing-saved" | "plan-empty" | "caught-up" }> = {
    all: { title: "Nothing saved yet", body: "Session plans from your check-ins, tool results and bookmarked videos all land here.", scene: "nothing-saved", action: <Button icon="library" href="/library">Browse the Library</Button> },
    tools: { title: "No tool results yet", body: "Try the Kettlebell Selector or the Stretch Test. Your results are kept here.", scene: "nothing-saved", action: <Button icon="compass" href="/tools">Try a free tool</Button> },
    plans: { title: "No session plans yet", body: "Before each workout day you answer five quick questions. The table it gives you is saved here.", scene: "plan-empty" },
    videos: { title: "No saved videos", body: "Tap the bookmark on any video in the Library and it waits for you here.", scene: "nothing-saved", action: <Button icon="library" href="/library">Browse the Library</Button> },
  };

  return (
    <div className="yu-saves">
      <div className="yu-saves-bar-wrap">
        <Glass className="yu-saves-bar" radius="card">
          <Segmented<SaveKind>
            label="Saved items"
            value={kind}
            onChange={(k) => {
              setKind(k);
              setTool("all");
              setUrl(k);
            }}
            options={[
              { value: "all", label: `All ${counts.all}` },
              { value: "tools", label: `Tools ${counts.tools}` },
              { value: "plans", label: `Plans ${counts.plans}` },
              { value: "videos", label: `Videos ${counts.videos}` },
            ]}
          />
          <div className="yu-saves-filters">
            {kind === "tools" && toolNames.length > 0 && (
              <label className="yu-select">
                <span className="lq-sr">Tool</span>
                <select value={tool} onChange={(e) => setTool(e.target.value)}>
                  <option value="all">Every tool</option>
                  {toolNames.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                </select>
                <Icon name="chevronDown" size="xs" />
              </label>
            )}
            <label className="yu-select">
              <span className="lq-sr">Date range</span>
              <select value={range} onChange={(e) => setRange(e.target.value as Range)}>
                {(Object.keys(RANGE_LABEL) as Range[]).map((r) => <option key={r} value={r}>{RANGE_LABEL[r]}</option>)}
              </select>
              <Icon name="chevronDown" size="xs" />
            </label>
            {kind === "plans" && d.plans.length > 0 && (
              <Button size="sm" variant="glass" icon="down" onClick={() => readinessCsv(d)}>CSV</Button>
            )}
          </div>
        </Glass>
      </div>

      {shown.length === 0 ? (
        <Glass radius="card">
          <EmptyState
            title={range !== "all" && counts[kind] ? `Nothing in the ${RANGE_LABEL[range].toLowerCase()}` : empty[kind].title}
            body={range !== "all" && counts[kind] ? "Widen the date range to see older saves." : empty[kind].body}
            illustration={<EmptyScene scene={empty[kind].scene} size={190} />}
            action={range !== "all" && counts[kind] ? <Button variant="glass" onClick={() => setRange("all")}>Show all time</Button> : empty[kind].action}
          />
        </Glass>
      ) : (
        [...months].map(([m, list]) => (
          <section key={m} className="yu-month" aria-label={fmtMonth(`${m}-01`)}>
            <h2 className="yu-month-h">
              <span>{fmtMonth(`${m}-01`)}</span>
              <span className="lq-t13 lq-c2 lq-num">{list.length}</span>
            </h2>
            <div className="yu-save-grid">
              {list.map((i) => (
                <SaveCard
                  key={`${i.kind}:${i.id}`}
                  item={i}
                  onOpen={() => {
                    setOpen(i);
                    setUrl(kind, i.id);
                  }}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <SaveDetail
        item={open}
        onClose={() => {
          setOpen(null);
          setUrl(kind, null);
        }}
      />
    </div>
  );
}
