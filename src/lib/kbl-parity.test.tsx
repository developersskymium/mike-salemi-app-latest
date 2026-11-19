import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import original from "./__fixtures__/kbl-original-manifest.json";
import expectedTables from "./__fixtures__/kbl-original-tables.json";
import averageSource from "./__fixtures__/kbl-average-day-source.json";
import { AVERAGE_DAY_ID, averageDaySections } from "@/content/average-day";
import {
  courses,
  dayOrder,
  findDay,
  totalDays,
  totalLessons,
  totalPages,
  type Lesson,
} from "@/content/program";
import { resolveReadiness, WORKOUT_TABLES } from "@/content/readiness-table";
import { LessonNotes } from "@/components/lesson-notes";
import { summarise } from "@/hooks/use-progress";
import { completedCourses, deservedBadgeIds } from "@/lib/achievements";

const normalize = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
const id = (value: string) => value.split("/")[0];

describe("complete KBL source coverage", () => {
  it("preserves all existing lesson IDs and training-day numbers", () => {
    const ids = new Set(dayOrder.flatMap(({ day }) => day.lessons.map((lesson) => lesson.id)));
    for (const previous of original.legacy.lessonIds)
      expect(ids.has(previous), previous).toBe(true);
    for (const previous of original.legacy.days)
      expect(findDay(previous.id)?.day.number, previous.id).toBe(previous.number);
    expect(totalDays).toBe(122);
    expect(totalPages).toBe(134);
    expect(totalLessons).toBe(740);
  });

  it.each(original.pages)(
    "maps every original section and video in $level / post $postId",
    (page) => {
      const location = findDay(page.pageId);
      expect(location, page.pageId).toBeDefined();
      const day = location!.day;
      if (!page.steps.length) {
        expect(day.pageType).toBe("overview");
        expect(day.lessons).toHaveLength(1);
        expect(id(day.lessons[0].vimeoId)).toBe(page.mainVimeoId);
        return;
      }
      const sourceLessons = page.steps.filter((step) => !/let.s begin/i.test(step.title));
      expect(day.lessons).toHaveLength(sourceLessons.length);
      for (const step of page.steps) {
        if (/let.s begin/i.test(step.title)) {
          expect(day.letsBegin?.sourceLessonId).toContain(
            `-${page.postId}-s${step.section.replace("sublesson", "")}`,
          );
          continue;
        }
        const lesson = day.lessons.find((l) => normalize(l.title) === normalize(step.title));
        expect(lesson, `${page.pageId} / ${step.title}`).toBeDefined();
        expect((lesson!.associatedVideos ?? []).map((clip) => id(clip.vimeoId))).toEqual(
          step.clips,
        );
        if (step.mainVimeoIds.length) expect(step.mainVimeoIds).toContain(id(lesson!.vimeoId));
        else if (lesson!.vimeoId) expect(step.clips).toContain(id(lesson!.vimeoId));
      }
    },
  );

  it("contains no placeholder intro and hosts every new schedule illustration", () => {
    for (const course of courses) expect(course.heroVimeoId).not.toBe("76979871");
    for (const { day } of dayOrder)
      for (const lesson of day.lessons) {
        expect(lesson.vimeoId, lesson.id).not.toBe("76979871");
        for (const image of lesson.images ?? [])
          expect(existsSync(resolve("public", image.url.slice(1))), image.url).toBe(true);
      }
  });

  it("retains the source privacy hash when a tutorial is also referenced by its bare numeric ID", () => {
    const halo = dayOrder
      .flatMap(({ day }) => day.lessons.flatMap((lesson) => lesson.associatedVideos ?? []))
      .filter((clip) => id(clip.vimeoId) === "395065982");
    expect(halo.length).toBeGreaterThan(0);
    expect(halo.every((clip) => clip.vimeoId === "395065982/57f01d4d60")).toBe(true);
  });

  it("keeps WordPress navigation and completion controls out of overview content", () => {
    for (const { day } of dayOrder.filter(({ day }) => day.pageType === "overview")) {
      expect(day.lessons[0].notes).not.toMatch(
        /Mark Incomplete|Back to Course|Lesson Complete|Lesson \d+ of|NEXT DAY|PREVIOUS DAY/i,
      );
    }
  });

  it("retains full prose when its first 180 characters are also used as a description", () => {
    const notes =
      "This is a long source paragraph. ".repeat(20) +
      "The final source instruction must remain visible.";
    const lesson = {
      id: "notes-regression",
      title: "Warm Up",
      notes,
      description: notes.slice(0, 180) + "…",
    } as Lesson;
    const html = renderToStaticMarkup(<LessonNotes lesson={lesson} />);
    expect(html).toContain("The final source instruction must remain visible.");
    expect(html).toContain("This is a long source paragraph.");
  });
});

