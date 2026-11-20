"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { LibraryVideo } from "@ms/api";
import { Button, Chip, Glass, Icon, IconButton, Sheet, useToast } from "@/components/ui";
import { addVideoToCollection, toggleSaveVideo } from "@/lib/actions/discover";
import { moveFor, phaseOf, topicsOf, VideoCard } from "./VideoCard";
import { LibraryPlayer } from "./library/LibraryPlayer";
import { MovementCover } from "./library/MovementCover";
import { coverOf } from "./library/model";
import "./library/library.css";

type Props = {
  video: LibraryVideo;
  related: LibraryVideo[];
  collections: { id: string; name: string; count: number }[];
  /** Program photos by slug, for the "Also in" rows. */
  programPhotos: Record<string, string>;
};

/** Video page: player, save, collections, "Also in" program links, more like this. */
export function VideoView({ video: v, related, collections, programPhotos }: Props) {
  const toast = useToast();
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(v.saved);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState("");
  const phase = phaseOf(v);
  const topics = topicsOf(v);

  async function save() {
    const next = !saved;
    setSaved(next);
    setBusy(true);
    const res = await toggleSaveVideo(v.id);
    setBusy(false);
    if (!res.ok) {
      setSaved(!next);
      toast(res.error);
      return;
    }
    setSaved(res.data);
    toast(res.data ? "Saved to You" : "Removed from saved", { tone: res.data ? "success" : "neutral", icon: "bookmark" });
  }

  async function addTo(target: { id?: string; name?: string }) {
    const res = await addVideoToCollection(v.id, target);
    if (!res.ok) return toast(res.error);
    setSheet(false);
    setName("");
    toast("Added to collection", { tone: "success" });
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: v.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
      }
    } catch {
      /* dismissed */
    }
  }

  return (
    <div className="dsc-video">
      <div className="dsc-video-top">
        <IconButton icon="back" label="Back to library" href="/library" />
        <span className="lq-t13 lq-c2 dsc-clamp1">{phase ?? "Library"}</span>
      </div>

      <div className="dsc-video-main">
        <div className="dsc-player" data-playing={playing ? "" : undefined}>
          {playing ? (
            <LibraryPlayer id={v.id} providerId={v.provider_id} hash={v.privacy_hash} title={v.title} />
          ) : (
            <button type="button" className="dsc-player-poster" onClick={() => setPlaying(true)} aria-label={`Play ${v.title}`}>
              {coverOf(v.thumbnail_url) ? (
                <Image src={coverOf(v.thumbnail_url)!} alt="" fill priority sizes="(min-width: 1024px) 720px, 100vw" />
              ) : (
                <MovementCover move={moveFor(v)} seed={v.id} level={v.tags.find((t) => t.namespace === "level")?.slug} size={220} />
              )}
              <span className="dsc-play" aria-hidden>
                <Icon name="play" size="lg" />
              </span>
            </button>
          )}
        </div>

        <div className="dsc-video-info">
          <h1 className="lq-t28">{v.title}</h1>
          <div className="dsc-video-chips">
            {phase && (
              <Link href={`/library?cat=${v.tags.filter((t) => t.namespace === "category").map((t) => t.slug).join(",")}`} className="dsc-chipbtn" aria-label={`Show ${phase} videos`}>
                <Chip variant="fill">{phase}</Chip>
              </Link>
            )}
            {topics.slice(0, 3).map((t) => (
              <Link key={t.slug} href={`/library?tags=${t.slug}`} className="dsc-chipbtn" aria-label={`Show videos tagged ${t.name}`}>
                <Chip variant="outline">#{t.name}</Chip>
              </Link>
            ))}
          </div>
          {v.description && <p className="lq-t15 lq-c2 dsc-video-desc">{v.description}</p>}
          <div className="dsc-video-actions">
            <Button variant={saved ? "tint" : "glass"} size="md" icon="bookmark" onClick={save} disabled={busy} aria-pressed={saved}>
              {saved ? "Saved" : "Save"}
            </Button>
            <Button variant="glass" size="md" icon="plus" onClick={() => setSheet(true)}>
              Collection
            </Button>
            <IconButton icon="share" label="Share" onClick={share} />
          </div>

          {v.programs.length > 0 && (
            <section aria-labelledby="also-in" className="dsc-also">
              <h2 id="also-in" className="lq-t17">Also in</h2>
              {v.programs.map((p) => (
                <Link key={p.id} href={`/programs/${p.slug}`} className="dsc-cardlink">
                  <Glass radius="panel" interactive className="dsc-also-row">
                    <span className="dsc-also-img">
                      {programPhotos[p.slug] ? <Image src={programPhotos[p.slug]!} alt="" fill sizes="56px" /> : <Icon name="kettlebell" />}
                    </span>
                    <span className="lq-t15 dsc-clamp1">{p.name}</span>
                    <Icon name="chevron" size="sm" className="lq-c3" />
                  </Glass>
                </Link>
              ))}
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="more" className="dsc-more">
          <div className="dsc-sech">
            <h2 id="more" className="lq-t22">More like this</h2>
            {topics[0] && (
              <Link href={`/library?tags=${topics[0].slug}`} className="lq-t15 dsc-link">
                See all
              </Link>
            )}
          </div>
          <div className="dsc-rail">
            {related.map((r) => (
              <VideoCard key={r.id} video={r} compact />
            ))}
          </div>
        </section>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Add to collection" detents={["medium"]}>
        <div className="dsc-colpick">
          {collections.map((c) => (
            <button key={c.id} type="button" className="dsc-colpick-row lq-press" onClick={() => addTo({ id: c.id })}>
              <Icon name="library" size="sm" />
              <span className="lq-t17">{c.name}</span>
              <span className="lq-t13 lq-c2 lq-num">{c.count}</span>
            </button>
          ))}
          <form
            className="dsc-colpick-new"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) addTo({ name });
            }}
          >
            <label className="lq-t13 lq-c2" htmlFor="newcol">
              {collections.length ? "Or start a new one" : "Name your first collection"}
            </label>
            <Glass radius="control" className="dsc-field">
              <input id="newcol" value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning mobility" maxLength={60} className="lq-t17" />
            </Glass>
            <Button type="submit" variant="filled" size="md" block disabled={!name.trim()}>
              Create and add
            </Button>
          </form>
        </div>
      </Sheet>
    </div>
  );
}
