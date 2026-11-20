"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ContinueWatching, LibraryIndexVideo } from "@ms/api";
import { Button, Chip, EmptyState, Glass, Icon, IconButton, Segmented, useToast } from "@/components/ui";
import { EmptyScene, MovementFigure } from "@/components/graphics";
import { Rail } from "@/components/today/Rail";
import type { LibraryPage } from "@/lib/loaders/discover";
import { toggleSaveVideo } from "@/lib/actions/discover";
import { LibraryPlayer } from "./LibraryPlayer";
import { SearchSuggest, type Suggestion } from "./SearchSuggest";
import { VideoPoster } from "./VideoPoster";
import {
  EMPTY, MOVE_INDEX, SORTS, SOURCES, VIEWS_KEY, categoriesFor, catsOf, cleanTitle, clock, figureFor, posterOf, filterSort, levelsOf, movesOf, primaryMove,
  tagsFor, terms, toQuery, topicsOf, type LibState, type MoveKey, type SavedView, type Sort, type Source,
} from "./model";
import "./library.css";

const PAGE = 60;
const SHORT: Record<Source, string> = { all: "Everything", videos: "Technique", programs: "Lessons" };
const NARROW = "(max-width: 520px)";
const subscribeNarrow = (cb: () => void) => {
  const m = window.matchMedia(NARROW);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** Library, legacy layout: sticky compact toolbar + inline filter drawer, source tabs, inline player, results + sort, portrait grid, lessons. */
export function LibraryView({ data, initial, initialPlaying }: { data: LibraryPage; initial: LibState; initialPlaying: string | null }) {
  const toast = useToast();
  const [raw, setS] = useState<LibState>(initial);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(initialPlaying);
  const [resume, setResume] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState(PAGE);
  const [views, setViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);
  const playerRef = useRef<HTMLElement>(null);

  const videos = data.index.videos;
  const names = useMemo(() => new Map(data.index.tags.map((t) => [t.key, t.name])), [data.index.tags]);
  const t = useMemo(() => terms(data.index), [data.index]);
  // Lower tiers stay valid when a higher tier changes (legacy cascade): derived, not stored.
  const categories = useMemo(() => categoriesFor(videos, t.categories, raw.level), [videos, t.categories, raw.level]);
  const validCats = useMemo(() => raw.cats.filter((c) => categories.some((o) => o.slug === c)), [raw.cats, categories]);
  const tagOptions = useMemo(() => tagsFor(videos, t.topics, raw.level, validCats), [videos, t.topics, raw.level, validCats]);
  const s = useMemo<LibState>(() => ({ ...raw, cats: validCats, tags: raw.tags.filter((g) => tagOptions.some((o) => o.slug === g)) }), [raw, validCats, tagOptions]);
  const results = useMemo(() => filterSort(videos, s, names, saved), [videos, s, names, saved]);
  const savedCount = videos.filter((v) => saved[v.id] ?? v.s).length;
  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);
  const current = playing ? byId.get(playing) ?? null : null;
  const moveCounts = useMemo(() => {
    const c = new Map<MoveKey, number>();
    for (const v of videos) for (const k of movesOf(v)) c.set(k, (c.get(k) ?? 0) + 1);
    return c;
  }, [videos]);
  const [focus, setFocus] = useState(false);

  const set = useCallback((patch: Partial<LibState>) => {
    setS((x) => ({ ...x, ...patch }));
    setShown(PAGE);
  }, []);

  // URL mirrors the view (shareable, back button), without a server round trip.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const q = toQuery(s, playing);
      const next = `/library${q ? `?${q}` : ""}`;
      if (next !== window.location.pathname + window.location.search) window.history.replaceState(window.history.state, "", next);
    }, 250);
    return () => window.clearTimeout(t);
  }, [s, playing]);

  // "/" focuses search; Esc closes the player.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        search.current?.focus();
      }
      if (e.key === "Escape" && playing && tag !== "INPUT") setPlaying(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  const [viewsLoaded, setViewsLoaded] = useState(false);
  function toggleDrawer() {
    if (!viewsLoaded) {
      setViewsLoaded(true);
      try {
        const stored = window.localStorage.getItem(VIEWS_KEY);
        if (stored) setViews(JSON.parse(stored) as SavedView[]);
      } catch {
        /* storage unavailable */
      }
    }
    setOpen((o) => !o);
  }
  const storeViews = (next: SavedView[]) => {
    setViews(next);
    try {
      window.localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    } catch {
      /* the view still applies for this visit */
    }
  };

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

  const toggleIn = (key: "cats" | "tags", slug: string) => set({ [key]: s[key].includes(slug) ? s[key].filter((x) => x !== slug) : [...s[key], slug] } as Partial<LibState>);
  const name = (ns: string, slug: string) => names.get(`${ns}:${slug}`) ?? slug;

  const active: { label: string; clear: () => void }[] = [
    ...(s.saved ? [{ label: "Saved", clear: () => set({ saved: false }) }] : []),
    ...(s.inProgram ? [{ label: "In the program", clear: () => set({ inProgram: false }) }] : []),
    ...(s.move !== "all" ? [{ label: MOVE_INDEX.find((m) => m.key === s.move)?.label ?? s.move, clear: () => set({ move: "all" }) }] : []),
    ...(s.level !== "all" ? [{ label: name("level", s.level), clear: () => set({ level: "all" }) }] : []),
    ...s.cats.map((c) => ({ label: name("category", c), clear: () => toggleIn("cats", c) })),
    ...s.tags.map((g) => ({ label: `#${name("topic", g)}`, clear: () => toggleIn("tags", g) })),
  ];
  const filtered = active.length > 0 || s.q.trim() !== "" || s.sort !== "program";
  const clearAll = () => set({ ...EMPTY, source: s.source });
  const pool = s.source === "videos" ? videos.filter((v) => v.g.length > 0).length : videos.length;

  const inProgramCount = videos.filter((v) => v.ip).length;
  const moveCount = MOVE_INDEX.filter((m) => moveCounts.get(m.key)).length;

  return (
    <div className="w1-lib">
      {/* ------------------------------------------------ photo hero: Mike leads (hidden while searching or playing) */}
      {!filtered && !playing && (
        <section className="w1-lib-hero" aria-labelledby="lib-hero-t">
          <Image src="/media/summit/mike-windmill.jpg" alt="Mike Salemi in a kettlebell windmill" fill priority sizes="(min-width: 1024px) 1100px, 100vw" className="w1-lib-hero-img" />
          <div className="w1-lib-hero-copy">
            <p className="w1-lib-hero-eyebrow">The Library · filmed by Mike</p>
            <h2 id="lib-hero-t" className="w1-lib-hero-t">Every move Mike teaches, in one place.</h2>
            <p className="w1-lib-hero-p">Pick a movement, search a cue like &ldquo;tgu&rdquo; or &ldquo;hinge&rdquo;, or pick up where you stopped.</p>
            <dl className="w1-lib-hero-stats">
              <div><dt>Videos</dt><dd className="lq-num">{videos.length}</dd></div>
              <div><dt>Movements</dt><dd className="lq-num">{moveCount}</dd></div>
              <div><dt>In your program</dt><dd className="lq-num">{inProgramCount}</dd></div>
            </dl>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ sticky compact toolbar + inline drawer */}
      <Glass className="w1-lib-bar" radius="card">
        <div className="w1-lib-barrow">
          <h1 className="lq-t20 w1-lib-h1">Library</h1>
          <span className="lq-t13 lq-c2 lq-num w1-lib-count" aria-live="polite">
            {s.source === "programs" ? "" : `${results.length}/${pool}`}
          </span>
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
                placeholder="Search moves, levels or try “tgu”"
                aria-label="Search the library"
                aria-autocomplete="list"
                aria-controls="lib-suggest"
                aria-expanded={focus}
                enterKeyHint="search"
                className="lq-t15"
              />
              {s.q && <IconButton icon="close" label="Clear search" variant="plain" size="sm" iconSize="xs" onClick={() => set({ q: "" })} />}
              <kbd className="w1-lib-kbd lq-t11" aria-hidden>/</kbd>
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
                  else if (x.kind === "category") set({ cats: [x.key], q: "" });
                  else if (x.kind === "tag") set({ tags: [x.key], q: "" });
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
          <button type="button" className="w1-lib-filters lq-press" aria-expanded={open} aria-controls="lib-drawer" onClick={toggleDrawer} data-on={active.length ? "" : undefined}>
            <Icon name="filter" size="sm" />
            <span className="lq-t13">Filters</span>
            {active.length > 0 && <span className="w1-lib-badge lq-num">{active.length}</span>}
            <Icon name="down" size="xs" className="w1-lib-chev" />
          </button>
        </div>

        <div id="lib-drawer" className="w1-lib-drawer" data-open={open ? "" : undefined} aria-hidden={!open}>
          <div className="w1-lib-drawer-in" inert={!open}>
            <div className="w1-lib-group">
              <p className="w1-lib-label">Saved views</p>
              <div className="w1-lib-chips w1-lib-wrap">
                {views.length === 0 && <span className="lq-t12 lq-c2">Set your filters, name them below, and they&apos;ll be one tap away.</span>}
                {views.map((v) => (
                  <span key={v.id} className="w1-lib-view">
                    <button type="button" className="lq-t13" onClick={() => set(v.state)}>{v.name}</button>
                    <button type="button" aria-label={`Delete saved view ${v.name}`} onClick={() => storeViews(views.filter((x) => x.id !== v.id))}>
                      <Icon name="close" size="xs" />
                    </button>
                  </span>
                ))}
              </div>
              <form
                className="w1-lib-viewform"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!viewName.trim()) return;
                  storeViews([...views, { id: `${Date.now()}`, name: viewName.trim().slice(0, 40), state: s }]);
                  setViewName("");
                  toast("View saved", { tone: "success", icon: "bookmark" });
                }}
              >
                <input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="Name this view (e.g. Workouts)" aria-label="Name for the saved filter view" className="lq-t15" maxLength={40} />
                <Button type="submit" variant="fill" size="sm" disabled={!viewName.trim()}>Save view</Button>
              </form>
            </div>

            <div className="w1-lib-chips" role="group" aria-label="Level">
              <ChipBtn on={s.level === "all"} onClick={() => set({ level: "all" })}>All levels</ChipBtn>
              {t.levels.map((l) => (
                <ChipBtn key={l.slug} on={s.level === l.slug} onClick={() => set({ level: l.slug })}>{l.name}</ChipBtn>
              ))}
              <ChipBtn on={s.saved} icon="bookmark" onClick={() => set({ saved: !s.saved })}>
                Saved{savedCount ? ` (${savedCount})` : ""}
              </ChipBtn>
            </div>

            <div className="w1-lib-group">
              <p className="w1-lib-label">Categories</p>
              <div className="w1-lib-chips w1-lib-wrap" role="group" aria-label="Categories">
                {categories.map((c) => (
                  <ChipBtn key={c.slug} on={s.cats.includes(c.slug)} onClick={() => toggleIn("cats", c.slug)}>{c.name}</ChipBtn>
                ))}
              </div>
            </div>

            <div className="w1-lib-group">
              <p className="w1-lib-label">Tags — match all selected</p>
              <div className="w1-lib-chips w1-lib-wrap w1-lib-tags" role="group" aria-label="Tags">
                {tagOptions.map((g) => (
                  <ChipBtn key={g.slug} on={s.tags.includes(g.slug)} onClick={() => toggleIn("tags", g.slug)}>#{g.name}</ChipBtn>
                ))}
              </div>
            </div>

            <div className="w1-lib-chips w1-lib-wrap w1-lib-foot">
              <ChipBtn on={s.inProgram} icon="kettlebell" onClick={() => set({ inProgram: !s.inProgram })}>In the program</ChipBtn>
              {filtered && (
                <button type="button" className="w1-lib-clear lq-t13" onClick={clearAll}>
                  <Icon name="close" size="xs" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </Glass>

      {/* ------------------------------------------------ continue watching (v2, spec 07) */}
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

      {/* ------------------------------------------------ movement index (signature) */}
      {s.source !== "programs" && (
        <section aria-labelledby="mi-t" className="w1-mi">
          <div className="w1-lib-sech">
            <div>
              <p className="lq-eyebrow" data-tone="accent">Movement index</p>
              <h2 id="mi-t" className="lq-d-sm">Browse by movement</h2>
            </div>
            {s.move !== "all" && (
              <button type="button" className="w1-lib-clear lq-t13" onClick={() => set({ move: "all" })}>
                <Icon name="close" size="xs" /> All movements
              </button>
            )}
          </div>
          <ul className="w1-mi-row" role="list">
            {MOVE_INDEX.filter((m) => moveCounts.get(m.key)).map((m) => {
              const on = s.move === m.key;
              return (
                <li key={m.key}>
                  <button type="button" className="w1-mi-tile lq-press" aria-pressed={on} data-on={on ? "" : undefined} onClick={() => set({ move: on ? "all" : m.key })}>
                    <span className="w1-mi-fig" aria-hidden>
                      <MovementFigure move={m.fig} size={64} animated={on} />
                    </span>
                    <span className="w1-mi-text">
                      <span className="lq-t13 w1-mi-label">{m.label}</span>
                      <span className="lq-t11 lq-c2 lq-num">{moveCounts.get(m.key)} {moveCounts.get(m.key) === 1 ? "video" : "videos"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------ source tabs */}
      <Segmented label="What to show" options={narrow ? SOURCES.map((o) => ({ ...o, label: SHORT[o.value] })) : SOURCES} value={s.source} onChange={(v: Source) => set({ source: v })} className="w1-lib-src" />

      {/* ------------------------------------------------ inline player */}
      {current && s.source !== "programs" && (
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
              {levelsOf(current).map((l) => (
                <Chip key={l} variant="tint">{name("level", l)}</Chip>
              ))}
              {current.d ? <Chip variant="fill"><span className="lq-num">{clock(current.d)}</span></Chip> : null}
            </div>
            <h2 className="lq-t22">{cleanTitle(current.t)}</h2>
            {catsOf(current).length > 0 && <p className="lq-t13 lq-c2">{catsOf(current).map((c) => name("category", c)).join(" · ")}</p>}
            {topicsOf(current).length > 0 && (
              <div className="w1-lib-chips w1-lib-wrap" role="group" aria-label="Filter by tag">
                {topicsOf(current).map((g) => (
                  <ChipBtn key={g} on={s.tags.includes(g)} onClick={() => toggleIn("tags", g)} small>#{name("topic", g)}</ChipBtn>
                ))}
              </div>
            )}
            <div className="w1-lib-actions">
              <Button variant={(saved[current.id] ?? current.s) ? "tint" : "glass"} size="md" icon="bookmark" aria-pressed={saved[current.id] ?? current.s} onClick={() => toggleSave(current)}>
                {(saved[current.id] ?? current.s) ? "Saved" : "Save video"}
              </Button>
              <Button variant="glass" size="md" href={`/library/${current.id}`} iconAfter="chevron">Details</Button>
              <Button variant="plain" size="md" icon="close" onClick={() => setPlaying(null)}>Close player</Button>
            </div>
          </div>
        </Glass>
        </section>
      )}

      {/* ------------------------------------------------ active filters + results line */}
      {s.source !== "programs" && (
        <>
          {active.length > 0 && (
            <div className="w1-lib-active">
              {active.map((f) => (
                <button key={f.label} type="button" className="w1-lib-pill lq-t12" onClick={f.clear} aria-label={`Remove filter ${f.label}`}>
                  {f.label} <Icon name="close" size="xs" />
                </button>
              ))}
              <button type="button" className="w1-lib-pill w1-lib-pill-all lq-t12" onClick={clearAll}>Clear all</button>
            </div>
          )}
          <div className="w1-lib-results">
            <p className="lq-t13 lq-c2 w1-clamp1">
              <strong className="lq-num w1-lib-n">{results.length}</strong> of <span className="lq-num">{pool}</span> videos
              {s.move !== "all" ? ` · ${MOVE_INDEX.find((m) => m.key === s.move)?.label}` : ""}
              {s.q.trim() ? ` matching “${s.q.trim()}”` : ""}
              {s.saved ? " · saved only" : ""}
            </p>
            <label className="w1-lib-sort">
              <span className="lq-t13 lq-c2 w1-lib-sortlabel">Sort</span>
              <select value={s.sort} onChange={(e) => set({ sort: e.target.value as Sort })} aria-label="Sort videos" className="lq-t13">
                {SORTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <Icon name="down" size="xs" className="lq-c2" />
            </label>
          </div>

          {/* ------------------------------------------------ grid */}
          {results.length === 0 ? (
            s.saved && savedCount === 0 ? (
              <EmptyState
                title="Nothing saved yet"
                body="Tap the bookmark on any video and it will show up here for quick access."
                illustration={<EmptyScene scene="nothing-saved" size={150} />}
                action={<Button variant="glass" size="md" onClick={() => set({ saved: false })}>Browse all videos</Button>}
              />
            ) : (
              <EmptyState
                title={s.q.trim() ? `No videos match “${s.q.trim()}”` : "No videos match those filters"}
                body="Try a different level, drop a tag, or clear everything to see the full catalogue again."
                icon="search"
                action={<Button variant="glass" size="md" onClick={clearAll}>Clear filters</Button>}
              />
            )
          ) : (
            <>
              <ul className="w1-lib-grid" aria-label="Videos">
                {results.slice(0, shown).map((v, i) => (
                  <li key={v.id}>
                    <PortraitCard v={v} name={name} programs={data.index.programs} saved={saved[v.id] ?? v.s} active={playing === v.id} priority={i < 4} onPlay={() => play(v.id)} onSave={() => toggleSave(v)} />
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
        </>
      )}

      {s.source !== "videos" && <ProgramLessons data={data} query={s.q} />}
    </div>
  );
}

function ChipBtn({ on, onClick, children, icon, small }: { on: boolean; onClick: () => void; children: React.ReactNode; icon?: "bookmark" | "kettlebell"; small?: boolean }) {
  return (
    <button type="button" className="w1-lib-chipbtn" aria-pressed={on} onClick={onClick} data-small={small ? "" : undefined}>
      <Chip variant="fill" selected={on} icon={icon}>{children}</Chip>
    </button>
  );
}

function PortraitCard({
  v, name, programs, saved, active, priority, onPlay, onSave,
}: {
  v: LibraryIndexVideo;
  name: (ns: string, slug: string) => string;
  programs: { id: string; name: string }[];
  saved: boolean;
  active: boolean;
  priority: boolean;
  onPlay: () => void;
  onSave: () => void;
}) {
  const level = levelsOf(v)[0];
  const cats = catsOf(v);
  const eyebrow = cats.length ? cats.map((c) => name("category", c)).join(" · ") : programs.find((p) => v.pr.includes(p.id))?.name ?? "Library";
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
            sizes="(min-width: 1536px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw"
            priority={priority}
          />
          {level && <span className="w1-lib-level lq-t11">{name("level", level)}</span>}
          {v.d ? <span className="w1-lib-dur lq-t11 lq-num">{clock(v.d)}</span> : null}
          <span className="w1-lib-playglyph" aria-hidden><Icon name="play" size="sm" /></span>
        </span>
        <span className="w1-lib-text">
          <span className="w1-lib-eyebrow w1-clamp1">{eyebrow}</span>
          <span className="lq-t15 w1-clamp2 w1-lib-title">{title}</span>
          {v.ip && <span className="lq-t11 lq-c2 w1-lib-inprog"><Icon name="kettlebell" size="xs" /> In the program</span>}
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

/** "From every program": lessons across every program the member can open (legacy ProgramLessons). */
function ProgramLessons({ data, query }: { data: LibraryPage; query: string }) {
  const [program, setProgram] = useState("all");
  const [limit, setLimit] = useState(60);
  const progs = data.index.programs;
  const pById = new Map(progs.map((p) => [p.id, p]));
  const q = query.trim().toLowerCase();
  const rows = data.index.lessons
    .filter((l) => program === "all" || l.pr === program)
    .filter((l) => !q || `${l.t} ${l.sec} ${pById.get(l.pr)?.name ?? ""}`.toLowerCase().includes(q));
  if (!data.index.lessons.length) return null;
  return (
    <section className="w1-lib-lessons" aria-labelledby="lessons-t">
      <div className="w1-lib-sech">
        <h2 id="lessons-t" className="lq-t22">From every program</h2>
        <span className="lq-t13 lq-c2 lq-num">{rows.length} lessons</span>
      </div>
      <div className="w1-lib-chips w1-lib-scroll" role="group" aria-label="Program">
        <ChipBtn on={program === "all"} onClick={() => setProgram("all")}>All programs</ChipBtn>
        {progs.filter((p) => data.index.lessons.some((l) => l.pr === p.id)).map((p) => (
          <ChipBtn key={p.id} on={program === p.id} onClick={() => setProgram(p.id)}>{p.name}</ChipBtn>
        ))}
      </div>
      {rows.length ? (
        <ul className="w1-lib-lessongrid">
          {rows.slice(0, limit).map((l) => {
            const p = pById.get(l.pr);
            const path = l.path ? data.paths[l.path] : null;
            return (
              <li key={l.id}>
                <Link href={p ? `/programs/${p.slug}/learn/${l.id}` : "/programs"} className="w1-cardlink">
                  <Glass radius="panel" interactive className="w1-lib-lesson">
                    <span className="w1-lib-lessonic" aria-hidden><Icon name="play" size="xs" /></span>
                    <span className="w1-lib-lessontext">
                      <span className="lq-t15 w1-clamp1">{cleanTitle(l.t)}</span>
                      <span className="lq-t12 lq-c2 w1-clamp1">{[p?.name, path, l.sec].filter(Boolean).join(" · ")}</span>
                    </span>
                    <Icon name="chevron" size="xs" className="lq-c3" />
                  </Glass>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="lq-t15 lq-c2">No program lessons match.</p>
      )}
      {rows.length > limit && (
        <div className="w1-lib-more">
          <Button variant="glass" size="md" onClick={() => setLimit((n) => n + 60)}>Show more lessons</Button>
        </div>
      )}
    </section>
  );
}
