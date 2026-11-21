"use server";

import { ctaFor, getLesson, hasAccess } from "@ms/api";
import { MTK_SLUG, type VideoRef } from "@ms/core";
import { z } from "zod";
import { isPreview, previewLessonFor, programAccess, unlockHref } from "@/lib/access";
import { fixture, MOCK } from "@/lib/mock";
import { offerMoveFor, type OfferPreview } from "@/lib/offer-preview";
import { createClient } from "@/lib/supabase/server";

const PROGRAM = { slug: MTK_SLUG, name: "Mastering the Kettlebell", cover: "/media/covers/mastering-the-kettlebell.jpg" };

type Clip = VideoRef & { title?: string };
type CourseFixture = { lessons: Record<string, { steps: { video: Clip | null }[] }> };

/** First video of a lesson the member can read (row rules hide paid steps without access). */
async function lessonVideo(lessonId: string): Promise<Clip | null> {
  if (MOCK) {
    const f = await fixture<{ videos: Record<string, string> }>("offer-preview");
    const id = f.videos[lessonId];
    if (id) return { providerId: id, privacyHash: null };
    const course = await fixture<CourseFixture>(`course-${MTK_SLUG}`).catch(() => null);
    return course?.lessons[lessonId]?.steps.find((s) => s.video)?.video ?? null;
  }
  try {
    const found = await getLesson(await createClient(), lessonId);
    return found?.steps.find((s) => s.video)?.video ?? null;
  } catch {
    return null;
  }
}

/**
 * The day player's "Watch a preview" popup. Access is re-checked here on the server: with access
 * (or a free-preview lesson) the lesson plays; without it the member gets a glimpse (cover, lock,
 * what they'd learn, price from the access CTA) and the program's free taste when there is one.
 */
export async function offerPreviewAction(exercise: string): Promise<OfferPreview | null> {
  const parsed = z.string().max(160).safeParse(exercise);
  if (!parsed.success) return null;
  try {
    const move = offerMoveFor(parsed.data);
    const access = await programAccess(MTK_SLUG);
    const open = hasAccess(access) || (await isPreview(MTK_SLUG, move.lessonId).catch(() => false));
    const lesson = {
      id: move.lessonId,
      title: move.title,
      section: move.section,
      description: move.description,
      bullets: move.bullets,
      poster: move.photo,
      href: `/programs/${MTK_SLUG}/course/${move.lessonId}`,
    };
    if (open) {
      const video = await lessonVideo(move.lessonId);
      return { mode: "watch", program: PROGRAM, lesson, video, clip: null, price: null, unlockHref: unlockHref(MTK_SLUG) };
    }
    const cta = ctaFor(access);
    const trailerId = await previewLessonFor(MTK_SLUG).catch(() => null);
    const clip = trailerId ? await lessonVideo(trailerId) : null;
    return {
      mode: "glimpse",
      program: PROGRAM,
      lesson,
      video: null,
      clip: clip ? { ...clip, title: "Program walk-through" } : null,
      price: cta.kind === "buy" || cta.kind === "upgrade" || cta.kind === "none" ? { label: cta.label.replace(" — ", ", "), note: cta.note } : null,
      unlockHref: unlockHref(MTK_SLUG, `lesson:${move.lessonId}`),
    };
  } catch {
    return null;
  }
}
