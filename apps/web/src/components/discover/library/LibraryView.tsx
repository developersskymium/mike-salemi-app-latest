"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ContinueWatching, LibraryIndexVideo } from "@ms/api";
import { Button, Chip, EmptyState, Glass, Icon, IconButton, useToast } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { Rail } from "@/components/today/Rail";
import type { LibraryPage } from "@/lib/loaders/discover";
import { toggleSaveVideo } from "@/lib/actions/discover";
import { ChipBtn, ProgramChips, SelectPill } from "./chips";
import { LibraryPlayer } from "./LibraryPlayer";
import { SearchSuggest, type Suggestion } from "./SearchSuggest";
import { useUrlState } from "./useUrlState";
import { VideoPoster } from "./VideoPoster";
import {
  EMPTY, LENGTHS, MOVE_INDEX, TYPES, activeFilters, catsOf, cleanTitle, clock, figureFor, filterVideos, fromParams, levelsOf, movesOf, posterOf, primaryMove,
  terms, toQuery, topicsOf, type LibState, type MoveKey,
} from "./model";
import "./library.css";

const PAGE = 48;

/**
 * Library: program names on top, filters that work across every program, then one grid of videos.
 * Everything is client-side over the loaded index (instant, no reload) and mirrored in the URL.
 */
