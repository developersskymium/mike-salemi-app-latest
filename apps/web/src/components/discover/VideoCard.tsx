import Link from "next/link";
import type { LibraryVideo } from "@ms/api";
import { Glass, Icon, Poster } from "@/components/ui";
import type { MoveName } from "@/components/graphics";
import { MovementCover } from "./library/MovementCover";
import { coverOf } from "./library/model";
import "./discover.css";
import "./library/library.css";

export function phaseOf(v: Pick<LibraryVideo, "tags" | "category">) {
  const cats = v.tags.filter((t) => t.namespace === "category");
  if (cats.length > 1) return `${cats[0]!.name} – ${cats.at(-1)!.name}`;
  return cats[0]?.name ?? null;
}

export function topicsOf(v: Pick<LibraryVideo, "tags">) {
  return v.tags.filter((t) => t.namespace === "topic" && t.slug !== "kettlebell-exercises" && t.slug !== "bodyweight-exercises");
}

export function duration(s: number | null) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Glass video card: poster, title, phase and movement. The bookmark overlay is passed in by interactive parents. */
export function VideoCard({ video: v, overlay, priority, compact }: { video: LibraryVideo; overlay?: React.ReactNode; priority?: boolean; compact?: boolean }) {
  const phase = phaseOf(v);
  const topic = topicsOf(v)[0]?.name;
  const dur = duration(v.duration_seconds);
  return (
    <Glass radius="card" interactive className="dsc-vc lq-lift" data-compact={compact ? "" : undefined}>
      <Link href={`/library/${v.id}`} className="dsc-vc-link" aria-label={v.title} />
      {coverOf(v.thumbnail_url) ? (
        <Poster aspect="16 / 9" className="dsc-vc-poster" image={{ src: coverOf(v.thumbnail_url)!, alt: "", sizes: "(min-width: 1024px) 320px, 92vw", priority }}>
          {dur && <span className="lq-chip lq-glass dsc-vc-dur lq-num" data-level="clear">{dur}</span>}
          {overlay}
        </Poster>
      ) : (
        <div className="dsc-vc-poster dsc-vc-art">
          <MovementCover move={moveFor(v)} seed={v.id} level={v.tags.find((t) => t.namespace === "level")?.slug} size={96} />
          {dur && <span className="lq-chip lq-glass dsc-vc-dur lq-num" data-level="clear">{dur}</span>}
          <div className="lq-over">{overlay}</div>
        </div>
      )}
      <div className="dsc-vc-text">
        <div className="lq-t15 dsc-vc-title dsc-clamp2">{v.title}</div>
        <div className="lq-t12 lq-c2 dsc-vc-meta">
          {[phase, topic].filter(Boolean).join(" · ")}
          {v.saved && <Icon name="bookmark" size="xs" label="Saved" className="dsc-vc-saved" />}
        </div>
      </div>
    </Glass>
  );
}

const TOPIC_MOVE: Record<string, MoveName> = {
  swing: "swing", clean: "clean", press: "press", "push-press": "press", "turkish-get-up": "getup", squat: "squat", lunge: "lunge",
  row: "row", deadlift: "deadlift", halo: "halo", windmill: "getup", stretching: "breathing", "working-in": "breathing", "bodyweight-warm-ups": "walking",
};

/** Movement pictogram for videos without a poster frame. */
export function moveFor(v: Pick<LibraryVideo, "tags">): MoveName {
  for (const t of v.tags) if (TOPIC_MOVE[t.slug]) return TOPIC_MOVE[t.slug]!;
  return "swing";
}
