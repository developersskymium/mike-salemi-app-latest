import { describe, expect, it } from "vitest";
import { stagePlaylist } from "@/lib/stage-playlist";
import { courses } from "@/content/program";

const clips = [
  { title: "Romanian Deadlift", vimeoId: "111/aaa" },
  { title: "Squat", vimeoId: "222/bbb" },
  { title: "Halo", vimeoId: "333/ccc" },
];

describe("stage playlist", () => {
  it("plays the lesson video, then each clip, then ends the step", () => {
    expect(stagePlaylist("999/zzz", clips, null).nextClip?.title).toBe("Romanian Deadlift");
    expect(stagePlaylist("999/zzz", clips, "111/aaa").nextClip?.title).toBe("Squat");
    expect(stagePlaylist("999/zzz", clips, "333/ccc").nextClip).toBeUndefined();
  });

  it("skips the clip that the lesson video already is", () => {
    const p = stagePlaylist("111/aaa", clips, null);
    expect(p.nextClip?.title).toBe("Squat");
    expect(p.playingClipId).toBe("111/aaa");
    // Picking that clip by hand still continues with the next one.
    expect(stagePlaylist("111/aaa", clips, "111/aaa").nextClip?.title).toBe("Squat");
  });

  it("a single-video step ends after its video", () => {
    expect(stagePlaylist("999/zzz", [], null).nextClip).toBeUndefined();
  });

  it("every KBL step plays each of its videos exactly once", () => {
    for (const course of courses)
      for (const phase of course.phases)
        for (const day of phase.days)
          for (const lesson of day.lessons) {
            if (!lesson.vimeoId) continue;
            const list = lesson.associatedVideos ?? [];
            const played = [lesson.vimeoId.split("/")[0]];
            let current: string | null = null;
            for (;;) {
              const { nextClip } = stagePlaylist(lesson.vimeoId, list, current);
              if (!nextClip) break;
              played.push(nextClip.vimeoId.split("/")[0]);
              current = nextClip.vimeoId;
            }
            const expected = new Set([played[0], ...list.map((c) => c.vimeoId.split("/")[0])]);
            expect(played.length, lesson.id).toBe(expected.size);
          }
  });
});
