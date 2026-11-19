import { useMemo, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, VideoOff } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { ContextBar } from "@/components/page-kit";
import { VimeoPlayer } from "@/components/VimeoPlayer";
import { buttonStyles } from "@/components/ui-kit";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useProgress, useSetLessonProgress } from "@/hooks/use-progress";
import { useSession } from "@/hooks/use-session";
import { MTK_COURSE_ID, findMtkModule, mtkModules } from "@/content/mtk";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mtk/$moduleSlug")({
  // Legacy: MTK now lives in the shared database-driven course viewer.
  beforeLoad: () => {
    throw redirect({ to: "/courses/$courseSlug", params: { courseSlug: "mastering-the-kettlebell" }, replace: true });
  },
  head: ({ params }) => {
    const module = findMtkModule(params.moduleSlug);
    const title = module ? `${module.title} — Mastering the Kettlebell` : "Module — Mastering the Kettlebell";
    const description = module?.blurb ?? "A module from the Mastering the Kettlebell technique course.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "video.other" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: MtkModulePage,
});

function MtkModulePage() {
  const { moduleSlug } = Route.useParams();
  const module = findMtkModule(moduleSlug);
  const navigate = useNavigate();
  const { user } = useSession();
  const { has } = useEntitlements();
  const { data: progress } = useProgress(Boolean(user));
  const setProgress = useSetLessonProgress();
  const [index, setIndex] = useState(0);

  const done = useMemo(
    () => new Set((progress ?? []).filter((r) => r.day_id.startsWith("mtk-")).map((r) => r.lesson_id)),
    [progress],
  );

  if (!module) {
    return (
      <AppShell>
        <Container className="section">
          <p className="text-sm text-muted-foreground">That module does not exist.</p>
          <Link to="/mtk" className={cn(buttonStyles.outline, "mt-4")}>
            Back to the course
          </Link>
        </Container>
      </AppShell>
    );
  }

  if (!has(MTK_COURSE_ID)) {
    return (
      <AppShell>
        <Container className="section">
          <h1 className="title-page text-foreground">Locked</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Unlock Mastering the Kettlebell to open this module.
          </p>
          <Link to="/mtk" className={cn(buttonStyles.primary, "mt-6")}>
            See access options
          </Link>
        </Container>
      </AppShell>
    );
  }

  // The page instance is reused across modules, so clamp a stale index from the previous module.
  const safeIndex = Math.min(index, module.lessons.length - 1);
  if (safeIndex !== index) setIndex(safeIndex);
  const lesson = module.lessons[safeIndex];
  const moduleIndex = mtkModules.findIndex((m) => m.id === module.id);
  const nextModule = mtkModules[moduleIndex + 1];
  const completed = done.has(lesson.id);
  const moduleDone = module.lessons.filter((l) => done.has(l.id)).length;

  function toggle(value: boolean) {
    setProgress.mutate({
      phaseId: `mtk-${module!.id}`,
      dayId: `mtk-${module!.id}`,
      lessonId: lesson.id,
      completed: value,
    });
  }

  function advance() {
    if (!completed) toggle(true);
    if (index < module!.lessons.length - 1) setIndex(index + 1);
    else if (nextModule) navigate({ to: "/mtk/$moduleSlug", params: { moduleSlug: nextModule.slug } });
    else navigate({ to: "/mtk" });
  }

  return (
    <AppShell>
      <ContextBar
        backTo="/mtk"
        backLabel="Back to Mastering the Kettlebell"
        title={module.title}
        meta={`Lesson ${index + 1} of ${module.lessons.length} · ${moduleDone} complete`}
        progress={Math.round((moduleDone / module.lessons.length) * 100)}
      />

      <Container className="animate-page grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          {lesson.vimeoId ? (
            <VimeoPlayer
              key={lesson.id}
              vimeoId={lesson.vimeoId}
              title={lesson.title}
              resumeKey={`mtk-${lesson.id}`}
              onWatched={() => !completed && toggle(true)}
            />
          ) : (
            <div className="grid aspect-video place-items-center rounded-3xl border border-hairline bg-surface/50 text-center">
              <div>
                <VideoOff className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold text-foreground">Video coming soon</p>
                <p className="mt-1 text-xs text-muted-foreground">This lesson is being added to the course.</p>
              </div>
            </div>
          )}

          <h1 className="mt-5 text-xl font-semibold text-foreground">{lesson.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{module.blurb}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIndex(Math.max(0, index - 1))}
              disabled={index === 0}
              className={buttonStyles.outline}
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>
            <button type="button" onClick={() => toggle(!completed)} className={buttonStyles.ghost}>
              <Check className={cn("h-4 w-4", completed && "text-primary")} />
              {completed ? "Mark not done" : "Mark complete"}
            </button>
            <button type="button" onClick={advance} className={cn(buttonStyles.primary, "ml-auto")}>
              {index < module.lessons.length - 1 ? "Next lesson" : nextModule ? "Next module" : "Finish"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <aside className="min-w-0">
          <p className="eyebrow text-[0.5625rem] text-muted-foreground">Lessons</p>
          <ol className="mt-3 space-y-1.5">
            {module.lessons.map((l, i) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "tap flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm",
                    i === index
                      ? "border-primary/40 bg-primary/10 font-semibold text-foreground"
                      : "border-hairline bg-surface/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[0.6875rem] font-semibold",
                      done.has(l.id) ? "border-primary bg-primary text-primary-foreground" : "border-hairline",
                    )}
                  >
                    {done.has(l.id) ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="min-w-0 truncate">{l.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </Container>
    </AppShell>
  );
}
