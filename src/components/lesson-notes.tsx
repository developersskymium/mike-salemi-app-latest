import type { Lesson } from "@/content/program";

/** Keep every authored paragraph. A shortened description must never suppress its full notes. */
function lessonNoteLines(lesson: Pick<Lesson, "title" | "notes">) {
  const title = lesson.title.trim().toLocaleLowerCase();
  return (lesson.notes ?? "")
    .replace(/^NOTES:\s*/i, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && line.toLocaleLowerCase() !== title);
}

export function LessonNotes({ lesson }: { lesson: Lesson }) {
  const lines = lessonNoteLines(lesson);
  if (!lines.length && !lesson.images?.length && !lesson.links?.length) return null;
  return (
    <div className="space-y-4" data-lesson-notes={lesson.id}>
      {lines.length > 0 && (
        <div className="space-y-3">
          {lines.map((line, index) => (
            <p key={index} className="max-w-prose text-sm leading-relaxed text-foreground">
              {line}
            </p>
          ))}
        </div>
      )}
      {lesson.images?.map((image) => (
        <a
          key={image.url}
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={image.url}
            alt={image.alt}
            loading="lazy"
            className="h-auto max-w-full rounded-xl border border-border bg-white"
          />
          <span className="mt-2 block text-xs text-primary">
            Open full-size {image.alt.toLowerCase()}
          </span>
        </a>
      ))}
      {lesson.links?.map((link) => (
        <a
          key={link.url}
          href={link.url}
          className="inline-flex rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
