import type { LibraryVideo } from "@ms/api";

export type LibraryQueryInput = { q?: string; tags?: string[]; program?: string | null; saved?: boolean };

/** Same matching rules as `library_videos` (title/description text, all tags, program); used for instant search too. */
export function filterVideos(videos: LibraryVideo[], q: LibraryQueryInput): LibraryVideo[] {
  const words = (q.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return videos.filter((v) => {
    if (q.saved && !v.saved) return false;
    if (q.program && !v.programs.some((p) => p.id === q.program || p.slug === q.program)) return false;
    if (q.tags?.length && !q.tags.every((t) => v.tags.some((x) => x.slug === t || `${x.namespace}:${x.slug}` === t))) return false;
    if (words.length) {
      const hay = `${v.title} ${v.description ?? ""} ${v.tags.map((t) => t.name).join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    }
    return true;
  });
}

