import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSavedVideos, toggleSavedVideo, type SavedVideoRow } from "@/lib/library.functions";

export type { SavedVideoRow };

export function useSavedVideos(enabled = true) {
  const fetchSaved = useServerFn(getSavedVideos);
  const queryClient = useQueryClient();
  const toggle = useServerFn(toggleSavedVideo);

  const query = useQuery({
    queryKey: ["saved-videos"],
    queryFn: () => fetchSaved() as Promise<SavedVideoRow[]>,
    enabled,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (input: { videoId: string; title?: string; slug?: string; saved: boolean }) =>
      toggle({ data: input }),
    // Optimistic — the heart should fill the instant it's tapped.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["saved-videos"] });
      const previous = queryClient.getQueryData<SavedVideoRow[]>(["saved-videos"]);
      queryClient.setQueryData<SavedVideoRow[]>(["saved-videos"], (rows = []) => {
        const without = rows.filter((r) => r.video_id !== input.videoId);
        if (!input.saved) return without;
        return [
          {
            id: `optimistic-${input.videoId}`,
            video_id: input.videoId,
            title: input.title ?? null,
            slug: input.slug ?? null,
            created_at: new Date().toISOString(),
          },
          ...without,
        ];
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["saved-videos"], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["saved-videos"] }),
  });

  const ids = new Set((query.data ?? []).map((r) => r.video_id));

  return {
    rows: query.data ?? [],
    ids,
    isLoading: query.isLoading,
    isSaved: (videoId: string) => ids.has(videoId),
    toggle: (input: { videoId: string; title?: string; slug?: string }) =>
      mutation.mutate({ ...input, saved: !ids.has(input.videoId) }),
  };
}
