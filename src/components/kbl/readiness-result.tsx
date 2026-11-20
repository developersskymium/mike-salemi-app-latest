import { Check } from "lucide-react";
import type { ReadinessResult } from "@/content/readiness-table";
import { cn } from "@/lib/utils";

const BAND_TONE: Record<string, { dot: string; text: string; ring: string }> = {
  green: { dot: "bg-success", text: "text-success", ring: "border-success/40 bg-success/5" },
  amber: { dot: "bg-warning", text: "text-warning", ring: "border-warning/40 bg-warning/5" },
  red: {
    dot: "bg-destructive",
    text: "text-destructive",
    ring: "border-destructive/40 bg-destructive/5",
  },
};

/** Score + band headline for a scored KBL form. */
export function ReadinessResultCard({
  result,
  eyebrow = "Readiness result",
  scoreLabel = "Fatigue score",
  scoreHint = "Lower is better",
}: {
  result: ReadinessResult;
  eyebrow?: string;
  scoreLabel?: string;
  scoreHint?: string;
}) {
  const tone = BAND_TONE[result.band.id] ?? BAND_TONE.green;
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", tone.ring)} data-band={result.band.id}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2 text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", tone.dot)} />
            {eyebrow}
          </p>
          <h3 className={cn("mt-1.5 text-base font-semibold", tone.text)}>{result.band.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {result.band.summary}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold text-foreground">
            {result.score}
            <span className="text-sm text-muted-foreground">/{result.max}</span>
          </p>
          <p className="eyebrow text-muted-foreground">{scoreLabel}</p>
          {scoreHint && <p className="text-[0.625rem] text-muted-foreground">{scoreHint}</p>}
        </div>
      </div>
      {result.guidance.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {result.guidance.map((line) => (
            <li key={line} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <Check className="mt-[0.1rem] h-3 w-3 shrink-0 text-primary" strokeWidth={3} />
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Message shown when the score lands on Recovery Day or Off Day (no table). */
export function RecoveryNotice({ result }: { result: ReadinessResult }) {
  return (
    <div role="status" className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <h3 className="font-semibold text-foreground">{result.band.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{result.band.summary}</p>
      <a href="/library" className="mt-4 inline-flex text-sm font-semibold text-primary">
        Open recovery and stretching videos
      </a>
    </div>
  );
}

/** "What you selected" list. Pass rows from `formSelections` / `readinessSelections`. */
export function AnswerRecap({
  rows,
  title = "What you selected",
}: {
  rows: { id: string; question: string; answer: string }[];
  title?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <p className="eyebrow border-b border-border px-4 py-3 text-muted-foreground">{title}</p>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3"
          >
            <span className="min-w-0 text-xs leading-relaxed text-muted-foreground">
              {row.question}
            </span>
            <span className="shrink-0 text-right text-xs font-semibold text-foreground">
              {row.answer}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
