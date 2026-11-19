import { Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, PlayCircle, Wrench } from "lucide-react";
import { formatSaveDate, type SaveItem } from "@/lib/use-saves";
import { cn } from "@/lib/utils";

export function SaveCard({
  item,
  className,
  onOpen,
  compact,
}: {
  item: SaveItem;
  className?: string;
  onOpen?: (item: SaveItem) => void;
  compact?: boolean;
}) {
  const Icon = item.kind === "tool" ? Wrench : item.kind === "video" ? PlayCircle : ClipboardList;
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
            item.kind === "tool" ? "bg-primary/15 text-primary" : "bg-secondary text-foreground",
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="eyebrow text-[0.5625rem] text-muted-foreground">{formatSaveDate(item.createdAt)}</span>
      </div>
      <p className="mt-4 truncate text-base font-semibold text-foreground">{item.title}</p>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.subtitle}</p>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {item.meta.map((m) => (
          <span key={m} className="rounded-full border border-hairline px-2.5 py-1 text-xs text-muted-foreground">
            {m}
          </span>
        ))}
      </div>
      {(onOpen || item.href) && (
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {onOpen ? "View result" : "Open"}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      )}
    </>
  );

  const compactInner = (
    <>
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          item.kind === "tool" ? "bg-primary/15 text-primary" : "bg-secondary text-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {item.subtitle} · {formatSaveDate(item.createdAt)}
        </span>
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </>
  );

  const base = compact
    ? cn("steel-card flex w-full items-center gap-3 rounded-2xl px-3.5 py-3", className)
    : cn("steel-card flex h-full flex-col rounded-3xl p-5", className);
  const body = compact ? compactInner : inner;

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={cn(base, "pressable text-left transition-colors duration-200 hover:border-primary/40")}
      >
        {body}
      </button>
    );
  }

  if (!item.href) return <div className={base}>{body}</div>;
  return (
    <Link
      to={item.href.to}
      params={item.href.params as never}
      className={cn(base, "pressable transition-colors duration-200 hover:border-primary/40")}
    >
      {body}
    </Link>
  );
}
