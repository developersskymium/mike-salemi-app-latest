import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download } from "lucide-react";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import { KBL_FORMS, formSelections } from "@/content/kbl-forms";
import { findDay, dayLabel } from "@/content/program";
import { listKblFormEntries, type KblFormEntry } from "@/lib/kbl-entries.functions";
import { cn } from "@/lib/utils";

const OUTCOME_TONE: Record<string, string> = {
  workout: "bg-success/10 text-success",
  recovery: "bg-warning/10 text-warning",
  rest: "bg-destructive/10 text-destructive",
};

function dayName(dayId: string) {
  const location = findDay(dayId);
  return location ? `${location.course.title} · ${location.phase.label} · ${dayLabel(location.day)}` : dayId;
}

function toCsv(entries: KblFormEntry[]) {
  const head = ["submitted", "member", "day", "form", "score", "result", "table", "answers"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = entries.map((e) => {
    const form = e.form_id ? KBL_FORMS[e.form_id] : undefined;
    const answers = form
      ? formSelections(form, e.answers)
          .map((s) => `${s.question} ${s.answer}`)
          .join(" | ")
      : JSON.stringify(e.answers);
    return [
      e.created_at,
      e.member,
      dayName(e.day_id),
      form ? `${form.id} — ${form.title}` : e.form_id,
      e.score,
      e.band_name,
      e.table_id,
      answers,
    ]
      .map(esc)
      .join(",");
  });
  return [head.join(","), ...lines].join("\n");
}

/** Admin list of members' workout-day form entries, with a form filter and CSV export. */
export function KblFormEntriesPanel() {
  const fn = useServerFn(listKblFormEntries);
  const query = useQuery({ queryKey: ["kbl-form-entries"], queryFn: () => fn() });
  const [formId, setFormId] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  const entries = useMemo(
    () => (query.data ?? []).filter((e) => formId === "all" || e.form_id === formId),
    [query.data, formId],
  );

  function exportCsv() {
    const blob = new Blob([toCsv(entries)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kbl-form-entries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (query.isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <Spinner />
      </div>
    );
  }
  if (query.error) {
    return <p className="text-sm text-destructive">{(query.error as Error).message}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={formId}
          onChange={(e) => setFormId(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          aria-label="Filter by form"
        >
          <option value="all">All workout forms</option>
          {Object.values(KBL_FORMS).map((f) => (
            <option key={f.id} value={f.id}>
              {f.id} — {f.title}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">{entries.length} entries</span>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!entries.length}
          className={cn(buttonStyles.outline, "ml-auto disabled:opacity-40")}
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {!entries.length ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No form entries yet. They appear here as members submit their workout-day assessments.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-muted/40 text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Form</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const form = e.form_id ? KBL_FORMS[e.form_id] : undefined;
                const expanded = open === e.id;
                return (
                  <Fragment key={e.id}>
                    <tr
                      onClick={() => setOpen(expanded ? null : e.id)}
                      className="cursor-pointer border-t border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{e.member}</td>
                      <td className="px-4 py-3">{dayName(e.day_id)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {form ? `${form.id} — ${form.title}` : (e.form_id ?? "—")}
                      </td>
                      <td className="px-4 py-3 font-semibold">{e.score ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            OUTCOME_TONE[e.outcome ?? ""] ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {e.band_name ?? e.outcome ?? "—"}
                          {e.table_id ? ` · Table ${e.table_id}` : ""}
                        </span>
                      </td>
                    </tr>
                    {expanded && form && (
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan={6} className="px-4 py-3">
                          <ul className="grid gap-1.5 sm:grid-cols-2">
                            {formSelections(form, e.answers).map((s) => (
                              <li key={s.id} className="text-xs">
                                <span className="text-muted-foreground">{s.question}</span>{" "}
                                <span className="font-semibold text-foreground">{s.answer}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
