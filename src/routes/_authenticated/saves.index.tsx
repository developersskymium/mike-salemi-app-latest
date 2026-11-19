import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, ClipboardList, Wrench } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { SectionHeading } from "@/components/media";
import { EmptyState, CardGridSkeleton, buttonStyles } from "@/components/ui-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SaveCard } from "@/components/save-card";
import { SaveDetailDialog } from "@/components/save-detail";
import { useSaves, type SaveItem } from "@/lib/use-saves";
import { tools } from "@/content/tools";

export const Route = createFileRoute("/_authenticated/saves/")({
  head: () => ({
    meta: [
      { title: "Saves — Kettlebell Lifestyle" },
      {
        name: "description",
        content:
          "Every saved tool result and workout plan in one place, filterable by type and date.",
      },
      { property: "og:title", content: "Saves — Kettlebell Lifestyle" },
      { property: "og:description", content: "Your saved tool results and workout session plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SavesPage,
});

const RANGES = [
  { id: "all", label: "All time", days: 0 },
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
];

function SavesPage() {
  const { items, isLoading } = useSaves();
  const [kind, setKind] = useState<"all" | "tool" | "workout" | "video">("all");
  const [source, setSource] = useState<string>("all");
  const [range, setRange] = useState("all");
  const [open, setOpen] = useState<SaveItem | null>(null);

  const filtered = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)?.days ?? 0;
    const cutoff = days ? Date.now() - days * 86_400_000 : 0;
    return items.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (kind === "tool" && source !== "all" && item.sourceId !== source) return false;
      if (cutoff && new Date(item.createdAt).getTime() < cutoff) return false;
      return true;
    });
  }, [items, kind, source, range]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const key = new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [filtered]);

  const counts = useMemo(
    () => ({
      all: items.length,
      tool: items.filter((i) => i.kind === "tool").length,
      workout: items.filter((i) => i.kind === "workout").length,
      video: items.filter((i) => i.kind === "video").length,
    }),
    [items],
  );

  const KINDS = [
    { id: "all", label: "All" },
    { id: "tool", label: "Tools" },
    { id: "workout", label: "Plans" },
    { id: "video", label: "Videos" },
  ] as const;

  return (
    <AppShell>
      <Container className="animate-page space-y-6 py-6 sm:py-8">
        <SectionHeading eyebrow="Your history" title="Saves" />

        {/* One tidy toolbar: segmented type control on the left, refinements on the right. */}
        <div className="sticky top-14 z-20 -mx-4 border-b border-hairline bg-background/85 px-4 py-3 backdrop-blur-xl sm:top-16 sm:mx-0 sm:rounded-2xl sm:border sm:px-3 md:static md:backdrop-blur-none">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div
              role="tablist"
              aria-label="Filter saves by type"
              className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-hairline bg-surface/60 p-1"
            >
              {KINDS.map((k) => {
                const active = kind === k.id;
                return (
                  <button
                    key={k.id}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => {
                      setKind(k.id);
                      if (k.id !== "tool") setSource("all");
                    }}
                    className={cn(
                      "pressable flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-200",
                      active
                        ? "bg-primary text-primary-foreground shadow-[var(--shadow-command)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {k.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums",
                        active ? "bg-primary-foreground/20" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {counts[k.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {kind === "tool" && (
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="h-9 min-w-0 flex-1 rounded-full border-hairline bg-surface/60 text-[0.8125rem] font-semibold md:w-44 md:flex-none">
                    <SelectValue placeholder="Every tool" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Every tool</SelectItem>
                    {tools.map((tool) => (
                      <SelectItem key={tool.id} value={tool.id}>
                        {tool.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="h-9 min-w-0 flex-1 rounded-full border-hairline bg-surface/60 text-[0.8125rem] font-semibold md:w-36 md:flex-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title={items.length ? "Nothing in this filter" : "No saves yet"}
            description={
              items.length
                ? "Try a wider date range or a different type."
                : "Finish a tool or save a workout session plan and it lands here."
            }
            action={
              <Link to="/tools" className={buttonStyles.primary}>
                <Wrench className="h-4 w-4" /> Open tools
              </Link>
            }
          />
        ) : (
          <div className="space-y-10">
            {grouped.map(([month, group]) => (
              <section key={month}>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-sm font-semibold tracking-tight">{month}</h2>
                  <span className="h-px flex-1 bg-hairline" />
                  <span className="text-xs tabular-nums text-muted-foreground">{group.length}</span>
                </div>
                <div className="stagger mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.map((item) => (
                    <SaveCard key={item.id} item={item} onOpen={setOpen} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="flex items-center gap-2 border-t border-hairline pt-4 text-xs text-muted-foreground">
          <ClipboardList className="h-3.5 w-3.5" />
          Saves sync across devices and stay tied to your account.
        </p>
      </Container>

      <SaveDetailDialog item={open} onClose={() => setOpen(null)} />
    </AppShell>
  );
}
