"use client";

import Link from "next/link";
import { ReadinessDial } from "@/components/graphics";
import { CircuitTable } from "@/components/training/CircuitTable";
import { Button, Chip, Glass, Icon, Sheet, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import type { SavedTool, SavedVideo, SessionPlan } from "@/lib/loaders/you";
import { lessonHref } from "@/components/today/model";
import { fmtLong, splitDay } from "./format";
import "@/components/training/day.css";

export type SaveItem =
  | { kind: "tool"; id: string; date: string; title: string; source: string; tool: SavedTool }
  | { kind: "plan"; id: string; date: string; title: string; source: string; plan: SessionPlan }
  | { kind: "video"; id: string; date: string; title: string; source: string; video: SavedVideo };

/** A save as plain text (for copy / share), like the legacy export. */
export function saveText(item: SaveItem) {
  const lines: string[] = [];
  if (item.kind === "tool") {
    const t = item.tool;
    lines.push(t.tool_name, `Mike Salemi · ${fmtLong(t.created_at)}`, "", `Result: ${t.title}`);
    if (t.summary) lines.push(t.summary);
    if (t.score) lines.push(`Score: ${t.score.value} of ${t.score.max}`);
    if (t.chips.length) lines.push("", "Recommended bells", ...t.chips.map((c) => `• ${c}`));
    if (t.answers.length) lines.push("", "Your answers", ...t.answers.map((a) => `• ${a.question}: ${a.answer}`));
  } else if (item.kind === "plan") {
    const p = item.plan;
    lines.push(`${p.program_name} · ${p.section_title ?? ""}`.trim(), p.lesson_title, `${fmtLong(p.created_at)} · ${p.band_name} (score ${p.score})`);
    if (p.table) {
      lines.push("", p.table.title);
      for (const r of p.table.rows ?? []) if (r.exercise) lines.push(`• ${r.circuit ?? ""} ${r.exercise} — ${r.sets ?? ""} × ${r.reps ?? ""}, rest ${r.rest ?? ""}, ${r.intensity ?? ""}`.replace(/\s+/g, " "));
    }
  } else {
    lines.push(item.title, `Saved ${fmtLong(item.date)}`);
  }
  return lines.join("\n");
}

function ToolBody({ t }: { t: SavedTool }) {
  return (
    <div className="yu-sd">
      <Glass radius="inner" className="yu-sd-result">
        <span className="lq-t13 yu-eyebrow">Your result</span>
        <p className="lq-t22" style={{ fontWeight: 700 }}>{t.title}</p>
        {t.summary && <p className="lq-t15 lq-c2">{t.summary}</p>}
        {(t.score || t.chips.length > 0) && (
          <div className="yu-sd-chips">
            {t.score && <Chip variant="tint">Score {t.score.value} / {t.score.max}</Chip>}
            {t.chips.map((c) => <Chip key={c} variant="outline">{c}</Chip>)}
          </div>
        )}
      </Glass>
      {t.answers.length > 0 && (
        <div>
          <p className="yu-overline" style={{ marginBottom: 4 }}>Your answers</p>
          <dl className="yu-sd-answers">
            {t.answers.map((a) => (
              <div key={a.question}>
                <dt className="lq-t13 lq-c2">{a.question}</dt>
                <dd className="lq-t15" style={{ fontWeight: 600 }}>{a.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function PlanBody({ p }: { p: SessionPlan }) {
  const day = splitDay(p.lesson_title);
  return (
    <div className="yu-sd">
      <Glass radius="inner" className="yu-sd-result yu-sd-plan">
        <ReadinessDial score={Math.max(0, 60 - p.score)} band={p.band as "green" | "amber" | "red"} size={96} bare animated={false} />
        <div style={{ minWidth: 0 }}>
          <span className="lq-t13 yu-eyebrow">Readiness check</span>
          <p className="lq-t20" style={{ fontWeight: 700 }}>{p.band_name}</p>
          <p className="lq-t15 lq-c2">
            Score {p.score} · {[p.section_title, day.day ? `Day ${day.day}` : null].filter(Boolean).join(", ")}
          </p>
          {p.table && <p className="lq-t13 lq-c2">{p.table.title}</p>}
        </div>
      </Glass>
      {p.table ? (
        <CircuitTable table={p.table} />
      ) : (
        <p className="lq-t15 lq-c2 yu-sd-note">
          {p.outcome === "rest" ? "This check-in called for an off day, so there was no table to train. Rest counts." : "Retake this session's assessment to view its current KBL workout."}
        </p>
      )}
    </div>
  );
}

function VideoBody({ v }: { v: SavedVideo }) {
  if (!v.embed) return <p className="lq-t15 lq-c2">This video is no longer in the library.</p>;
  return (
    <div className="yu-sd">
      <div className="yu-sd-video">
        <iframe src={v.embed} title={v.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
      </div>
      <div className="yu-sd-chips">
        {v.category && <Chip variant="fill">{v.category.replace(/-/g, " ")}</Chip>}
        {v.duration_seconds ? <Chip variant="outline">{Math.max(1, Math.round(v.duration_seconds / 60))} min</Chip> : null}
      </div>
    </div>
  );
}

/** Replays a save without leaving the page: tool result, session plan (circuit table) or video. */
export function SaveDetail({ item, onClose }: { item: SaveItem | null; onClose: () => void }) {
  const toast = useToast();
  const copy = async () => {
    if (!item) return;
    haptic(8);
    const text = saveText(item);
    try {
      if (navigator.share && item.kind !== "plan") await navigator.share({ title: item.title, text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Copied as text", { tone: "success", icon: "check" });
      }
    } catch {
      /* dismissed */
    }
  };
  const primary =
    item?.kind === "tool" ? (
      <Button block size="md" icon="repeat" href={`/tools/${item.tool.tool_id}`}>Run it again</Button>
    ) : item?.kind === "plan" ? (
      <Button block size="md" iconAfter="chevron" href={lessonHref(item.plan.program_slug, item.plan.lesson_id)}>Open this day</Button>
    ) : item?.kind === "video" ? (
      <Button block size="md" iconAfter="chevron" href={`/library/${item.video.id}`}>Open in Library</Button>
    ) : null;
  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={item ? (item.kind === "tool" ? item.tool.tool_name : item.title) : ""}
      description={item ? `${item.kind === "tool" ? "Saved" : item.source} · ${fmtLong(item.date)}` : undefined}
      detents={["large"]}
      desktop="side"
      footer={
        item && (
          <div className="yu-sd-foot">
            <Button size="md" variant="glass" icon="share" onClick={copy}>{item.kind === "plan" ? "Copy" : "Share"}</Button>
            {primary}
          </div>
        )
      }
    >
      {item?.kind === "tool" && <ToolBody t={item.tool} />}
      {item?.kind === "plan" && <PlanBody p={item.plan} />}
      {item?.kind === "video" && <VideoBody v={item.video} />}
      {item?.kind === "plan" && (
        <Link href={`/programs/${item.plan.program_slug}`} className="yu-seeall lq-t15" style={{ marginTop: 12 }}>
          {item.plan.program_name} <Icon name="chevron" size="xs" />
        </Link>
      )}
    </Sheet>
  );
}