describe("authored exercise prescriptions", () => {
  const plain = (html: string) =>
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  it.each(expectedTables.tables)(
    "preserves every visible exercise cell from source table $id",
    (source) => {
      const table = WORKOUT_TABLES[source.id];
      expect(table).toBeDefined();
      const rows = source.data
        .slice(1)
        .filter((row, index) => source.visibility.rows[index + 1] !== 0 && row[1] !== "#colspan#");
      expect(table.rows).toHaveLength(rows.length);
      rows.forEach((row, index) => {
        expect([
          table.rows[index].exercise,
          table.rows[index].rest,
          table.rows[index].intensity,
          table.rows[index].reps,
          table.rows[index].sets,
          table.rows[index].tempo,
        ]).toEqual(row.slice(1).map(plain));
        expect(table.rows[index].restDir).toBe(/Arrow-mirrored/.test(row[2]) ? "up" : "down");
      });
      const separators = source.data
        .filter((row) => row[1] === "#colspan#")
        .map((row) => plain(row[0]));
      expect((table.separators ?? []).map((s) => s.label)).toEqual(separators);
      for (const image of table.images ?? [])
        expect(existsSync(resolve("public", image.url.slice(1)))).toBe(true);
    },
  );
});

describe("Self Guided average-day source", () => {
  it("retains all original video variants and enables all 15 authored demo clips", () => {
    const sourceId = (url: string) => url.match(/video\/(\d+)/)![1];
    expect(
      averageDaySections
        .filter((section) => section.vimeoId)
        .map((section) => id(section.vimeoId!)),
    ).toEqual(averageSource.mainVideos.map(sourceId));
    const clips = averageDaySections.flatMap((section) => section.clips ?? []);
    expect(clips).toHaveLength(15);
    expect(clips.map((clip) => ({ title: clip.title.trim(), id: id(clip.vimeoId ?? "") }))).toEqual(
      averageSource.clips.map((clip) => ({ title: clip.title!.trim(), id: sourceId(clip.url) })),
    );
  });

  it("resolves the example by workout context despite its alternate Self Guided video", () => {
    const location = findDay(AVERAGE_DAY_ID)!;
    expect(location.course.id).toBe("beginner");
    expect(location.day.type).toBe("Workout III Day");
    expect(location.day.lessons.find((lesson) => lesson.title === "Workout III")!.vimeoId).not.toBe(
      averageDaySections.find((section) => section.id === "workout")!.vimeoId,
    );
    const full = resolveReadiness(
      { tired: "no", recovery: "full", gut: "no", stress: "low", motivation: "high" },
      AVERAGE_DAY_ID,
    );
    expect(full.sourceFormId).toBe(averageSource.formIds[0]);
    expect(full.table?.sourceId).toBe("39");
    const rest = resolveReadiness(
      { tired: "yes", recovery: "none", gut: "yes", stress: "high", motivation: "low" },
      AVERAGE_DAY_ID,
    );
    expect(rest.score).toBe(60);
    expect(rest.outcome).toBe("rest");
    expect(rest.table).toBeNull();
  });
});

describe("student progression and completion", () => {
  const rows = dayOrder.flatMap(({ day, phase }) =>
    day.lessons.map((lesson) => ({
      day_id: day.id,
      phase_id: phase.id,
      lesson_id: lesson.id,
      completed_at: "2026-11-01T12:00:00Z",
    })),
  );
  it("lets a student start either level and requires that level's overview first", () => {
    const s = summarise([]);
    expect(s.dayUnlocked("l1-on-ramp-overview")).toBe(true);
    expect(s.dayUnlocked("l2-on-ramp-overview")).toBe(true);
    expect(s.dayUnlocked("l1-on-ramp-d1")).toBe(false);
    expect(s.dayUnlocked("l2-on-ramp-d1")).toBe(false);
  });
  it("requires restored pages before a level is complete", () => {
    const legacyIds = new Set(original.legacy.lessonIds);
    const s = summarise(rows.filter((row) => legacyIds.has(row.lesson_id)));
    expect(completedCourses(s)).toHaveLength(0);
    expect(s.courseCompletion("beginner").complete).toBe(false);
    expect(s.completedDays).toBe(122);
  });
  it("completes both levels and phase badges after all 740 steps", () => {
    const s = summarise(rows);
    expect(s.allComplete).toBe(true);
    expect(s.percent).toBe(100);
    expect(s.courseCompletion("beginner")).toMatchObject({
      daysTotal: 61,
      pagesTotal: 67,
      lessonsTotal: 369,
      complete: true,
    });
    expect(s.courseCompletion("intermediate")).toMatchObject({
      daysTotal: 61,
      pagesTotal: 67,
      lessonsTotal: 371,
      complete: true,
    });
    expect(completedCourses(s)).toHaveLength(2);
    expect(deservedBadgeIds({ summary: s, streak: 1, toolIdCount: 0, toolTotal: 8 })).toEqual(
      expect.arrayContaining(["on-ramp", "phase-1", "phase-2", "phase-3", "level-1", "level-2"]),
    );
  });
});
