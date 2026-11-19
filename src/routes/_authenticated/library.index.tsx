import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProgramLessonsIndex } from "@/lib/courses.functions";
import { listLibraryVideos } from "@/lib/library.functions";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Image as ImageIcon,
  Search,
  SlidersHorizontal,
  VideoOff,
  X,
} from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { Pill, Poster } from "@/components/media";
import { Chip, EmptyState, buttonStyles } from "@/components/ui-kit";
import { VimeoPlayer } from "@/components/VimeoPlayer";
import { useSavedVideos } from "@/hooks/use-saved-videos";
import { useLibraryPresets, type LibraryPreset } from "@/hooks/use-library-presets";
import {
  categoriesForLevel,
  categoryLabel,
  levelLabel,
  libraryLevels,
  tagLabel,
  tagsFor,
  type LibraryVideo,
} from "@/content/library";
import { cn } from "@/lib/utils";

type SavesApi = ReturnType<typeof useSavedVideos>;

/** Bookmark toggle used on library cards and inside the player panel. */
function SaveVideoButton({
  video,
  saves,
  compact,
}: {
  video: LibraryVideo;
  saves: SavesApi;
  compact?: boolean;
}) {
  const saved = saves.isSaved(video.id);
  const Icon = saved ? BookmarkCheck : Bookmark;

  if (compact) {
    return (
      <button
        type="button"
        aria-label={saved ? `Remove ${video.title} from saves` : `Save ${video.title}`}
        aria-pressed={saved}
        onClick={(e) => {
          e.stopPropagation();
          saves.toggle({ videoId: video.id, title: video.title });
        }}
        className={cn(
          "tap absolute left-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full backdrop-blur-md transition-all duration-200 active:scale-90",
          saved
            ? "bg-primary text-primary-foreground"
            : "bg-black/40 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => saves.toggle({ videoId: video.id, title: video.title })}
      className={cn(
        "tap inline-flex w-fit items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-200",
        saved
          ? "border-primary bg-primary/10 text-primary"
          : "border-hairline text-muted-foreground hover:border-primary hover:text-primary",
      )}
    >
      <Icon className="h-4 w-4" /> {saved ? "Saved" : "Save video"}
    </button>
  );
}


export const Route = createFileRoute("/_authenticated/library/")({
  head: () => ({
    meta: [
      { title: "Video Library — Kettlebell Lifestyle" },
      {
        name: "description",
        content:
          "Every Kettlebell Lifestyle video in one place. Filter by level, then category, then tag — On Ramp, phases, technique and workouts.",
      },
      { property: "og:title", content: "Video Library — Kettlebell Lifestyle" },
      {
        property: "og:description",
        content: "Filter the full Kettlebell Lifestyle catalogue by level, category, tag or keyword.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

/** Which artwork the grid shows: the legacy featured image, or Vimeo's own frame. */
type Artwork = "featured" | "vimeo";
const ARTWORK_KEY = "kbl:library:artwork";

/** How the results are ordered. */
type Sort = "program" | "title-asc" | "title-desc" | "in-program-first" | "level";

const SORTS: [Sort, string][] = [
  ["program", "Program order"],
  ["title-asc", "Title A–Z"],
  ["title-desc", "Title Z–A"],
  ["in-program-first", "In the program first"],
  ["level", "By level"],
];


function artworkFor(video: LibraryVideo, mode: Artwork): string | undefined {
  if (mode === "vimeo") return undefined;
  return video.image || undefined;
}

function LibraryPage() {
  const [level, setLevel] = useState<string>("all");
  const [cats, setCats] = useState<string[]>([]);
  const [tagList, setTagList] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("program");
  const [inProgramOnly, setInProgramOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | "videos" | "programs">("all");
  const [artwork, setArtwork] = useState<Artwork>("featured");
  const [playing, setPlaying] = useState<LibraryVideo | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const saves = useSavedVideos();
  const fetchLibrary = useServerFn(listLibraryVideos);
  const { data: videos = [] } = useQuery({ queryKey: ["library-videos"], queryFn: () => fetchLibrary() as Promise<LibraryVideo[]>, staleTime: 5 * 60_000 });


  useEffect(() => {
    const saved = window.localStorage.getItem(ARTWORK_KEY);
    if (saved === "vimeo" || saved === "featured") setArtwork(saved);
  }, []);

  function chooseArtwork(next: Artwork) {
    setArtwork(next);
    try {
      window.localStorage.setItem(ARTWORK_KEY, next);
    } catch {
      /* storage unavailable — the choice simply doesn't persist */
    }
  }

  const categories = useMemo(() => categoriesForLevel(level, videos), [level, videos]);
  const tags = useMemo(() => tagsFor(level, cats[0] ?? "all", videos), [level, cats, videos]);

  /* keep the lower tiers valid when a higher tier changes */
  useEffect(() => {
    setCats((prev) => prev.filter((c) => categories.some((o) => o.id === c)));
  }, [categories]);
  useEffect(() => {
    setTagList((prev) => prev.filter((t) => tags.some((o) => o.id === t)));
  }, [tags]);

  const toggleIn = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((v) => v !== id) : [...list, id]);

  const results = useMemo(() => {
    // Search matches every whitespace-separated token against the title, tags,
    // categories and levels, so "on ramp swing" finds the right clip.
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    const list = videos.filter((v) => {
      if (savedOnly && !saves.ids.has(v.id)) return false;
      if (level !== "all" && !v.levels.includes(level)) return false;
      if (cats.length && !cats.some((c) => v.categories.includes(c))) return false;
      if (tagList.length && !tagList.every((t) => v.tags.includes(t))) return false;
      if (inProgramOnly && !(v.usedIn && v.usedIn.length)) return false;
      if (!tokens.length) return true;
      const haystack = [
        v.title,
        ...v.tags.map(tagLabel),
        ...v.tags,
        ...v.categories.map(categoryLabel),
        ...v.levels.map(levelLabel),
      ]
        .join(" ")
        .toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });

    if (sort === "title-asc") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "title-desc") return [...list].sort((a, b) => b.title.localeCompare(a.title));
    if (sort === "in-program-first")
      return [...list].sort((a, b) => (b.usedIn?.length ?? 0) - (a.usedIn?.length ?? 0));
    if (sort === "level") {
      const rank = (v: LibraryVideo) => {
        const i = libraryLevels.findIndex((l) => v.levels.includes(l.id));
        return i === -1 ? libraryLevels.length : i;
      };
      return [...list].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
    }
    return list;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, level, cats, tagList, query, savedOnly, inProgramOnly, sort, saves.rows]);

  const filtered =
    level !== "all" ||
    cats.length > 0 ||
    tagList.length > 0 ||
    query.trim() !== "" ||
    savedOnly ||
    inProgramOnly ||
    sort !== "program";

  const activeFilters: { label: string; clear: () => void }[] = [
    ...(savedOnly ? [{ label: "Saved", clear: () => setSavedOnly(false) }] : []),
    ...(inProgramOnly ? [{ label: "In the program", clear: () => setInProgramOnly(false) }] : []),
    ...(level !== "all" ? [{ label: levelLabel(level), clear: () => setLevel("all") }] : []),
    ...cats.map((c) => ({ label: categoryLabel(c), clear: () => toggleIn(cats, setCats, c) })),
    ...tagList.map((t) => ({ label: `#${tagLabel(t)}`, clear: () => toggleIn(tagList, setTagList, t) })),
  ];

  function clearAll() {
    setLevel("all");
    setCats([]);
    setTagList([]);
    setQuery("");
    setSavedOnly(false);
    setInProgramOnly(false);
    setSort("program");
  }

  /* Saved filter presets ------------------------------------------------ */
  const { presets, save: savePreset, remove: removePreset } = useLibraryPresets();
  const [presetName, setPresetName] = useState("");

  function applyPreset(p: LibraryPreset) {
    setLevel(p.state.level);
    setCats(p.state.cats);
    setTagList(p.state.tagList);
    setSort(p.state.sort as Sort);
    setInProgramOnly(p.state.inProgramOnly);
    setSavedOnly(p.state.savedOnly);
    setQuery(p.state.query);
  }

  function handleSavePreset() {
    savePreset(presetName, { level, cats, tagList, sort, inProgramOnly, savedOnly, query });
    setPresetName("");
  }




  return (
    <AppShell>
      {/* Compact, sticky toolbar — no hero, videos start immediately */}
      <div className="sticky top-0 z-30 border-b border-hairline bg-background/85 backdrop-blur-xl">
        <Container className="py-3">
          <div className="flex items-center gap-2">
            <h1 className="shrink-0 text-base font-semibold text-foreground sm:text-lg">Library</h1>
            <span className="numeric hidden shrink-0 text-xs text-muted-foreground sm:inline">
              {results.length}/{videos.length}
            </span>

            <label className="relative ml-auto min-w-0 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search videos"
                aria-label="Search the library"
                className="w-full rounded-full border border-hairline bg-secondary/60 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors duration-200 placeholder:text-muted-foreground focus:border-primary focus:bg-background"
              />
            </label>

            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className={cn(
                "tap inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors duration-200",
                activeFilters.length > 0
                  ? "border-primary text-primary"
                  : "border-hairline text-muted-foreground hover:text-foreground",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilters.length > 0 && (
                <span className="numeric rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                  {activeFilters.length}
                </span>
              )}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform duration-300", filtersOpen && "rotate-180")}
              />
            </button>
          </div>

          {/* Filter drawer — same control set on desktop and mobile */}
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
              filtersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-2.5 pt-3">
                {/* Saved presets — one tap back to a favourite view */}
                <div>
                  <p className="eyebrow mb-1.5 text-muted-foreground">Saved views</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {presets.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        Set your filters, name them below, and they'll be one tap away.
                      </span>
                    )}
                    {presets.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center overflow-hidden rounded-full border border-hairline bg-secondary/60"
                      >
                        <button
                          type="button"
                          onClick={() => applyPreset(p)}
                          className="tap px-3 py-1 text-xs font-semibold text-foreground hover:text-primary"
                        >
                          {p.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => removePreset(p.id)}
                          aria-label={`Delete saved view ${p.name}`}
                          className="tap px-2 py-1 text-muted-foreground hover:text-primary"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <input
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePreset();
                      }}
                      placeholder="Name this view (e.g. Workouts)"
                      aria-label="Name for the saved filter view"
                      className="min-w-0 rounded-xl border border-hairline bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleSavePreset}
                      disabled={!presetName.trim()}
                      className="tap shrink-0 rounded-xl border border-hairline px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                    >
                      Save view
                    </button>
                  </div>
                </div>


                <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                  <Chip active={level === "all"} onClick={() => setLevel("all")}>
                    All levels
                  </Chip>
                  {libraryLevels.map((l) => (
                    <Chip key={l.id} active={level === l.id} onClick={() => setLevel(l.id)}>
                      {l.label}
                    </Chip>
                  ))}
                  <Chip active={savedOnly} onClick={() => setSavedOnly((v) => !v)}>
                    <Bookmark className="mr-1 inline h-3 w-3 align-[-1px]" />
                    Saved{saves.rows.length ? ` (${saves.rows.length})` : ""}
                  </Chip>
                </div>


                <div>
                  <p className="eyebrow mb-1.5 text-muted-foreground">Categories</p>
                  <div className="no-scrollbar -mx-1 flex flex-wrap gap-1.5 px-1">
                    {categories.map((c) => (
                      <Chip
                        key={c.id}
                        active={cats.includes(c.id)}
                        onClick={() => toggleIn(cats, setCats, c.id)}
                      >
                        {c.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="eyebrow mb-1.5 text-muted-foreground">Tags — match all selected</p>
                  <div className="no-scrollbar -mx-1 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto px-1">
                    {tags.map((t) => (
                      <Chip
                        key={t.id}
                        active={tagList.includes(t.id)}
                        onClick={() => toggleIn(tagList, setTagList, t.id)}
                      >
                        #{t.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Chip active={inProgramOnly} onClick={() => setInProgramOnly((v) => !v)}>
                    In the program
                  </Chip>




                  <div
                    role="group"
                    aria-label="Thumbnail source"
                    className="flex shrink-0 items-center gap-1 rounded-xl border border-hairline bg-secondary/60 p-1"
                  >
                    <ImageIcon className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
                    {(
                      [
                        ["featured", "Featured"],
                        ["vimeo", "Vimeo"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => chooseArtwork(id)}
                        aria-pressed={artwork === id}
                        className={cn(
                          "tap rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors duration-200",
                          artwork === id ? "bg-background text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {filtered && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="tap ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
                    >
                      <X className="h-3.5 w-3.5" /> Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-4 sm:py-6">
        <div role="tablist" aria-label="What to show" className="mb-4 inline-flex rounded-xl bg-secondary p-1">
          {([["all", "Everything"], ["videos", "Technique videos"], ["programs", "Program lessons"]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={source === id} onClick={() => setSource(id)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", source === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
              {label}
            </button>
          ))}
        </div>
        {/* Player */}
        {playing && (
          <section className="animate-pop command-panel mb-6 overflow-hidden p-0">
            <div className="grid lg:grid-cols-[1.6fr_1fr]">
              <VimeoPlayer
                key={playing.id}
                vimeoId={playing.vimeoId}
                title={playing.title}
                poster={artworkFor(playing, artwork)}
                autoplay
                className="rounded-none border-0"
              />
              <div className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {playing.levels.map((l) => (
                    <Pill key={l} tone="primary">
                      {levelLabel(l)}
                    </Pill>
                  ))}
                </div>
                <h2 className="text-lg text-foreground">{playing.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {playing.categories.map(categoryLabel).join(" · ")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {playing.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleIn(tagList, setTagList, t)}
                      className="tap eyebrow rounded-full bg-secondary px-2.5 py-1 text-muted-foreground hover:text-foreground"
                    >
                      #{tagLabel(t)}
                    </button>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <SaveVideoButton video={playing} saves={saves} />
                  <button
                    type="button"
                    onClick={() => setPlaying(null)}
                    className="tap inline-flex w-fit items-center gap-2 rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <X className="h-4 w-4" /> Close player
                  </button>
                </div>

              </div>
            </div>
          </section>
        )}

        {activeFilters.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {activeFilters.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={f.clear}
                aria-label={`Remove filter ${f.label}`}
                className="eyebrow tap inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-muted-foreground hover:text-foreground"
              >
                {f.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="eyebrow tap inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Results summary + always-visible sort — stacks on mobile */}
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            <span className="numeric font-semibold text-foreground">{results.length}</span>
            {" of "}
            <span className="numeric">{videos.length}</span> videos
            {query.trim() ? ` matching “${query.trim()}”` : ""}
            {savedOnly ? " · saved only" : ""}
          </p>
          <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort videos"
              className="rounded-xl border border-hairline bg-secondary/60 px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              {SORTS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {source === "programs" ? null : results.length === 0 ? (
          savedOnly && saves.rows.length === 0 ? (
            <EmptyState
              className="mt-10"
              icon={Bookmark}
              title="Nothing saved yet"
              description="Tap the bookmark on any video and it will show up here for quick access."
              action={
                <button type="button" onClick={() => setSavedOnly(false)} className={buttonStyles.primary}>
                  Browse all videos
                </button>
              }
            />
          ) : (
            <EmptyState
              className="mt-10"
              icon={VideoOff}
              title={query.trim() ? `No videos match “${query.trim()}”` : "No videos match those filters"}
              description="Try a different level, drop a tag, or clear everything to see the full catalogue again."
              action={
                <button type="button" onClick={clearAll} className={buttonStyles.primary}>
                  Clear filters
                </button>
              }
            />
          )
        ) : (

          <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {results.map((video) => (
              <article
                key={video.id}
                className={cn(
                  "zoom-parent group relative flex flex-col overflow-hidden rounded-2xl border border-hairline bg-card text-left",
                  playing?.id === video.id && "border-primary/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(video);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="pressable flex flex-1 flex-col text-left"
                >
                  <Poster
                    vimeoId={video.vimeoId}
                    imageSrc={artworkFor(video, artwork)}
                    alt={video.title}
                    ratio="portrait"
                    overlay={
                      video.levels[0] ? (
                        <div className="absolute right-2 top-2 flex gap-1.5">
                          <Pill>{levelLabel(video.levels[0])}</Pill>
                        </div>
                      ) : null
                    }
                  />
                  <div className="flex flex-1 flex-col p-3">
                    <p className="eyebrow truncate text-primary">
                      {video.categories.map(categoryLabel).join(" · ") || "Library"}
                    </p>
                    <h3 className="mt-1 text-sm leading-snug text-foreground">{video.title}</h3>
                  </div>
                </button>
                <SaveVideoButton video={video} saves={saves} compact />
              </article>

            ))}
          </div>
        )}
        {source !== "videos" && <ProgramLessons query={query} />}
      </Container>
    </AppShell>
  );
}

/** Lessons from every program, so the Library covers all programs in one place. */
function ProgramLessons({ query }: { query: string }) {
  const fetchIndex = useServerFn(listProgramLessonsIndex);
  const { data = [] } = useQuery({ queryKey: ["program-lessons-index"], queryFn: () => fetchIndex(), staleTime: 300_000 });
  const [program, setProgram] = useState("all");
  const programs = Array.from(new Set(data.map((l) => l.program)));
  const q = query.trim().toLowerCase();
  const rows = data
    .filter((l) => program === "all" || l.program === program)
    .filter((l) => !q || `${l.title} ${l.section} ${l.program}`.toLowerCase().includes(q))
    .slice(0, 60);
  if (!data.length) return null;
  return (
    <section className="mt-10 pb-10">
      <h2 className="text-lg font-semibold text-foreground">From every program</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {["all", ...programs].map((p) => (
          <button key={p} onClick={() => setProgram(p)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", program === p ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
            {p === "all" ? "All programs" : p}
          </button>
        ))}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((l) => (
          <li key={l.id}>
            <Link to="/courses/$courseSlug" params={{ courseSlug: l.slug }} className="block rounded-2xl border border-border bg-surface p-3">
              <p className="truncate text-sm font-semibold text-foreground">{l.title}</p>
              <p className="truncate text-xs text-muted-foreground">{l.program} · {l.section}</p>
            </Link>
          </li>
        ))}
      </ul>
      {!rows.length && <p className="mt-4 text-sm text-muted-foreground">No program lessons match.</p>}
    </section>
  );
}
