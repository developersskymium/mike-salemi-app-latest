import { ReadinessAssessment, WorkoutCircuitPanel, dayHasReadiness } from "@/components/readiness";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dayLabel, type DayLocation } from "@/content/program";

/** The session sheet uses the same source assessment and tables as the lesson. */
export function WorkoutTableSheet({
  location,
  open,
  onClose,
}: {
  location: DayLocation;
  open: boolean;
  onClose: () => void;
}) {
  const assessment = location.day.lessons.find((lesson) => lesson.special === "readiness");
  const workout = location.day.lessons.find((lesson) => lesson.special === "workout");
  const hasAssessment = dayHasReadiness(location);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session plan · {dayLabel(location.day)}</DialogTitle>
          <DialogDescription>
            {location.course.level} · {location.phase.label} · The workout from your KBL program.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {assessment && <ReadinessAssessment location={location} lessonId={assessment.id} />}
          {workout && (hasAssessment || workout.tableId) ? (
            <WorkoutCircuitPanel location={location} lesson={workout} />
          ) : (
            <p className="text-sm leading-relaxed text-foreground">
              Follow this session’s video and written instructions. No separate workout table is
              included for this session.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
