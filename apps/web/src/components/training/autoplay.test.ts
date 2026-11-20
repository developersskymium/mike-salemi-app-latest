import { describe, expect, it, vi } from "vitest";
import { embedUrl } from "../../../../../packages/core/src/vimeo";
import { canAutoStart, overlayOpen, startPlayback, unmute } from "./autoplay";

const fakePlayer = (refuseSound: boolean) => {
  let muted = false;
  return {
    play: vi.fn(async () => {
      if (refuseSound && !muted) throw Object.assign(new Error("blocked"), { name: "NotAllowedError" });
    }),
    setMuted: vi.fn(async (m: boolean) => {
      muted = m;
    }),
    setVolume: vi.fn(async () => {}),
  };
};

describe("day player autoplay", () => {
  it("starts only when Autoplay is on, the tab is visible and Workout mode is closed", () => {
    expect(canAutoStart({ autoplay: true, hidden: false, blocked: false })).toBe(true);
    expect(canAutoStart({ autoplay: false, hidden: false, blocked: false })).toBe(false);
    expect(canAutoStart({ autoplay: true, hidden: true, blocked: false })).toBe(false);
    expect(canAutoStart({ autoplay: true, hidden: false, blocked: true })).toBe(false);
  });

  it("detects the Workout mode overlay", () => {
    expect(overlayOpen({ querySelector: () => null } as never)).toBe(false);
    expect(overlayOpen({ querySelector: (q: string) => (q.includes("Workout mode") ? ({} as Element) : null) } as never)).toBe(true);
  });

  it("plays with sound when allowed", async () => {
    const p = fakePlayer(false);
    expect(await startPlayback(p)).toBe("sound");
    expect(p.play).toHaveBeenCalledTimes(1);
    expect(p.setMuted).not.toHaveBeenCalled();
  });

  it("falls back to muted when sound is refused, and unmutes on tap", async () => {
    const p = fakePlayer(true);
    expect(await startPlayback(p)).toBe("muted");
    expect(p.setMuted).toHaveBeenCalledWith(true);
    expect(p.play).toHaveBeenCalledTimes(2);
    await unmute(p);
    expect(p.setMuted).toHaveBeenLastCalledWith(false);
    expect(p.setVolume).toHaveBeenLastCalledWith(1);
  });

  it("the stage embed asks Vimeo to autoplay", () => {
    expect(embedUrl({ providerId: "123", privacyHash: null }, { autoplay: true, startAt: 0 })).toContain("autoplay=1");
  });
});
