import { useEffect, useRef } from "react";
import { celebrate } from "@/components/celebrate";
import { courses, dayOrder } from "@/content/program";
import { summarise, useProgress } from "@/hooks/use-progress";
import { useSession } from "@/hooks/use-session";

const STORE_KEY = "kbl:milestones-seen";

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify([...seen]));
  } catch {
    /* storage unavailable — celebrations simply repeat next session */
  }
}

/**
 * Watches progress from anywhere in the app and escalates phase / level /
 * program completions into a full-screen celebration exactly once each.
 *
 * The day screen already celebrates the moment you tick the final lesson; this
 * is the safety net for progress made on any other surface (self-guided,
 * auto-complete from a finished video, another device) so a milestone is never
 * silently skipped.
 */
export function useMilestoneWatch() {
  const { user } = useSession();
  const { data } = useProgress(Boolean(user));
  const primed = useRef(false);

  useEffect(() => {
    if (!user || !data) return;
    const s = summarise(data);
    const seen = readSeen();
    let changed = false;

    const fire = (id: string, payload: Parameters<typeof celebrate>[0]) => {
      if (seen.has(id)) return;
      seen.add(id);
      changed = true;
      // Never replay history the first time a signed-in session hydrates.
      if (primed.current) celebrate(payload);
    };

    for (const course of courses) {
      // Phase completion is deliberately not celebrated.



      if (s.courseCompletion(course.id).complete) {
        fire(`level:${course.id}`, {
          id: `level-${course.id}`,
          eyebrow: "Level complete",
          title: `${course.title} is done`,
          body: "Every phase, every day, every lesson. Your certificate is ready to claim.",
          action: { label: "Get your certificate", to: "/certificate/$courseId", params: { courseId: course.id } },
        });
      }
    }

    if (s.allComplete) {
      fire("program:kbl", {
        id: "program-kbl",
        eyebrow: "Program complete",
        title: "You finished Kettlebell Lifestyle",
        body: "Every level, every phase, every day. Claim your certificates, or restart a level to run it again.",
      });
    }

    if (changed) writeSeen(seen);
    primed.current = true;
  }, [user, data]);
}
