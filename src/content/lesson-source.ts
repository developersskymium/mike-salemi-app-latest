/**
 * Real lesson content parsed out of the legacy WordPress / Elementor export.
 *
 * Each WordPress "lesson" post contains a series of `<section id="sublessonX">`
 * blocks. The parser pulled, per section: the heading, the text-editor copy,
 * any shift-table / Gravity Form marker, the main Vimeo iframe and every
 * associated lightbox video.
 */

import raw from "./lesson-source.json";

export type AssociatedVideo = {
  video_title: string;
  vimeo_url: string;
};

export type Sublesson = {
  sublesson_index: number;
  sublesson_title: string;
  content_text: string;
  table_or_form_id: string | null;
  main_vimeo_url: string | null;
  associated_videos: AssociatedVideo[];
};

export type SourcePost = {
  post_id: number;
  post_slug: string;
  post_title: string;
  sublessons: Sublesson[];
};

export const sourcePosts = raw as SourcePost[];

/** Extract the numeric Vimeo id from any player / lightbox URL. */
export function vimeoIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(\d{6,})/);
  return match ? match[1] : null;
}

/** Sections that are page chrome in WordPress rather than real lessons. */
const CHROME_TITLES = new Set(["let's begin", "completion", "next steps"]);

export function isChromeSection(sublesson: Sublesson) {
  return CHROME_TITLES.has(sublesson.sublesson_title.trim().toLowerCase());
}

/**
 * Day mapping.
 *
 * The export carries no course/phase field. Posts whose title is numbered
 * ("Day 41 – Workout I Day") belong to Level I at that exact day number.
 * The remaining posts are the Level II mirror set and are laid down in
 * publication order (ascending post id) from day 1.
 */
export type SourceMap = Map<number, SourcePost>;

function numberedDay(post: SourcePost): number | null {
  const match = post.post_title.match(/Day\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

const levelOne: SourceMap = new Map();
const levelTwo: SourceMap = new Map();

{
  const rest: SourcePost[] = [];
  for (const post of sourcePosts) {
    if (!post.sublessons.length) continue;
    const day = numberedDay(post);
    if (day && !levelOne.has(day)) levelOne.set(day, post);
    else rest.push(post);
  }
  rest.sort((a, b) => a.post_id - b.post_id);
  rest.forEach((post, i) => levelTwo.set(i + 1, post));
}

export const sourceByCourse: Record<string, SourceMap> = {
  l1: levelOne,
  l2: levelTwo,
};

export function sourceForDay(courseKey: string, dayNumber: number): SourcePost | undefined {
  return sourceByCourse[courseKey]?.get(dayNumber);
}
