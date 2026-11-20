import { describe, expect, it } from "vitest";
import { isWatched, nextClip, playingClipId, stagePlaylist, WATCHED_RATIO } from "./playlist";

const clips = [
  { title: "Romanian Deadlift", providerId: "111", privacyHash: "aaa" },
  { title: "Squat", providerId: "222", privacyHash: "bbb" },
  { title: "Halo", providerId: "333", privacyHash: "ccc" },
];
const step = (video: { providerId: string; privacyHash?: string } | null, list = clips) => ({ video, clips: list });

describe("stage playlist", () => {
  it("plays the lesson video, then each clip, then ends the step", () => {
    expect(nextClip(step({ providerId: "999" }), null)?.title).toBe("Romanian Deadlift");
    expect(nextClip(step({ providerId: "999" }), "111")?.title).toBe("Squat");
    expect(nextClip(step({ providerId: "999" }), "333")).toBeUndefined();
  });

  it("skips the clip that the lesson video already is, regardless of privacy hash", () => {
    const s = step({ providerId: "111", privacyHash: "different" });
    expect(nextClip(s, null)?.title).toBe("Squat");
    expect(playingClipId(s, null)).toBe("111");
    expect(nextClip(s, "111")?.title).toBe("Squat");
  });

  it("uses the first clip as the lead when the step has no video of its own", () => {
    const p = stagePlaylist(step(null), null);
    expect(p.lead?.providerId).toBe("111");
    expect(p.queue.map((c) => c.title)).toEqual(["Squat", "Halo"]);
  });

  it("a single-video step ends after its video", () => {
    expect(nextClip(step({ providerId: "999" }, []), null)).toBeUndefined();
    expect(stagePlaylist(step(null, []), null).lead).toBeNull();
  });

  it("plays every video exactly once", () => {
    for (const lead of [{ providerId: "999" }, { providerId: "222" }, null]) {
      const s = step(lead);
      const played = [stagePlaylist(s, null).lead!.providerId];
      let current: string | null = null;
      for (;;) {
        const n = nextClip(s, current);
        if (!n) break;
        played.push(n.providerId);
        current = n.providerId;
      }
      expect(new Set(played).size).toBe(played.length);
      expect(new Set([...played, ...clips.map((c) => c.providerId)]).size).toBe(played.length);
    }
  });
});

describe("watched", () => {
  it("counts 95% as watched", () => {
    expect(WATCHED_RATIO).toBe(0.95);
    expect(isWatched(95, 100)).toBe(true);
    expect(isWatched(94.9, 100)).toBe(false);
    expect(isWatched(10, 0)).toBe(false);
    expect(isWatched(10, null)).toBe(false);
  });
});
