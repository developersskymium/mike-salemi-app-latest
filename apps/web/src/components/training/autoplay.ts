/**
 * Autoplay helpers for the day player's video stage (no React, so they can be unit-tested).
 *
 * Browsers block autoplay with sound unless the page has had a user gesture, so a start tries
 * play() with sound first and falls back to muted playback (the stage then shows "Tap to unmute").
 */

export type PlayablePlayer = {
  play: () => Promise<unknown>;
  setMuted?: (muted: boolean) => Promise<unknown>;
  setVolume: (v: number) => Promise<unknown>;
};

/** Whether a stage may start on its own right now (Autoplay on, tab visible, no Workout mode overlay). */
export function canAutoStart(opts: { autoplay: boolean; hidden: boolean; blocked: boolean }): boolean {
  return opts.autoplay && !opts.hidden && !opts.blocked;
}

/** True when a full-screen overlay that owns the screen (Workout mode) is open. */
export function overlayOpen(doc: Pick<Document, "querySelector"> | undefined = typeof document === "undefined" ? undefined : document): boolean {
  return Boolean(doc?.querySelector('[aria-label="Workout mode"][aria-modal="true"]'));
}

/** Play with sound; if the browser refuses, play muted. Resolves to "sound", "muted" or "failed". */
export async function startPlayback(p: PlayablePlayer): Promise<"sound" | "muted" | "failed"> {
  try {
    await p.play();
    return "sound";
  } catch {
    try {
      if (p.setMuted) await p.setMuted(true);
      else await p.setVolume(0);
      await p.play();
      return "muted";
    } catch {
      return "failed";
    }
  }
}

/** Undo a muted start (the "Tap to unmute" chip; the tap is the user gesture the browser wants). */
export async function unmute(p: PlayablePlayer): Promise<void> {
  if (p.setMuted) await p.setMuted(false);
  await p.setVolume(1);
  await p.play().catch(() => {});
}
