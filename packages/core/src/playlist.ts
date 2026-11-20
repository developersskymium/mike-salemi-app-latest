/**
 * A step plays its videos as one playlist: the lesson (step) video first, then
 * every clip in order. A clip that duplicates the step video is skipped in the
 * queue so it never plays twice. Port of legacy src/lib/stage-playlist.ts.
 */
import type { Step, VideoRef } from "./types";

export type Clip = VideoRef & { title: string };

/** Fraction of a video that counts as watched. */
export const WATCHED_RATIO = 0.9;

/** True once `seconds` reaches 95% of `duration`. Unknown/zero duration never counts. */
export function isWatched(seconds: number, duration: number | null | undefined): boolean {
  if (!duration || !Number.isFinite(duration) || duration <= 0) return false;
  return seconds >= duration * WATCHED_RATIO;
}

/** Compare videos regardless of privacy hash. */
export function sameVideo(a: Pick<VideoRef, "providerId"> | null | undefined, b: Pick<VideoRef, "providerId"> | null | undefined) {
  return Boolean(a && b && a.providerId === b.providerId);
}

export interface StagePlaylist {
  /** The video the stage opens with: the step video, or its first clip when it has none. */
  lead: VideoRef | null;
  /** Clips still to play after the lead video. */
  queue: Clip[];
  /** What plays after the current video, or undefined when it is the step's last. */
  nextClip: Clip | undefined;
  /** Clip card to highlight: the playing clip, or the clip the lead video duplicates. */
  playingClipId: string | undefined;
}

/**
 * @param currentClipId providerId of the clip playing now; null while the lead video plays.
 */
export function stagePlaylist(step: Pick<Step, "video" | "clips">, currentClipId: string | null | undefined): StagePlaylist {
  const clips = step.clips ?? [];
  const lead = step.video ?? clips[0] ?? null;
  const queue = lead ? clips.filter((c) => !sameVideo(c, lead)) : clips;
  const index = currentClipId ? queue.findIndex((c) => c.providerId === currentClipId) : -1;
  return {
    lead,
    queue,
    nextClip: queue[index + 1],
    playingClipId: currentClipId ?? clips.find((c) => sameVideo(c, lead))?.providerId,
  };
}

/** Shorthand: what plays after `currentClipId` (null = after the lead video). */
export function nextClip(step: Pick<Step, "video" | "clips">, currentClipId: string | null | undefined): Clip | undefined {
  return stagePlaylist(step, currentClipId).nextClip;
}

/** Shorthand: which clip card to highlight. */
export function playingClipId(step: Pick<Step, "video" | "clips">, currentClipId: string | null | undefined): string | undefined {
  return stagePlaylist(step, currentClipId).playingClipId;
}
