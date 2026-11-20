"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import type { LibraryIndex, LibraryIndexVideo } from "@ms/api";
import { Icon, type IconName } from "@/components/ui";
import { MovementFigure } from "@/components/graphics";
import { MOVE_INDEX, cleanTitle, clock, figureFor, movesOf, primaryMove, tokenMatches, type MoveKey } from "./model";

export type Suggestion =
  | { kind: "move"; key: MoveKey; label: string }
  | { kind: "level" | "category" | "tag"; key: string; label: string }
  | { kind: "video"; key: string; label: string; meta: string; v: LibraryIndexVideo }
  | { kind: "query"; key: string; label: string };

const TRY = ["swing", "tgu", "mobility", "on ramp", "press"];

/**
 * Smart search: as the member types, offers movements, levels, categories and tags to filter by, and
 * the best-matching videos to play. Understands shorthand (tgu, rdl, kb) and plural forms.
 * Keyboard: ↑/↓ to move, Enter to pick, Esc to close.
 */
export function SearchSuggest({
  id, query, input, videos, index, moveCounts, onPick, onClose,
}: {
  id: string;
  query: string;
  input: RefObject<HTMLInputElement | null>;
  videos: LibraryIndexVideo[];
  index: LibraryIndex;
  moveCounts: Map<MoveKey, number>;
  onPick: (s: Suggestion) => void;
  onClose: () => void;
}) {
  const q = query.trim().toLowerCase();
  const [active, setActive] = useState(0);

  const items = useMemo<Suggestion[]>(() => {
    if (!q) return TRY.map((t) => ({ kind: "query" as const, key: t, label: t }));
    const tokens = q.split(/\s+/).filter(Boolean);
    const hit = (text: string) => tokens.every((t) => tokenMatches(text.toLowerCase().replace(/[–—-]/g, " "), t));
    const moves = MOVE_INDEX.filter((m) => moveCounts.get(m.key) && (hit(`${m.label} ${m.key} ${m.hint}`))).slice(0, 3)
      .map((m) => ({ kind: "move" as const, key: m.key, label: m.label }));
    const terms = index.tags
      .filter((t) => t.ns === "level" || t.ns === "category" || t.ns === "topic")
      .filter((t) => hit(t.name))
      .filter((t, i, a) => a.findIndex((x) => x.name === t.name) === i)
      .slice(0, 3)
      .map((t) => ({ kind: (t.ns === "topic" ? "tag" : t.ns) as "level" | "category" | "tag", key: t.slug, label: t.name }));
    const names = new Map(index.tags.map((t) => [t.key, t.name]));
    const vids = videos
      .flatMap((v) => {
        const title = cleanTitle(v.t).toLowerCase();
        const hay = `${title} ${v.g.map((k) => names.get(k) ?? k).join(" ")} ${movesOf(v).join(" ")}`.replace(/[–—-]/g, " ");
        if (!tokens.every((t) => tokenMatches(hay, t))) return [];
        // titles that start with or contain the query rank first
        const score = (title.startsWith(q) ? 3 : 0) + (title.includes(q) ? 2 : 0) + (v.ip ? 1 : 0);
        return [{ v, score }];
      })
      .sort((a, b) => b.score - a.score || a.v.o - b.v.o)
      .slice(0, 5)
      .map(({ v }) => ({
        kind: "video" as const,
        key: v.id,
        label: cleanTitle(v.t),
        meta: [v.g.filter((g) => g.startsWith("level:")).map((g) => names.get(g)).filter(Boolean)[0], clock(v.d)].filter(Boolean).join(" · "),
        v,
      }));
    return [...moves, ...terms, ...vids];
  }, [q, index.tags, videos, moveCounts]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(items.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        const it = items[active];
        if (it && (q === "" || it.kind !== "query")) {
          e.preventDefault();
          onPick(it);
        } else onClose();
      } else if (e.key === "Escape") onClose();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [input, items, active, q, onPick, onClose]);

  if (!items.length) {
    return (
      <div id={id} className="w1-sg" role="listbox" aria-label="Suggestions">
        <p className="lq-t13 lq-c2 w1-sg-none">No matches for “{query.trim()}”. Try a movement like swing or press.</p>
      </div>
    );
  }

  const ICON: Record<string, IconName> = { level: "mountain", category: "grid", tag: "bookmark", query: "search" };
  const group = (k: Suggestion["kind"]) => (k === "move" ? "Movements" : k === "video" ? "Videos" : k === "query" ? "" : "Filters");
  return (
    <div id={id} className="w1-sg" role="listbox" aria-label="Suggestions" onMouseDown={(e) => e.preventDefault()}>
      {!q && <p className="w1-sg-head">Try</p>}
      {items.map((it, i) => {
        const head = q && (i === 0 || group(items[i - 1]!.kind) !== group(it.kind)) ? group(it.kind) : null;
        return (
          <div key={`${it.kind}:${it.key}`}>
            {head && <p className="w1-sg-head">{head}</p>}
            <button
              type="button"
              role="option"
              aria-selected={i === active}
              className="w1-sg-row"
              data-on={i === active ? "" : undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(it)}
            >
              <span className="w1-sg-ic" aria-hidden>
                {it.kind === "move" ? (
                  <MovementFigure move={figureFor(it.key)} size={30} />
                ) : it.kind === "video" ? (
                  <MovementFigure move={figureFor(primaryMove(it.v))} size={30} />
                ) : (
                  <Icon name={ICON[it.kind] ?? "search"} size="xs" />
                )}
              </span>
              <span className="w1-sg-text">
                <span className="lq-t15 w1-clamp1">{it.label}</span>
                <span className="lq-t12 lq-c2">
                  {it.kind === "move"
                    ? `Movement · ${moveCounts.get(it.key) ?? 0} videos`
                    : it.kind === "video"
                      ? it.meta || "Play"
                      : it.kind === "query"
                        ? "Search"
                        : it.kind === "level"
                          ? "Level"
                          : it.kind === "category"
                            ? "Category"
                            : "Tag"}
                </span>
              </span>
              <span className="w1-sg-go lq-t12" aria-hidden>{it.kind === "video" ? <Icon name="play" size="xs" /> : <Icon name="arrowRight" size="xs" />}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