export function LibraryView({ data, initial, initialPlaying }: { data: LibraryPage; initial: LibState; initialPlaying: string | null }) {
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

  return (
    <div className="w1-lib">
      <header className="w1-lib-head">
        <h1 className="lq-d-sm w1-lib-h1">Library</h1>
        <Link href="/library/lessons" className="w1-lib-alllink lq-t15">
          All lessons <Icon name="chevron" size="xs" />
        </Link>
      </header>

      <ProgramChips options={programs.map((p) => ({ key: p.slug, label: p.name }))} value={s.program} onChange={(program) => set({ program })} />

      <div className="w1-lib-tools">
        <div className="w1-lib-searchwrap">
          <label className="w1-lib-search">
            <Icon name="search" size="sm" className="lq-c2" />
            <input
              ref={search}
              type="search"
              value={s.q}
              onChange={(e) => set({ q: e.target.value })}
              onFocus={() => setFocus(true)}
              onBlur={() => window.setTimeout(() => setFocus(false), 120)}
              placeholder="Search moves or try “tgu”"
              aria-label="Search the library"
              aria-autocomplete="list"
              aria-controls="lib-suggest"
              aria-expanded={focus}
              enterKeyHint="search"
              className="lq-t15"
            />
            {s.q && <IconButton icon="close" label="Clear search" variant="plain" size="sm" iconSize="xs" onClick={() => set({ q: "" })} />}
          </label>
          {focus && (
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
          )}
        </div>
        <div className="w1-lib-filters" role="group" aria-label="Filters">
          <SelectPill label="Type" value={s.type} onChange={(type) => set({ type })} all="Any type" options={TYPES} />
          <SelectPill label="Movement or body area" value={s.move} onChange={(move) => set({ move })} all="Any movement" options={MOVE_INDEX.filter((m) => moveCounts.get(m.key)).map((m) => ({ value: m.key, label: m.label }))} />
          <SelectPill label="Length" value={s.len} onChange={(len) => set({ len })} all="Any length" options={LENGTHS} />
          {t.levels.length > 0 && <SelectPill label="Level" value={s.level} onChange={(level) => set({ level })} all="Any level" options={t.levels.map((l) => ({ value: l.slug, label: l.name }))} />}
          <ChipBtn on={s.saved} icon="bookmark" onClick={() => set({ saved: !s.saved })}>
            Saved{savedCount ? ` (${savedCount})` : ""}
          </ChipBtn>
        </div>
      </div>

      {/* continue watching */}
      {!filtered && data.continue.length > 0 && !playing && (
        <section aria-labelledby="cw-t" className="w1-lib-cw">
          <div className="w1-lib-sech">
            <h2 id="cw-t" className="lq-t20">Continue watching</h2>
          </div>
          <Rail label="Continue watching" item="16rem">
            {data.continue.map((c) => (
              <ContinueCard key={`${c.video_id}-${c.lesson_id ?? ""}`} c={c} inLibrary={byId.has(c.video_id)} onPlay={() => play(c.video_id, c.seconds)} />
            ))}
          </Rail>
        </section>
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
              {topicsOf(current).length > 0 && catsOf(current).length >= 0 && (
                <p className="lq-t13 lq-c2">{topicsOf(current).map((g) => name("topic", g)).join(" · ")}</p>
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

      <div className="w1-lib-results">
        <p className="lq-t13 lq-c2 w1-clamp1" aria-live="polite">
          <strong className="lq-num w1-lib-n">{results.length}</strong> {results.length === 1 ? "video" : "videos"}
          {program ? ` in ${program.name}` : ""}
          {s.q.trim() ? ` matching “${s.q.trim()}”` : ""}
        </p>
        {filtered && (
          <button type="button" className="w1-lib-clear lq-t13" onClick={clearAll}>
            <Icon name="close" size="xs" /> Clear
          </button>
        )}
      </div>

      {results.length === 0 ? (
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
            action={<Button variant="glass" size="md" onClick={clearAll}>Clear filters</Button>}
          />
        )
      ) : (
        <>
          <ul className="w1-lib-grid" aria-label="Videos">
            {results.slice(0, shown).map((v, i) => (
              <li key={v.id}>
                <PortraitCard v={v} eyebrow={programName(v)} saved={saved[v.id] ?? v.s} active={playing === v.id} priority={i < 4} onPlay={() => play(v.id)} onSave={() => toggleSave(v)} />
              </li>
            ))}
          </ul>
          {results.length > shown && (
            <div className="w1-lib-more">
              <Button variant="glass" size="md" onClick={() => setShown((n) => n + PAGE)}>
                Show more · <span className="lq-num">{results.length - shown}</span> left
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PortraitCard({
  v, eyebrow, saved, active, priority, onPlay, onSave,
}: {
  v: LibraryIndexVideo;
  eyebrow: string;
  saved: boolean;
  active: boolean;
  priority: boolean;
  onPlay: () => void;
  onSave: () => void;
}) {
  const level = levelsOf(v)[0];
  const title = cleanTitle(v.t);
  return (
    <article className="w1-lib-card" data-active={active ? "" : undefined}>
      <button type="button" className="w1-lib-cardbtn lq-press" onClick={onPlay} aria-label={`Play ${title}`}>
        <span className="w1-lib-poster">
          <VideoPoster
            {...posterOf(v)}
            move={figureFor(primaryMove(v))}
            seed={v.id}
            level={level}
            sizes="(min-width: 1280px) 22vw, (min-width: 760px) 30vw, 46vw"
            priority={priority}
          />
          {v.d ? <span className="w1-lib-dur lq-t11 lq-num">{clock(v.d)}</span> : null}
          <span className="w1-lib-playglyph" aria-hidden><Icon name="play" size="sm" /></span>
        </span>
        <span className="w1-lib-text">
          <span className="w1-lib-eyebrow w1-clamp1">{eyebrow}</span>
          <span className="lq-t15 w1-clamp2 w1-lib-title">{title}</span>
        </span>
      </button>
      <IconButton
        icon="bookmark"
        label={saved ? `Remove ${title} from saves` : `Save ${title}`}
        variant="clear"
        size="sm"
        iconSize="sm"
        className="w1-lib-save"
        data-on={saved ? "" : undefined}
        aria-pressed={saved}
        onClick={onSave}
      />
    </article>
  );
}

function ContinueCard({ c, inLibrary, onPlay }: { c: ContinueWatching; inLibrary: boolean; onPlay: () => void }) {
  const left = c.duration_seconds ? Math.max(0, c.duration_seconds - c.seconds) : null;
  const pct = c.duration_seconds ? Math.min(1, c.seconds / c.duration_seconds) : null;
  const title = cleanTitle(c.title);
  const body = (
    <Glass radius="card" interactive className="w1-cw-card lq-lift">
      <span className="w1-cw-poster">
        <VideoPoster
          {...posterOf({ th: c.thumbnail_url, ct: c.cover_has_text, g: [], t: c.title, id: c.video_id })}
          move={figureFor(primaryMove({ g: [], t: c.title }))}
          seed={c.video_id}
          figure={84}
          sizes="256px"
        />
        <span className="w1-cw-play" aria-hidden><Icon name="play" size="sm" /></span>
        {pct !== null && (
          <span className="w1-cw-bar" aria-hidden>
            <span style={{ width: `${pct * 100}%` }} />
          </span>
        )}
      </span>
      <span className="w1-cw-text">
        <span className="lq-t15 w1-clamp1">{title}</span>
        <span className="lq-t12 lq-c2 w1-clamp1">
          {c.program_name ? `${c.program_name} · ` : ""}
          {left !== null ? `${clock(left)} left` : `Stopped at ${clock(c.seconds)}`}
        </span>
      </span>
    </Glass>
  );
  if (c.lesson_id && c.program_slug) {
    return (
      <Link href={`/programs/${c.program_slug}/learn/${c.lesson_id}`} className="w1-cardlink" aria-label={`Resume ${title} in ${c.program_name}`}>
        {body}
      </Link>
    );
  }
  if (!inLibrary) {
    return (
      <Link href={`/library/${c.video_id}`} className="w1-cardlink" aria-label={`Resume ${title}`}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className="w1-cardlink w1-cw-btn" onClick={onPlay} aria-label={`Resume ${title}`}>
      {body}
    </button>
  );
}

