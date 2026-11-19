import { describe, expect, it, vi } from "vitest";
import { purgeAppCaches } from "./app-cache";

describe("release cache purge", () => {
  it("deletes only KBL runtime caches and preserves login and progress storage", async () => {
    const values = new Map([
      ["sb-session", "signed-in"],
      ["training-progress", "saved"],
    ]);
    const cacheStore = { delete: vi.fn(async (_name: string) => true) };
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    expect(await purgeAppCaches(cacheStore, storage)).toBe(true);
    expect(cacheStore.delete.mock.calls.map((call) => call[0])).toEqual([
      "kbl-pages",
      "kbl-assets",
      "kbl-images",
      "kbl-vimeo-thumbs",
    ]);
    expect(values.get("sb-session")).toBe("signed-in");
    expect(values.get("training-progress")).toBe("saved");
    cacheStore.delete.mockClear();
    expect(await purgeAppCaches(cacheStore, storage)).toBe(false);
    expect(cacheStore.delete).not.toHaveBeenCalled();
  });
  it("purges caches when local storage is unavailable", async () => {
    const cacheStore = { delete: vi.fn(async () => false) };
    expect(await purgeAppCaches(cacheStore)).toBe(true);
    expect(cacheStore.delete).toHaveBeenCalledTimes(4);
  });
  it("retries next load after an unsuccessful purge", async () => {
    const cacheStore = {
      delete: vi.fn(async () => {
        throw new Error("unavailable");
      }),
    };
    const storage = { getItem: () => null, setItem: vi.fn() };
    expect(await purgeAppCaches(cacheStore, storage)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
