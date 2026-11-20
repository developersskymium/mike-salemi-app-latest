import { describe, expect, it } from "vitest";
import { embedUrl, idHue, oembedUrl, parseVimeo, vimeoKey, watchUrl } from "./vimeo";

describe("parseVimeo", () => {
  it.each([
    ["400475380", "400475380", null],
    ["400475380/bd283c1aa1", "400475380", "bd283c1aa1"],
    [" 400475380 ", "400475380", null],
    [400475380, "400475380", null],
    ["https://vimeo.com/400475380", "400475380", null],
    ["https://vimeo.com/400475380/bd283c1aa1", "400475380", "bd283c1aa1"],
    ["vimeo.com/400475380/bd283c1aa1?share=copy", "400475380", "bd283c1aa1"],
    ["https://player.vimeo.com/video/400475380?h=bd283c1aa1&badge=0", "400475380", "bd283c1aa1"],
    ["https://player.vimeo.com/video/400475380", "400475380", null],
    ["https://vimeo.com/channels/staffpicks/400475380", "400475380", null],
    ["https://vimeo.com/showcase/123/video/400475380", "400475380", null],
    ["https://vimeo.com/groups/kb/videos/400475380", "400475380", null],
  ])("%s", (input, providerId, privacyHash) => {
    expect(parseVimeo(input)).toEqual({ providerId, privacyHash });
  });
  it("rejects non-Vimeo or id-less input", () => {
    expect(parseVimeo("")).toBeNull();
    expect(parseVimeo(null)).toBeNull();
    expect(parseVimeo("https://youtube.com/watch?v=123")).toBeNull();
    expect(parseVimeo("https://vimeo.com/about")).toBeNull();
    expect(parseVimeo("not a video")).toBeNull();
  });
});

describe("embed URLs", () => {
  const ref = { providerId: "400475380", privacyHash: "bd283c1aa1" };
  it("matches the legacy embed parameters", () => {
    expect(embedUrl(ref)).toBe("https://player.vimeo.com/video/400475380?api=1&dnt=1&title=0&byline=0&portrait=0&h=bd283c1aa1");
    expect(embedUrl({ providerId: "1" }, { autoplay: true })).toBe(
      "https://player.vimeo.com/video/1?api=1&dnt=1&title=0&byline=0&portrait=0&autoplay=1",
    );
    expect(embedUrl(ref, { bare: true, autoplay: true })).toBe(
      "https://player.vimeo.com/video/400475380?api=1&dnt=1&controls=0&title=0&byline=0&portrait=0&playsinline=1&transparent=0&h=bd283c1aa1&autoplay=1&muted=0",
    );
    expect(embedUrl(ref, { startAt: 61.7 })).toMatch(/#t=61s$/);
  });
  it("builds watch, oEmbed and key forms", () => {
    expect(watchUrl(ref)).toBe("https://vimeo.com/400475380/bd283c1aa1");
    expect(oembedUrl(ref)).toBe("https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F400475380%2Fbd283c1aa1");
    expect(vimeoKey(ref)).toBe("400475380/bd283c1aa1");
    expect(vimeoKey({ providerId: "1" })).toBe("1");
    expect(idHue("400475380")).toBe(idHue("400475380"));
    expect(idHue("abc")).toBeLessThan(360);
  });
});
