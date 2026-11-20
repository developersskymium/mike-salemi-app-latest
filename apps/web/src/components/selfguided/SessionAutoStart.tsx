"use client";

import { useEffect } from "react";
import { startSessionAction } from "@/lib/actions/selfguided";

/**
 * Starts (or resumes, within 3 hours) the training session for a day as soon as it is opened.
 * Idempotent on the server; step completions keep it alive and the day's completion is logged
 * automatically, so nothing else is needed to end it.
 */
export function SessionAutoStart({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    void startSessionAction(lessonId);
  }, [lessonId]);
  return null;
}
