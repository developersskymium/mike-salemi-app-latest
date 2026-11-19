import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { celebrate } from "@/components/celebrate";
import { badgeById } from "@/content/badges";
import { courses } from "@/content/program";
import { tools } from "@/content/tools";
import { getToolResults } from "@/lib/progress.functions";
import { awardBadges, getAchievements, issueCertificate } from "@/lib/achievements.functions";
import { completedCourses, computeStreakFromRows, deservedBadgeIds } from "@/lib/achievements";
import { summarise, useProgress } from "@/hooks/use-progress";
import { useSession } from "@/hooks/use-session";

/**
 * Awards badges + certificates the moment they are earned, anywhere in the app,
 * and celebrates them with a toast. Mounted once inside the authenticated shell.
 */
export function useAchievementSync() {
  const { user } = useSession();
  const enabled = Boolean(user);
  const queryClient = useQueryClient();

  const fetchAchievements = useServerFn(getAchievements);
  const fetchResults = useServerFn(getToolResults);
  const award = useServerFn(awardBadges);
  const issue = useServerFn(issueCertificate);

  const { data: progress } = useProgress(enabled);
  const achievements = useQuery({
    queryKey: ["achievements"],
    queryFn: () => fetchAchievements(),
    enabled,
    staleTime: 30_000,
  });
  const results = useQuery({
    queryKey: ["tool-results"],
    queryFn: () => fetchResults(),
    enabled,
    staleTime: 60_000,
  });

  const summary = summarise(progress);
  const streak = useMemo(() => computeStreakFromRows(progress), [progress]);

  const deserved = useMemo(
    () =>
      deservedBadgeIds({
        summary,
        streak,
        toolIdCount: new Set((results.data ?? []).map((r) => r.tool_id)).size,
        toolTotal: tools.length,
      }),
    // summary is derived fresh each render; key off its primitive parts
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [summary.completedCount, summary.completedDays, streak, results.data],
  );

  const earnedIds = useMemo(
    () => new Set((achievements.data?.badges ?? []).map((b) => b.badge_id)),
    [achievements.data],
  );

  const missing = deserved.filter((id) => !earnedIds.has(id));
  const inFlight = useRef<string>("");
  const firstSync = useRef(true);

  const awardMutation = useMutation({
    mutationFn: (ids: string[]) => award({ data: { badgeIds: ids } }),
    onSuccess: (_res, ids) => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      // Don't spam on the very first load of an existing account.
      if (firstSync.current) return;
      for (const id of ids) {
        const badge = badgeById(id);
        if (!badge) continue;
        toast.success(`Badge unlocked — ${badge.name}`, {
          description: badge.description,
          icon: <Trophy className="h-4 w-4 text-primary" />,
          duration: 6000,
        });
      }
    },
  });

  const certificateMutation = useMutation({
    mutationFn: (input: { courseId: string; title: string }) => issue({ data: input }),
    onSuccess: (_res, input) => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      celebrate({
        id: `certificate-${input.courseId}`,
        eyebrow: "Certificate awarded",
        title: input.title,
        body: "You finished every phase, day and lesson of this level. The certificate is yours to view, print or save.",
        action: { label: "View certificate", to: "/certificate/$courseId", params: { courseId: input.courseId } },
      });
    },
  });

  // Badges
  useEffect(() => {
    if (!enabled || achievements.isLoading) return;
    const key = missing.join(",");
    if (!key || inFlight.current === key || awardMutation.isPending) {
      if (!key) firstSync.current = false;
      return;
    }
    inFlight.current = key;
    awardMutation.mutate(missing);
    // Any later award is a genuine live unlock.
    const timer = window.setTimeout(() => {
      firstSync.current = false;
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, achievements.isLoading, missing.join(",")]);

  // Certificates — one per fully completed course.
  useEffect(() => {
    if (!enabled || achievements.isLoading || certificateMutation.isPending) return;
    const held = new Set((achievements.data?.certificates ?? []).map((c) => c.course_id));
    const next = completedCourses(summary).find((c) => !held.has(c.id));
    if (!next) return;
    certificateMutation.mutate({
      courseId: next.id,
      title: `Kettlebell Lifestyle — ${next.title}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, achievements.isLoading, achievements.data, summary.completedDays]);

  const earnedAt = Object.fromEntries(
    (achievements.data?.badges ?? []).map((b) => [b.badge_id, b.earned_at as string]),
  );

  return { deserved, earnedIds, earnedAt, certificates: achievements.data?.certificates ?? [], streak };
}

export const allCourses = courses;
