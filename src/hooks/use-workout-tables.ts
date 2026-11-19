import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWorkoutTables, type WorkoutTableRow } from "@/lib/achievements.functions";

export function useWorkoutTables(enabled: boolean) {
  const fetchTables = useServerFn(getWorkoutTables);
  return useQuery({
    queryKey: ["workout-tables"],
    queryFn: () => fetchTables() as Promise<WorkoutTableRow[]>,
    enabled,
    staleTime: 30_000,
  });
}
