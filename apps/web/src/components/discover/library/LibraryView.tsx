"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ContinueWatching, LibraryIndexVideo } from "@ms/api";
import { Button, Chip, EmptyState, Glass, Icon, IconButton, useToast } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { Rail } from "@/components/today/Rail";
import { lessonHrefOf } from "@/lib/hrefs";
import type { LibraryPage } from "@/lib/loaders/discover";
import { toggleSaveVideo } from "@/lib/actions/discover";
import { ActiveChip, ChipBtn, LibraryHeader, ProgramChips, SearchField, SelectPill } from "./chips";
import { LibraryPlayer } from "./LibraryPlayer";
import { SearchSuggest, type Suggestion } from "./SearchSuggest";
import { useUrlState } from "./useUrlState";
import { VideoPoster } from "./VideoPoster";
import {
  EMPTY, LENGTHS, MOVE_INDEX, TYPES, activeFilters, cleanTitle, clock, figureFor, filterVideos, fromParams, levelsOf, movesOf, posterOf, primaryMove,
  terms, toQuery, topicsOf, typeOf, type LibState, type MoveKey,
} from "./model";
import "./library.css";

const PAGE = 48;

/**
 * Library: program names on top, filters that work across every program, then one grid of videos.
 * Everything is client-side over the loaded index (instant, no reload) and mirrored in the URL.
 */
