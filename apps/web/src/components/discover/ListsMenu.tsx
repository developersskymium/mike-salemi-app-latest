"use client";

import { useState, useTransition } from "react";
import { Button, Icon, IconButton, Sheet, useToast } from "@/components/ui";
import { createSavedListAction, toggleSavedListItemAction } from "@/lib/actions/gaps";
import type { SavedList } from "@/lib/loaders/saved-lists";
import "./lists-menu.css";

/**
 * "Add to list" for one video: tick the member's named lists ("Morning mobility", "Travel workouts")
 * or start a new one with this video in it. Lists are the member's own rows (RLS).
 */
export function ListsMenu({
  videoId,
  title,
  lists,
  onChange,
  trigger = "button",
}: {
  videoId: string;
  title: string;
  lists: SavedList[];
  onChange: (lists: SavedList[]) => void;
  trigger?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const inCount = lists.filter((l) => l.videoIds.includes(videoId)).length;
  const offline = (e: string) => toast(e === "offline" ? "Preview mode can't save lists. They work on the live app." : e, { icon: "close" });

  function toggle(l: SavedList) {
    const on = !l.videoIds.includes(videoId);
    const next = lists.map((x) => (x.id === l.id ? { ...x, videoIds: on ? [videoId, ...x.videoIds] : x.videoIds.filter((v) => v !== videoId) } : x));
    onChange(next);
    start(async () => {
      const r = await toggleSavedListItemAction(l.id, videoId, on);
      if (!r.ok) {
        onChange(lists);
        offline(r.error);
      } else toast(on ? `Added to ${l.name}` : `Removed from ${l.name}`, { tone: on ? "success" : "neutral", icon: "bookmark" });
    });
  }

  function create() {
    const n = name.trim();
    if (!n) return;
    start(async () => {
      const r = await createSavedListAction(n, videoId);
      if (!r.ok) return offline(r.error);
      onChange([...lists, { id: r.data.id, name: r.data.name, videoIds: [videoId] }]);
      setName("");
      toast(`Added to ${r.data.name}`, { tone: "success", icon: "bookmark" });
    });
  }

  return (
    <>
      {trigger === "icon" ? (
        <IconButton icon="plus" label={inCount ? `${title}: in ${inCount} ${inCount === 1 ? "list" : "lists"}. Change` : `Add ${title} to a list`} variant="glass" aria-haspopup="dialog" onClick={() => setOpen(true)} />
      ) : (
        <Button variant={inCount ? "tint" : "glass"} size="md" icon="plus" onClick={() => setOpen(true)} aria-haspopup="dialog">
          {inCount ? `In ${inCount} ${inCount === 1 ? "list" : "lists"}` : "Add to list"}
        </Button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Add to list" description={title} detents={["medium"]}>
        <div className="lm">
          {lists.length > 0 ? (
            <ul className="lm-list" role="list">
              {lists.map((l) => {
                const on = l.videoIds.includes(videoId);
                return (
                  <li key={l.id}>
                    <button type="button" className="lm-row" role="checkbox" aria-checked={on} disabled={pending} onClick={() => toggle(l)}>
                      <span className="lm-box" data-on={on ? "" : undefined} aria-hidden>{on && <Icon name="check" size="xs" />}</span>
                      <span className="lm-name">{l.name}</span>
                      <span className="lm-n lq-num">{l.videoIds.length}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="lq-t13 lq-c2">Group videos your way, like &ldquo;Morning mobility&rdquo; or &ldquo;Travel workouts&rdquo;.</p>
          )}
          <form
            className="lm-new"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <input className="lm-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="New list name" aria-label="New list name" />
            <Button size="md" type="submit" disabled={pending || !name.trim()}>Create</Button>
          </form>
        </div>
      </Sheet>
    </>
  );
}
