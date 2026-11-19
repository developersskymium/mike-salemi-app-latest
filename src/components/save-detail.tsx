import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { tools } from "@/content/tools";
import { findDay } from "@/content/program";
import { formatSaveDate, type SaveItem } from "@/lib/use-saves";
import { VimeoPlayer } from "@/components/VimeoPlayer";
import { buttonStyles } from "@/components/ui-kit";
import {
  isReadinessComplete,
  readinessFormForDay,
  resolveReadiness,
} from "@/content/readiness-table";
import { CircuitTable } from "@/components/readiness";
import { cn } from "@/lib/utils";
import { formatWorkoutCsv } from "@/lib/workout-export";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

function download(filename: string, contents: string, type = "text/plain") {
  const blob = new Blob([contents], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to consume the file before releasing its URL.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "save"
  );
}

/** Turns a save back into a plain-text or CSV file the athlete can keep. */
function exportSave(item: SaveItem) {
  const stamp = new Date(item.createdAt).toISOString().slice(0, 10);

  if (item.detail.kind === "tool") {
    const row = item.detail.row;
    const tool = tools.find((t) => t.id === row.tool_id);
    const lines = [
      `${tool?.title ?? row.tool_id}`,
      `Kettlebell Lifestyle · ${formatSaveDate(row.created_at)}`,
      "",
      `Result: ${row.result?.title ?? "—"}`,
      "",
      "Your answers",
    ];
    for (const [id, value] of Object.entries(row.answers ?? {})) {
      const question = tool?.questions.find((q) => q.id === id);
      const option = question?.options.find((o) => o.value === value);
      lines.push(`• ${question?.question ?? id}: ${option?.label ?? value}`);
    }
    const bells = (row.result?.detail?.bells as string[] | undefined) ?? [];
    if (bells.length) lines.push("", "Recommended bells", ...bells.map((b) => `• ${b}`));
    download(`${slugify(item.title)}-${stamp}.txt`, lines.join("\n"));
    return;
  }

  if (item.detail.kind === "workout") {
    const row = item.detail.row;
    if (!isReadinessComplete(row.answers) || !readinessFormForDay(row.day_id)) {
      download(
        `${slugify(item.title)}-${stamp}.txt`,
        "Retake this session's Training Readiness Assessment to view the current KBL workout.",
      );
      return;
    }
    const result = resolveReadiness(row.answers, row.day_id);
    if (!result.table) {
      download(
        `${slugify(item.title)}-${stamp}.txt`,
        `${result.band.title}\n\n${result.band.summary}`,
      );
      return;
    }
    download(`${slugify(item.title)}-${stamp}.csv`, formatWorkoutCsv(result.table), "text/csv");
    return;
  }

  const video = item.detail.video;
  const lines = [
    item.title,
    `Kettlebell Lifestyle · saved ${formatSaveDate(item.createdAt)}`,
    video ? `https://vimeo.com/${video.vimeoId.split("/")[0]}` : "",
  ].filter(Boolean);
  download(`${slugify(item.title)}-${stamp}.txt`, lines.join("\n"));
}

function ToolBody({ item }: { item: SaveItem }) {
  if (item.detail.kind !== "tool") return null;
  const row = item.detail.row;
  const tool = tools.find((t) => t.id === row.tool_id);
  const bells = (row.result?.detail?.bells as string[] | undefined) ?? [];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
        <p className="eyebrow text-primary">Your result</p>
        <p className="mt-1 text-lg font-semibold text-foreground">
          {row.result?.title ?? "Saved result"}
        </p>
        {bells.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {bells.map((b) => (
              <span
                key={b}
                className="rounded-full border border-primary/30 bg-background px-2.5 py-1 text-xs font-semibold text-primary"
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="eyebrow text-muted-foreground">Your answers</p>
        <dl className="mt-2 divide-y divide-hairline">
          {Object.entries(row.answers ?? {}).map(([id, value]) => {
            const question = tool?.questions.find((q) => q.id === id);
            const option = question?.options.find((o) => o.value === value);
            return (
              <div key={id} className="grid gap-0.5 py-2.5">
                <dt className="text-xs text-muted-foreground">{question?.question ?? id}</dt>
                <dd className="text-sm font-medium text-foreground">{option?.label ?? value}</dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}

function WorkoutBody({ item }: { item: SaveItem }) {
  if (item.detail.kind !== "workout") return null;
  const row = item.detail.row;
  const location = findDay(row.day_id);
  const result =
    isReadinessComplete(row.answers) && readinessFormForDay(row.day_id)
      ? resolveReadiness(row.answers, row.day_id)
      : null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-hairline bg-secondary/40 p-4">
        <p className="eyebrow text-primary">{location ? location.phase.label : "Session plan"}</p>
        <p className="mt-1 text-lg font-semibold text-foreground">{result?.reason ?? item.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {result?.band.summary ??
            "Retake this session’s assessment to view its current KBL workout."}
        </p>
      </div>

      {result?.table && <CircuitTable table={result.table} />}
    </div>
  );
}

function VideoBody({ item }: { item: SaveItem }) {
  if (item.detail.kind !== "video") return null;
  const video = item.detail.video;
  if (!video) {
    return <p className="text-sm text-muted-foreground">This video is no longer in the library.</p>;
  }
  return (
    <div className="space-y-4">
      <VimeoPlayer vimeoId={video.vimeoId} title={video.title} poster={video.image || undefined} />
      <div className="flex flex-wrap gap-1.5">
        {video.tags.slice(0, 6).map((t) => (
          <span
            key={t}
            className="eyebrow rounded-full bg-secondary px-2.5 py-1 text-muted-foreground"
          >
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
}

/** iOS-style sheet that replays a saved result without leaving the Saves page. */
export function SaveDetailDialog({
  item,
  onClose,
}: {
  item: SaveItem | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="z-[90] flex max-h-[92vh] w-[calc(100%_-_1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-[1.75rem] border-hairline bg-elevated p-0 sm:rounded-[1.75rem]"
      >
        <div className="border-b border-hairline px-5 py-4 pr-14">
          <div className="min-w-0">
            <p className="eyebrow text-muted-foreground">{formatSaveDate(item.createdAt)}</p>
            <DialogTitle className="mt-0.5 truncate text-base font-semibold text-foreground">
              {item.title}
            </DialogTitle>
            <p className="truncate text-sm text-muted-foreground">{item.subtitle}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {item.detail.kind === "tool" && <ToolBody item={item} />}
          {item.detail.kind === "workout" && <WorkoutBody item={item} />}
          {item.detail.kind === "video" && <VideoBody item={item} />}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-5 py-4">
          <button
            type="button"
            onClick={() => exportSave(item)}
            className={cn(buttonStyles.primary, "px-4 py-2.5 text-sm")}
          >
            <Download className="h-4 w-4" /> Download
          </button>
          {item.href && (
            <Link
              to={item.href.to}
              params={item.href.params as never}
              className={cn(buttonStyles.outline, "px-4 py-2.5 text-sm")}
            >
              Open in app
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
