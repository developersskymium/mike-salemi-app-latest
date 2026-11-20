import { describe, expect, it } from "vitest";
import { inlineText, parseInline, parseLessonBody, parseMarkdown, prettyResourceTitle } from "./lesson-body";

describe("parseLessonBody", () => {
  it("splits vimeo clips, downloads and audio out of the body", () => {
    const md = [
      "**KEY POINTS**",
      "",
      "Keep the bell close.",
      "",
      "- [Swing drill](https://vimeo.com/123456789)",
      "[Eagle Breath (Audio Only)](https://programs.mikesalemi.io/x/download/113)",
      "[Checklist.pdf](https://example.com/files/checklist.pdf)",
      "**Resources**",
    ].join("\n");
    const r = parseLessonBody(md);
    expect(r.clips).toEqual([{ title: "Swing drill", providerId: "123456789", privacyHash: null }]);
    expect(r.audio.map((a) => a.title)).toEqual(["Eagle Breath (Audio Only)"]);
    expect(r.files.map((a) => a.url)).toEqual(["https://example.com/files/checklist.pdf"]);
    expect(r.body).toBe("**KEY POINTS**\n\nKeep the bell close.");
  });

  it("uses attachments, de-duplicates and turns legacy mp4 files into the lesson video", () => {
    const r = parseLessonBody(null, [
      { title: "Lesson video (legacy host)", url: "https://cdn.example.com/v_3200k.mp4", kind: "file" },
      { title: "Hear In 10 min", url: "https://cdn.example.com/Hear_In_10_min.mp3", kind: "audio" },
      { title: "Pre-Retreat Playlist (Spotify)", url: "https://open.spotify.com/playlist/x", kind: "link" },
      { title: "Hear In 10 min", url: "https://cdn.example.com/Hear_In_10_min.mp3", kind: "audio" },
    ]);
    expect(r.directVideo?.url).toBe("https://cdn.example.com/v_3200k.mp4");
    expect(r.audio).toHaveLength(1);
    expect(r.files).toEqual([{ title: "Pre-Retreat Playlist (Spotify)", url: "https://open.spotify.com/playlist/x", kind: "link" }]);
  });

  it("keeps images out of the resource list", () => {
    const r = parseLessonBody("![cover](/media/ext/a/cover.pdf)");
    expect(r.files).toHaveLength(0);
  });
});

describe("markdown", () => {
  it("parses blocks with the bold-only lead rule", () => {
    const b = parseMarkdown("**How-To**\n\n1. Set the root\n2. Wrap the fingers\n\n- one\n- two\n\n> quote\n\n---\n\n## Title");
    expect(b.map((x) => x.t)).toEqual(["lead", "ol", "ul", "quote", "hr", "h"]);
  });

  it("drops unsafe links but keeps their text", () => {
    const c = parseInline("go [here](javascript:alert(1)) or [there](https://a.com)");
    expect(c.some((n) => n.t === "link" && n.href.startsWith("javascript"))).toBe(false);
    expect(inlineText(c)).toContain("here");
  });

  it("does not treat snake_case as emphasis", () => {
    expect(parseInline("file_name_here").every((n) => n.t === "text")).toBe(true);
  });

  it("parses pipe tables", () => {
    const b = parseMarkdown("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(b[0]!.t).toBe("table");
  });

  it("prettifies resource titles", () => {
    expect(prettyResourceTitle("Download: Fillable_Workout Log.pdf")).toBe("Fillable Workout Log");
    expect(prettyResourceTitle("Eagle Breath (Audio Only)")).toBe("Eagle Breath");
  });
});