export function LibraryView({ data, initial, initialPlaying, picks = [] }: { data: LibraryPage; initial: LibState; initialPlaying: string | null; picks?: string[] }) {
  const toast = useToast();
  const [s, setS] = useState<LibState>(initial);
  const [playing, setPlaying] = useState<string | null>(initialPlaying);
  const [resume, setResume] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState(PAGE);
  const [focus, setFocus] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const playerRef = useRef<HTMLElement>(null);

  const videos = data.index.videos;
  const names = useMemo(() => new Map(data.index.tags.map((t) => [t.key, t.name])), [data.index.tags]);
  const t = useMemo(() => terms(data.index), [data.index]);
  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);
  const current = playing ? byId.get(playing) ?? null : null;

  // Only programs that actually have library videos get a chip.
  const programs = useMemo(() => {
    const count = new Map<string, number>();
    for (const v of videos) for (const p of v.pr) count.set(p, (count.get(p) ?? 0) + 1);
    return data.index.programs.filter((p) => count.get(p.id)).map((p) => ({ ...p, n: count.get(p.id)! }));
  }, [videos, data.index.programs]);
  const program = programs.find((p) => p.slug === s.program) ?? null;
  const programId = program?.id ?? null;

  const results = useMemo(() => filterVideos(videos, s, names, programId, saved), [videos, s, names, programId, saved]);
  const moveCounts = useMemo(() => {
    const c = new Map<MoveKey, number>();
    for (const v of videos) for (const k of movesOf(v)) c.set(k, (c.get(k) ?? 0) + 1);
    return c;
  }, [videos]);
  const pickVideos = useMemo(() => picks.map((id) => byId.get(id)).filter((v): v is LibraryIndexVideo => !!v), [picks, byId]);
  const savedCount = videos.filter((v) => saved[v.id] ?? v.s).length;

  const set = useCallback((patch: Partial<LibState>) => {
    setS((x) => ({ ...x, ...patch }));
    setShown(PAGE);
  }, []);

  const query = toQuery(s, playing);
  useUrlState("/library", query, "q", (search) => {
    const sp = Object.fromEntries(new URLSearchParams(search));
    setS(fromParams(sp));
    setPlaying(sp.v && /^[0-9a-f-]{36}$/i.test(sp.v) ? sp.v : null);
    setShown(PAGE);
  });

  function play(id: string, at = 0) {
    setPlaying(id);
    if (at) setResume((r) => ({ ...r, [id]: at }));
    window.requestAnimationFrame(() => playerRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  }

  async function toggleSave(v: LibraryIndexVideo) {
    const next = !(saved[v.id] ?? v.s);
    setSaved((o) => ({ ...o, [v.id]: next }));
    const res = await toggleSaveVideo(v.id);
    if (!res.ok) {
      setSaved((o) => ({ ...o, [v.id]: !next }));
      toast(res.error);
      return;
    }
    setSaved((o) => ({ ...o, [v.id]: res.data }));
    toast(res.data ? "Saved" : "Removed from saved", { tone: res.data ? "success" : "neutral", icon: "bookmark" });
  }

  const name = (ns: string, slug: string) => names.get(`${ns}:${slug}`) ?? slug;
  const nFilters = activeFilters(s);
  const filtered = nFilters > 0 || s.q.trim() !== "" || s.program !== "all";
  const clearAll = () => set({ ...EMPTY });
  const programName = (v: LibraryIndexVideo) => {
    const id = programId && v.pr.includes(programId) ? programId : v.pr[0];
    return data.index.programs.find((p) => p.id === id)?.name ?? "Library";
  };

  const typeLabel = (k: string) => TYPES.find((x) => x.value === k)?.label;
  const moveOpts = MOVE_INDEX.filter((m) => moveCounts.get(m.key)).map((m) => ({ value: m.key, label: m.label }));
  const levelOpts = t.levels.map((l) => ({ value: l.slug, label: l.name }));
  const actives: { key: string; label: string; clear: () => void }[] = [
    ...(s.type !== "all" ? [{ key: "type", label: typeLabel(s.type) ?? s.type, clear: () => set({ type: "all" }) }] : []),
    ...(s.move !== "all" ? [{ key: "move", label: moveOpts.find((o) => o.value === s.move)?.label ?? s.move, clear: () => set({ move: "all" }) }] : []),
    ...(s.len !== "all" ? [{ key: "len", label: LENGTHS.find((o) => o.value === s.len)?.label ?? s.len, clear: () => set({ len: "all" }) }] : []),
    ...(s.level !== "all" ? [{ key: "level", label: levelOpts.find((o) => o.value === s.level)?.label ?? s.level, clear: () => set({ level: "all" }) }] : []),
    ...(s.saved ? [{ key: "saved", label: "Saved", clear: () => set({ saved: false }) }] : []),
    ...(s.q.trim() ? [{ key: "q", label: `“${s.q.trim()}”`, clear: () => set({ q: "" }) }] : []),
  ];
  const meta = (v: LibraryIndexVideo) => `${programName(v)} · ${TYPE_ONE[typeOf(v)]}`;
  const card = (v: LibraryIndexVideo, priority = false) => (
    <VideoCard v={v} meta={meta(v)} saved={saved[v.id] ?? v.s} active={playing === v.id} priority={priority} onPlay={() => play(v.id)} onSave={() => toggleSave(v)} />
  );
  // Before any filter or search: shelves (continue, picks, one per program). After: one uniform grid.
  const shelves = useMemo(
    () => programs.map((p) => ({ ...p, items: videos.filter((v) => v.pr.includes(p.id)).slice(0, 12) })),
    [programs, videos],
  );

  return (
    <div className="w1-lib l2">
      <LibraryHeader tab="videos">
        <SearchField
          value={s.q}
          onChange={(q) => set({ q })}
          inputRef={search}
          placeholder="Search moves, workouts or try “tgu”"
          label="Search the library"
          extra={{
            onFocus: () => setFocus(true),
            onBlur: () => window.setTimeout(() => setFocus(false), 120),
            "aria-autocomplete": "list",
            "aria-controls": "lib-suggest",
            "aria-expanded": focus,
          }}
          after={
            focus ? (
              <SearchSuggest
                id="lib-suggest"
                query={s.q}
                input={search}
                videos={videos}
                index={data.index}
                moveCounts={moveCounts}
                onPick={(x: Suggestion) => {
                  if (x.kind === "move") set({ move: x.key, q: "" });
                  else if (x.kind === "level") set({ level: x.key, q: "" });
                  else if (x.kind === "category" || x.kind === "tag") set({ q: x.label });
                  else if (x.kind === "query") set({ q: x.key });
                  else play(x.key);
                  setFocus(false);
                  search.current?.blur();
                }}
                onClose={() => {
                  setFocus(false);
                  search.current?.blur();
                }}
              />
            ) : null
          }
        />
      </LibraryHeader>

      <ProgramChips options={programs.map((p) => ({ key: p.slug, label: p.name, n: p.n }))} total={videos.length} value={s.program} onChange={(program) => set({ program })} />

      <div className="l2-toolbar">
        <p className="l2-count lq-t13 lq-c2 w1-clamp1" aria-live="polite">
          <strong className="lq-num">{results.length}</strong> {results.length === 1 ? "video" : "videos"}
          {program ? ` in ${program.name}` : ""}
        </p>
        <div className="l2-filters" role="group" aria-label="Filters">
          <SelectPill label="Type" value={s.type} onChange={(type) => set({ type })} all="Type" options={TYPES} />
          <SelectPill label="Movement or body area" value={s.move} onChange={(move) => set({ move })} all="Movement" options={moveOpts} />
          <SelectPill label="Length" value={s.len} onChange={(len) => set({ len })} all="Length" options={LENGTHS} />
          {levelOpts.length > 0 && <SelectPill label="Level" value={s.level} onChange={(level) => set({ level })} all="Level" options={levelOpts} />}
          <ChipBtn on={s.saved} icon="bookmark" onClick={() => set({ saved: !s.saved })}>
            Saved{savedCount ? <span className="lq-num l2-drop-n"> {savedCount}</span> : null}
          </ChipBtn>
        </div>
      </div>
      {(actives.length > 0 || program) && (
        <div className="l2-activerow" role="group" aria-label="Active filters">
          {program && <ActiveChip onRemove={() => set({ program: "all" })}>{program.name}</ActiveChip>}
          {actives.map((a) => (
            <ActiveChip key={a.key} onRemove={a.clear}>{a.label}</ActiveChip>
          ))}
          <button type="button" className="l2-clearall lq-t13" onClick={clearAll}>Clear all</button>
        </div>
      )}

      {/* inline player */}
      {current && (
        <section ref={playerRef} className="w1-lib-anchor" aria-label={`Now playing: ${cleanTitle(current.t)}`}>
          <Glass radius="card" className="w1-lib-player">
            <div className="w1-lib-stage">
              <LibraryPlayer
                key={current.id}
                id={current.id}
                providerId={current.p}
                hash={current.h}
                title={cleanTitle(current.t)}
                resumeAt={resume[current.id] ?? 0}
                poster={<VideoPoster {...posterOf(current)} move={figureFor(primaryMove(current))} seed={current.id} level={levelsOf(current)[0]} figure={150} sizes="(min-width: 1024px) 900px, 100vw" />}
              />
            </div>
            <div className="w1-lib-info">
              <div className="w1-lib-chips w1-lib-wrap">
                <Chip variant="tint">{programName(current)}</Chip>
                {levelsOf(current).map((l) => (
                  <Chip key={l} variant="fill">{name("level", l)}</Chip>
                ))}
                {current.d ? <Chip variant="fill"><span className="lq-num">{clock(current.d)}</span></Chip> : null}
              </div>
              <h2 className="lq-t22">{cleanTitle(current.t)}</h2>
              {topicsOf(current).length > 0 && (
                <p className="lq-t13 lq-c2">{topicsOf(current).map((g) => name("topic", g)).join(", ")}</p>
              )}
              <div className="w1-lib-actions">
                <Button variant="fill" size="md" href={`/library/${current.id}`} iconAfter="chevron">Details</Button>
                <IconButton
                  icon="bookmark"
                  label={(saved[current.id] ?? current.s) ? "Remove from saved" : "Save video"}
                  variant="glass"
                  aria-pressed={saved[current.id] ?? current.s}
                  onClick={() => toggleSave(current)}
                />
                <IconButton icon="close" label="Close player" variant="plain" onClick={() => setPlaying(null)} />
              </div>
            </div>
          </Glass>
        </section>
      )}

      {!filtered ? (
        <div className="l2-shelves">
          {data.continue.length > 0 && (
            <Shelf id="cw" title="Continue watching">
              {data.continue.map((c) => (
                <ContinueCard key={`${c.video_id}-${c.lesson_id ?? ""}`} c={c} inLibrary={byId.has(c.video_id)} onPlay={() => play(c.video_id, c.seconds)} />
              ))}
            </Shelf>
          )}
          {pickVideos.length > 0 && (
            <Shelf id="picks" title="Mike’s picks this month">
              {pickVideos.map((v) => <div key={v.id}>{card(v)}</div>)}
            </Shelf>
          )}
          {shelves.map((p, i) => (
            <Shelf key={p.id} id={`p-${p.slug}`} title={p.name} count={p.n} onSeeAll={() => set({ program: p.slug })}>
              {p.items.map((v, j) => <div key={v.id}>{card(v, i === 0 && j < 4 && pickVideos.length === 0)}</div>)}
            </Shelf>
          ))}
        </div>
      ) : results.length === 0 ? (
        s.saved && savedCount === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            body="Tap the bookmark on any video and it will show up here."
            illustration={<EmptyScene scene="nothing-saved" size={150} />}
            action={<Button variant="glass" size="md" onClick={() => set({ saved: false })}>Browse all videos</Button>}
          />
        ) : (
          <EmptyState
            title={s.q.trim() ? `No videos match “${s.q.trim()}”` : "No videos match those filters"}
            body="Try another program, drop a filter, or clear everything."
            icon="search"
            action={<Button variant="glass" size="md" onClick={clearAll}>Clear all</Button>}
          />
        )
      ) : (
        <>
          <ul className="l2-grid" aria-label="Videos">
            {results.slice(0, shown).map((v, i) => (
              <li key={v.id}>{card(v, i < 4)}</li>
            ))}
          </ul>
          {results.length > shown && (
            <div className="w1-lib-more">
              <Button variant="glass" size="md" onClick={() => setShown((n) => n + PAGE)}>
                Show <span className="lq-num">{Math.min(PAGE, results.length - shown)}</span> more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const TYPE_ONE: Record<string, string> = { technique: "Technique", workout: "Workout", warmup: "Warm-up", mobility: "Mobility" };

function Shelf({ id, title, count, onSeeAll, children }: { id: string; title: string; count?: number; onSeeAll?: () => void; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`sh-${id}`} className="l2-shelf">
      <div className="l2-shelf-head">
        <h2 id={`sh-${id}`} className="lq-t20 l2-shelf-title">
          {title}
          {count !== undefined && <span className="lq-t13 lq-c2 lq-num l2-shelf-n">{count}</span>}
        </h2>
        {onSeeAll && (
          <button type="button" className="l2-seeall lq-t13" onClick={onSeeAll} aria-label={`See all ${title}`}>
            See all <Icon name="chevron" size="xs" />
          </button>
        )}
      </div>
      <Rail label={title} item="17rem">{children}</Rail>
    </section>
  );
}

/** One card for every video: 16:9 thumbnail with duration, two-line title, program + type, save. Fixed heights, no empty space. */
function VideoCard({
  v, meta, saved, active, priority, onPlay, onSave,
}: {
  v: LibraryIndexVideo;
  meta: string;
  saved: boolean;
  active: boolean;
  priority: boolean;
  onPlay: () => void;
  onSave: () => void;
}) {
  const title = cleanTitle(v.t);
  return (
    <article className="l2-card" data-active={active ? "" : undefined}>
      <button type="button" className="l2-card-btn" onClick={onPlay} aria-label={`Play ${title}`}>
        <span className="l2-thumb">
          <VideoPoster {...posterOf(v)} move={figureFor(primaryMove(v))} seed={v.id} level={levelsOf(v)[0]} figure={84} sizes="(min-width: 1280px) 20vw, (min-width: 760px) 30vw, 70vw" priority={priority} />
          {v.d ? <span className="l2-dur lq-t11 lq-num">{clock(v.d)}</span> : null}
          <span className="l2-playglyph" aria-hidden><Icon name="play" size="sm" /></span>
        </span>
        <span className="l2-card-title lq-t15 w1-clamp2">{title}</span>
        <span className="l2-card-meta lq-t12 lq-c2 w1-clamp1">{meta}</span>
      </button>
      <button
        type="button"
        className="l2-save"
        data-on={saved ? "" : undefined}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${title} from saves` : `Save ${title}`}
        onClick={onSave}
      >
        <Icon name="bookmark" size="xs" />
      </button>
    </article>
  );
}

function ContinueCard({ c, inLibrary, onPlay }: { c: ContinueWatching; inLibrary: boolean; onPlay: () => void }) {
  const left = c.duration_seconds ? Math.max(0, c.duration_seconds - c.seconds) : null;
  const pct = c.duration_seconds ? Math.min(1, c.seconds / c.duration_seconds) : null;
  const title = cleanTitle(c.title);
  const body = (
    <>
      <span className="l2-thumb">
        <VideoPoster
          {...posterOf({ th: c.thumbnail_url, ct: c.cover_has_text, g: [], t: c.title, id: c.video_id })}
          move={figureFor(primaryMove({ g: [], t: c.title }))}
          seed={c.video_id}
          figure={84}
          sizes="272px"
        />
        <span className="l2-playglyph" data-show aria-hidden><Icon name="play" size="sm" /></span>
        {pct !== null && (
          <span className="l2-bar" aria-hidden>
            <span style={{ width: `${pct * 100}%` }} />
          </span>
        )}
      </span>
      <span className="l2-card-title lq-t15 w1-clamp2">{title}</span>
      <span className="l2-card-meta lq-t12 lq-c2 w1-clamp1">
        {c.program_name ? `${c.program_name} · ` : ""}
        {left !== null ? `${clock(left)} left` : `Stopped at ${clock(c.seconds)}`}
      </span>
    </>
  );
  const inner = c.lesson_id && c.program_slug ? (
    <Link href={lessonHrefOf(c.program_slug, c.lesson_id)} className="l2-card-btn" aria-label={`Resume ${title} in ${c.program_name}`}>{body}</Link>
  ) : !inLibrary ? (
    <Link href={`/library/${c.video_id}`} className="l2-card-btn" aria-label={`Resume ${title}`}>{body}</Link>
  ) : (
    <button type="button" className="l2-card-btn" onClick={onPlay} aria-label={`Resume ${title}`}>{body}</button>
  );
  return <article className="l2-card">{inner}</article>;
}
