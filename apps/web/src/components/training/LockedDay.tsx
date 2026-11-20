import { AmbientBackdrop, Button, Glass, Icon, IconButton } from "@/components/ui";
import { DayGlyph } from "@/components/graphics";
import type { LessonPageData } from "@/lib/loaders/training";
import { currentFrom, dayGlyph, lessonHref, lessonLabel, lessonName } from "./model";
import "./training.css";

/** Immersion runs in order: a friendly locked screen with the way forward. */
export function LockedDay({ data, reason = "order" }: { data: LessonPageData; reason?: "order" | "access" }) {
  const { program, lesson, path, section, outline, progress } = data;
  const word = program.lessonLabel || "Day";
  const current = currentFrom(outline, progress);
  const programHref = `/programs/${program.slug}${path?.key ? `?path=${path.key}` : ""}`;
  const image = lesson.image ?? program.media[0]?.url ?? null;
  return (
    <div className="trn-locked">
      {image && <AmbientBackdrop src={image} fixed className="trn-ambient" />}
      <div className="trn-prog-top">
        <IconButton icon="back" label={`Back to ${program.name}`} href={programHref} />
      </div>
      <Glass radius="hero" className="trn-locked-card">
        <span className="trn-locked-badge" aria-hidden>
          <DayGlyph type={dayGlyph(lesson.dayType, lesson.pageType)} size={44} strokeWidth={1.4} tone="mono" />
          <i>
            <Icon name="lock" size="xs" />
          </i>
        </span>
        <p className="lq-t13 lq-c2 trn-eyebrow">
          {[path?.shortName, section.title].filter(Boolean).join(" · ")}
        </p>
        <h1 className="lq-t28">
          {lessonLabel(lesson, word)} {reason === "access" ? "is part of the program" : "opens soon"}
        </h1>
        <p className="lq-t15 lq-c2">
          {reason === "access"
            ? `${lessonName(lesson)} is included with a membership or ${program.name}.`
            : `Immersion runs in order, so ${lessonLabel(lesson, word)} opens when you finish the days before it. Want to look ahead? Self-Guided has every day open.`}
        </p>
        <div className="trn-locked-actions">
          {reason === "access" ? (
            <Button block icon="lock" href={`/explore/${program.slug}`}>
              See ways to unlock
            </Button>
          ) : (
            <>
              {current && (
                <Button block icon="play" href={lessonHref(program.slug, current.key, current.id)}>
                  Go to {lessonLabel(current, word)}
                </Button>
              )}
              <Button block variant="glass" icon="compass" href={lessonHref(program.slug, lesson.key, lesson.id, "self_guided")}>
                Open in Self-Guided
              </Button>
            </>
          )}
        </div>
      </Glass>
    </div>
  );
}
