import { libraryVideos } from "@/content/library";
import { dayOrder } from "@/content/program";

/** Source KBL videos, linked to their actual training days. */
export function kblSourceLibrary() {
  const usage = new Map<string, Set<string>>();
  for (const { day } of dayOrder) {
    for (const lesson of day.lessons) {
      for (const id of [
        lesson.vimeoId,
        ...(lesson.associatedVideos ?? []).map((video) => video.vimeoId),
      ]) {
        if (!id) continue;
        const key = id.split("/")[0];
        if (!usage.has(key)) usage.set(key, new Set());
        usage.get(key)!.add(day.id);
      }
    }
  }
  return libraryVideos.map((video) => ({
    ...video,
    usedIn: [...(usage.get(video.vimeoId.split("/")[0]) ?? [])],
    programs: [] as string[],
  }));
}
