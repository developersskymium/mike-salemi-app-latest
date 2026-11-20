/**
 * A day step plays its videos as one playlist: the lesson video first, then
 * every clip in the step's list, in order. When a lesson has no video of its
 * own, its first clip stands in as the lesson video, so that clip is skipped
 * in the queue to avoid playing it twice.
 */
export type StageClip = { title: string; vimeoId: string };

/** "400475380/bd283c1aa1" → "400475380": compare videos regardless of privacy hash. */
export function vimeoBaseId(id: string) {
  return id.split("/")[0].split("?")[0];
}

export function stagePlaylist(
  lessonVimeoId: string,
  clips: StageClip[],
  currentClipId: string | null | undefined,
) {
  const lessonBase = vimeoBaseId(lessonVimeoId);
  const queue = clips.filter((c) => vimeoBaseId(c.vimeoId) !== lessonBase);
  const index = currentClipId ? queue.findIndex((c) => c.vimeoId === currentClipId) : -1;
  const nextClip: StageClip | undefined = queue[index + 1];
  return {
    /** Clips still to play after the lesson video. */
    queue,
    /** What plays after the current video, or undefined when it is the step's last. */
    nextClip,
    /** Clip card to highlight: the playing clip, or the clip the lesson video duplicates. */
    playingClipId:
      currentClipId ?? clips.find((c) => vimeoBaseId(c.vimeoId) === lessonBase)?.vimeoId,
  };
}
