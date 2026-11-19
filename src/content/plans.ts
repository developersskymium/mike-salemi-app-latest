/**
 * Downloadable phase plans (PDF) — Self-Guided only.
 * Keyed by course slug.
 *
 * The source program links BOTH levels to the same four PDFs. Their contents
 * are titled "Kettlebell Lifestyle <Phase> Plan" with no level reference, so
 * they are served under neutral names and labelled as shared plans. Durations
 * match the text inside each PDF.
 */

import onRamp from "@/assets/plans/Kettlebell-Lifestyle-On-Ramp-Phase-Plan.pdf.asset.json";
import phaseI from "@/assets/plans/Kettlebell-Lifestyle-Phase-I-Plan.pdf.asset.json";
import phaseII from "@/assets/plans/Kettlebell-Lifestyle-Phase-II-Plan.pdf.asset.json";
import phaseIII from "@/assets/plans/Kettlebell-Lifestyle-Phase-III-Plan.pdf.asset.json";

export type PlanDownload = {
  id: string;
  title: string;
  duration: string;
  summary: string;
  url: string;
  filename: string;
  size: number;
};

export const planDownloads: Record<string, PlanDownload[]> = {
  beginner: [
    {
      id: "on-ramp",
      title: "On Ramp Plan",
      duration: "Approximately 7 days",
      summary: "Get set up, learn the ground rules and ease into the weekly rhythm.",
      url: onRamp.url,
      filename: "Kettlebell-Lifestyle-On-Ramp-Phase-Plan.pdf",
      size: onRamp.size,
    },
    {
      id: "phase-1",
      title: "Phase I Plan",
      duration: "Approximately 14 days",
      summary: "Movement foundations, kettlebell fundamentals and postural awareness.",
      url: phaseI.url,
      filename: "Kettlebell-Lifestyle-Phase-I-Plan.pdf",
      size: phaseI.size,
    },
    {
      id: "phase-2",
      title: "Phase II Plan",
      duration: "Approximately 21 days",
      summary: "Build on the fundamentals with more strength and skill work.",
      url: phaseII.url,
      filename: "Kettlebell-Lifestyle-Phase-II-Plan.pdf",
      size: phaseII.size,
    },
    {
      id: "phase-3",
      title: "Phase III Plan",
      duration: "Approximately 21 days",
      summary: "Bring it together — full sessions, tougher workouts, lasting habits.",
      url: phaseIII.url,
      filename: "Kettlebell-Lifestyle-Phase-III-Plan.pdf",
      size: phaseIII.size,
    },
  ],
  intermediate: [
    {
      id: "on-ramp",
      title: "On Ramp Plan",
      duration: "Approximately 7 days",
      summary: "Re-set your baseline and settle into the weekly training rhythm.",
      url: onRamp.url,
      filename: "Kettlebell-Lifestyle-On-Ramp-Phase-Plan.pdf",
      size: onRamp.size,
    },
    {
      id: "phase-1",
      title: "Phase I Plan",
      duration: "Approximately 14 days",
      summary: "Sharpen technique and start layering in heavier, longer sessions.",
      url: phaseI.url,
      filename: "Kettlebell-Lifestyle-Phase-I-Plan.pdf",
      size: phaseI.size,
    },
    {
      id: "phase-2",
      title: "Phase II Plan",
      duration: "Approximately 21 days",
      summary: "Increase density and complexity across strength and skill work.",
      url: phaseII.url,
      filename: "Kettlebell-Lifestyle-Phase-II-Plan.pdf",
      size: phaseII.size,
    },
    {
      id: "phase-3",
      title: "Phase III Plan",
      duration: "Approximately 21 days",
      summary: "Peak the block — full sessions, tougher workouts, lasting habits.",
      url: phaseIII.url,
      filename: "Kettlebell-Lifestyle-Phase-III-Plan.pdf",
      size: phaseIII.size,
    },
  ],
};


export function coursePlans(slug: string): PlanDownload[] {
  return planDownloads[slug] ?? [];
}

/** Match a phase (id like "beginner-phase-1") to its downloadable plan. */
export function phasePlan(courseSlug: string, phaseId: string): PlanDownload | undefined {
  return coursePlans(courseSlug).find((p) => phaseId.endsWith(p.id));
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "PDF";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
