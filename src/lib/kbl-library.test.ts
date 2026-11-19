import { describe, expect, it } from "vitest";
import { libraryVideos } from "@/content/library";
import { findDay } from "@/content/program";
import { kblSourceLibrary } from "./kbl-library";

describe("KBL library on a backend without imported videos", () => {
  it("preserves every imported KBL video and its privacy hash", () => {
    const videos = kblSourceLibrary();
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.map((video) => video.vimeoId)).toEqual(
      libraryVideos.map((video) => video.vimeoId),
    );
  });
  it("links the In the program filter to real days", () => {
    const videos = kblSourceLibrary().filter((video) => video.usedIn.length);
    expect(videos.length).toBeGreaterThan(0);
    for (const video of videos)
      for (const id of video.usedIn) expect(findDay(id), id).toBeDefined();
    expect(kblSourceLibrary().find((video) => video.id === "bodyweight-warm-up")?.usedIn).toContain(
      "l2-on-ramp-d3",
    );
  });
});
