"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { LibraryVideo } from "@ms/api";
import { Button, Chip, EmptyState, Glass, Icon, IconButton, Sheet, useToast } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import type { LibraryData } from "@/lib/loaders/discover";
import { toggleSaveVideo } from "@/lib/actions/discover";
import { filterVideos, type LibraryQueryInput } from "./filter";
import { VideoCard } from "./VideoCard";

type Props = { data: LibraryData; initial: LibraryQueryInput };

const FACET_LABEL: Record<string, string> = { category: "Phase", topic: "Movement" };

/** Library: instant search over loaded videos, server search via ?q, filter sheet, saved view, collections. */
export function LibraryBrowser({ data, initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initial.q ?? "");
  const [tags, setTags] = useState<string[]>(initial.tags ?? []);
  const [program, setProgram] = useState<string | null>(initial.program ?? null);
  const [saved, setSaved] = useState(Boolean(initial.saved));
  const [sheet, setSheet] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const input = useRef<HTMLInputElement>(null);

  // Keep the URL (and so the server query) in step, debounced while typing.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (tags.length) sp.set("tags", tags.join(","));
      if (program) sp.set("program", program);
      if (saved) sp.set("saved", "1");
      const next = `/library${sp.size ? `?${sp}` : ""}`;
      if (next !== window.location.pathname + window.location.search) startTransition(() => router.replace(next, { scroll: false }));
    }, 320);
    return () => window.clearTimeout(t);
  }, [q, tags, program, saved, router]);

  // "/" focuses search, like the rest of the web.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const videos = useMemo(() => {
    const merged = data.videos.map((v) => (v.id in overrides ? { ...v, saved: overrides[v.id]! } : v));
    return filterVideos(merged, { q, tags, program, saved });
  }, [data.videos, overrides, q, tags, program, saved]);

  const filterCount = tags.length + (program ? 1 : 0);
  const facetName = (slug: string) => Object.values(data.facets).flat().find((f) => f.slug === slug)?.name ?? slug;
  const toggleTag = (slug: string) => setTags((t) => (t.includes(slug) ? t.filter((x) => x !== slug) : [...t, slug]));

  async function toggleSave(v: LibraryVideo) {
    const next = !(overrides[v.id] ?? v.saved);
    setOverrides((o) => ({ ...o, [v.id]: next }));
    const res = await toggleSaveVideo(v.id);
    if (!res.ok) {
      setOverrides((o) => ({ ...o, [v.id]: !next }));
      toast(res.error);
      return;
    }
    setOverrides((o) => ({ ...o, [v.id]: res.data }));
    toast(res.data ? "Saved" : "Removed from saved", { tone: res.data ? "success" : "neutral", icon: "bookmark" });
  }

  const filtered = Boolean(q.trim() || filterCount || saved);
  const countLine = filtered ? `${videos.length} ${videos.length === 1 ? "video" : "videos"}` : `${data.total} videos`;

  return (
    <div className="dsc-lib">
      <div className="dsc-lib-bar">
        <Glass radius="pill" className="dsc-search">
          <Icon name="search" size="sm" className="lq-c2" />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search swings, stretches, phases"
            aria-label="Search the library"
            enterKeyHint="search"
            className="lq-t17"
          />
          {q && <IconButton icon="close" label="Clear search" variant="plain" size="sm" iconSize="xs" onClick={() => setQ("")} />}
        </Glass>
        <div className="dsc-chips" role="toolbar" aria-label="Library filters">
          <button type="button" className="dsc-chipbtn" aria-pressed={!saved && !filterCount} onClick={() => { setSaved(false); setTags([]); setProgram(null); }}>
            <Chip selected={!saved && !filterCount}>All</Chip>
          </button>
          <button type="button" className="dsc-chipbtn" aria-pressed={saved} onClick={() => setSaved((s) => !s)}>
            <Chip icon="bookmark" selected={saved}>Saved</Chip>
          </button>
          <button type="button" className="dsc-chipbtn" onClick={() => setSheet(true)} aria-haspopup="dialog">
            <Chip icon="filter" selected={filterCount > 0} score={filterCount || undefined}>Filters</Chip>
          </button>
          {program && (
            <button type="button" className="dsc-chipbtn" onClick={() => setProgram(null)} aria-label="Remove program filter">
              <Chip variant="fill" icon="close">{data.programs.find((p) => p.id === program || p.slug === program)?.name ?? "Program"}</Chip>
            </button>
          )}
          {tags.map((t) => (
            <button key={t} type="button" className="dsc-chipbtn" onClick={() => toggleTag(t)} aria-label={`Remove ${facetName(t)}`}>
              <Chip variant="fill" icon="close">{facetName(t)}</Chip>
            </button>
          ))}
        </div>
      </div>

      <div className="dsc-lib-meta lq-t13 lq-c2" aria-live="polite">
        <span className="lq-num">{countLine}</span>
        {pending && <span className="dsc-dots" aria-label="Updating" />}
      </div>

      {saved && (
        <section className="dsc-cols" aria-label="Collections">
          {data.collections.length ? (
            data.collections.map((c) => (
              <Glass key={c.id} radius="panel" className="dsc-col">
                <Icon name="library" size="sm" />
                <span className="lq-t15">{c.name}</span>
                <span className="lq-t12 lq-c2 lq-num">{c.count}</span>
              </Glass>
            ))
          ) : (
            <p className="lq-t13 lq-c2 dsc-cols-hint">Group saved videos into collections from any video page.</p>
          )}
        </section>
      )}

      {videos.length ? (
        <div className="dsc-vgrid">
          {videos.map((v, i) => {
            const isSaved = overrides[v.id] ?? v.saved;
            return (
              <VideoCard
                key={v.id}
                video={{ ...v, saved: isSaved }}
                priority={i < 2}
                overlay={
                  <IconButton
                    icon="bookmark"
                    label={isSaved ? `Remove ${v.title} from saved` : `Save ${v.title}`}
                    variant="clear"
                    size="sm"
                    iconSize="sm"
                    className="dsc-vc-save"
                    data-on={isSaved ? "" : undefined}
                    aria-pressed={isSaved}
                    onClick={() => toggleSave(v)}
                  />
                }
              />
            );
          })}
        </div>
      ) : saved ? (
        <EmptyState
          title="Nothing saved yet"
          body="Tap the bookmark on any video to keep it here."
          illustration={<EmptyScene scene="nothing-saved" size={160} />}
          action={<Button variant="glass" size="md" onClick={() => setSaved(false)}>Browse all videos</Button>}
        />
      ) : (
        <EmptyState
          title="No videos match"
          body={q ? `Nothing for “${q.trim()}”. Try a movement, like swing or squat.` : "Try removing a filter."}
          icon="search"
          action={<Button variant="glass" size="md" onClick={() => { setQ(""); setTags([]); setProgram(null); }}>Clear search</Button>}
        />
      )}

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Filters"
        detents={["medium", "large"]}
        desktop="side"
        footer={
          <div className="dsc-sheet-foot">
            <Button variant="fill" size="md" onClick={() => { setTags([]); setProgram(null); }}>Reset</Button>
            <Button variant="filled" size="md" block onClick={() => setSheet(false)}>
              Show {videos.length} {videos.length === 1 ? "video" : "videos"}
            </Button>
          </div>
        }
      >
        <div className="dsc-facets">
          {data.programs.length > 0 && (
            <fieldset>
              <legend className="lq-t13 lq-c2">Program</legend>
              <div className="dsc-facet-row">
                {data.programs.map((p) => (
                  <button key={p.id} type="button" className="dsc-chipbtn" aria-pressed={program === p.id} onClick={() => setProgram((x) => (x === p.id ? null : p.id))}>
                    <Chip variant="fill" selected={program === p.id}>{p.name}</Chip>
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {Object.entries(data.facets).map(([ns, list]) => (
            <fieldset key={ns}>
              <legend className="lq-t13 lq-c2">{FACET_LABEL[ns] ?? ns}</legend>
              <div className="dsc-facet-row">
                {list.map((f) => (
                  <button key={f.slug} type="button" className="dsc-chipbtn" aria-pressed={tags.includes(f.slug)} onClick={() => toggleTag(f.slug)}>
                    <Chip variant="fill" selected={tags.includes(f.slug)}>{f.name}</Chip>
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
