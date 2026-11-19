import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  Play,
  ClipboardCheck,
  Layers3,
  LockKeyhole,
  Sparkles,
  Search,
  X,
  Info,
  ListTree,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { ContextBar, Section } from "@/components/page-kit";
import { VimeoPlayer } from "@/components/VimeoPlayer";
import { buttonStyles } from "@/components/ui-kit";
import { getCourse, getProgramLessonProgress, setProgramLessonProgress } from "@/lib/courses.functions";
import { cn } from "@/lib/utils";
import { getProgramIntake } from "@/lib/program-intake.functions";
import { MTK_SLUG, sectionInPath, type MtkRecommendation } from "@/lib/mtk-paths";
import { getMtkPlanState } from "@/lib/mtk-plan.functions";

const INTRO = "__intro__";

export const Route = createFileRoute("/_authenticated/courses/$courseSlug")({
  head: () => ({
    meta: [
      { title: "Course — Mike Salemi App" },
      { name: "description", content: "Work through a guided course from Mike Salemi, lesson by lesson." },
      { property: "og:title", content: "Course — Mike Salemi App" },
      { property: "og:description", content: "A guided course from Mike Salemi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { lesson?: string; mode?: "plan" | "full" } => ({
    ...(typeof search.lesson === "string" && search.lesson ? { lesson: search.lesson } : {}),
    ...(search.mode === "plan" || search.mode === "full" ? { mode: search.mode } : {}),
  }),
  component: CoursePage,
});

type Resource = { title: string; url: string; kind: "audio" | "file" | "link" };

const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/i;

/** Split lesson markdown into readable body, downloadable resources and extra vimeo clips. */
function parseContent(md: string) {
  const resources: Resource[] = [];
  const vimeos: { title: string; vimeoId: string }[] = [];
  const linkRe = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(md))) {
    const [, title, url] = m;
    const v = url.match(VIMEO_RE);
    if (v) {
      vimeos.push({ title, vimeoId: v[1] });
      continue;
    }
    const isDownload = /\/download\/|\.(mp3|m4a|wav|pdf|docx?|zip)(\?|$)/i.test(url);
    if (!isDownload) continue;
    const kind: Resource["kind"] = /audio|\.mp3|\.m4a|\.wav|meditation/i.test(title + url) ? "audio" : "file";
    if (!resources.some((r) => r.url === url)) resources.push({ title, url, kind });
  }
  const titles = new Set([...resources.map((r) => r.title.trim()), ...vimeos.map((v) => v.title.trim())]);
  const body = md
    .split("\n")
    .filter((line) => {
      const t = line.trim().replace(/^[-*]\s+/, "");
      if (titles.has(t)) return false;
      if (VIMEO_RE.test(t) && !t.includes("](")) return false;
      const link = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link && (titles.has(link[1].trim()) || VIMEO_RE.test(link[2]))) return false;
      return true;
    })
    .join("\n")
    .replace(/\*\*Resources\*\*\s*$/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Keep every remaining line verbatim: bold lines followed by another bold line are real
  // instructions (e.g. numbered exercises), not empty headings.
  return { body, resources, vimeos };
}

/** Lesson video: Vimeo ids use the custom player; imported direct video files play natively. */
function LessonVideo({ id, src, title }: { id: string; src: string; title: string }) {
  if (/^https?:\/\//i.test(src)) {
    return <video src={src} title={title} controls playsInline preload="metadata" className="aspect-video w-full bg-foreground" />;
  }
  return <VimeoPlayer vimeoId={src} title={title} resumeKey={`course:${id}`} />;
}

function prettyTitle(t: string) {
  return t.replace(/_/g, " ").replace(/\s*\(audio only\)/i, "").trim();
}

function CoursePage() {
  const { courseSlug } = Route.useParams();
  const fetchCourse = useServerFn(getCourse);
  const fetchProgress = useServerFn(getProgramLessonProgress);
  const saveProgress = useServerFn(setProgramLessonProgress);
  const queryClient = useQueryClient();
  const fetchIntake = useServerFn(getProgramIntake);
  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseSlug],
    queryFn: () => fetchCourse({ data: { slug: courseSlug } }),
  });
  const { data: intake } = useQuery({
    queryKey: ["program-intake", courseSlug],
    queryFn: () => fetchIntake({ data: { slug: courseSlug } }),
  });
  // Thin MTK layer: recommendations never lock content. A personalized plan marks lessons; otherwise the intake path marks sections.
  const isMtk = courseSlug === MTK_SLUG;
  const fetchMtkPlan = useServerFn(getMtkPlanState);
  const { data: mtkState } = useQuery({ queryKey: ["mtk-plan"], queryFn: () => fetchMtkPlan(), enabled: isMtk });
  const planIds = useMemo(() => (mtkState?.plan ? new Set(mtkState.plan.result.lessonIds) : null), [mtkState]);
  const mtkPath = isMtk && !planIds && intake?.response?.completed_at ? ((intake.response.guidance ?? {}) as { mtk?: MtkRecommendation }).mtk : undefined;
  const { lesson: lessonParam, mode } = Route.useSearch();
  const navigate = Route.useNavigate();
  // Plan Mode only when explicitly opened from My Plan; Full Curriculum never enters it.
  const planMode = isMtk && mode === "plan" && Boolean(mtkState?.plan);
  const planOrder = useMemo(() => (planMode && mtkState?.plan ? mtkState.plan.days.flatMap((d) => d.lessonIds.map((id) => ({ id, day: d.day, title: d.title, size: d.lessonIds.length, pos: d.lessonIds.indexOf(id) + 1 }))) : []), [planMode, mtkState]);
  // Opening MTK with no specific lesson/mode while a plan exists → My Plan is the home.
  useEffect(() => {
    if (isMtk && !mode && !lessonParam && mtkState?.plan) navigate({ to: "/mtk-plan", replace: true });
  }, [isMtk, mode, lessonParam, mtkState?.plan]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastKey = `course-last-lesson:${courseSlug}`;
  const [storedId, setStoredId] = useState<string | null>(null);
  useEffect(() => {
    try {
      setStoredId(window.localStorage.getItem(lastKey));
    } catch {
      setStoredId(null);
    }
  }, [lastKey]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [focus, setFocus] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const { data: progressRows = [], isSuccess: progressReady } = useQuery({ queryKey: ["program-progress", course?.id], queryFn: () => fetchProgress({ data: { programId: course?.id ?? "" } }), enabled: Boolean(course?.id) });
  const done = useMemo(() => new Set(progressRows.map((row) => row.lesson_id)), [progressRows]);
  const progressMutation = useMutation({ mutationFn: (input: { lessonId: string; completed: boolean }) => saveProgress({ data: { programId: course?.id ?? "", ...input } }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["program-progress", course?.id] }) });

  type CourseSection = NonNullable<typeof course>["sections"][number];
  // The source "home" page is a course introduction: shown first, kept out of curriculum counts.
  const curriculum = useMemo(
    () => (course?.sections ?? []).filter((s) => s.id !== course?.introSectionId),
    [course],
  );
  const introLesson = useMemo(
    () => course?.sections.find((s) => s.id === course?.introSectionId)?.lessons[0],
    [course],
  );
  const groups = useMemo(() => {
    const out: { name: string; sections: CourseSection[] }[] = [];
    for (const s of curriculum) {
      const name = s.group?.trim() || "Start Here";
      let g = out.find((x) => x.name === name);
      if (!g) {
        g = { name, sections: [] };
        out.push(g);
      }
      g.sections.push(s);
    }
    return out;
  }, [course]);

  const all = useMemo(() => curriculum.flatMap((s) => s.lessons), [curriculum]);
  // URL ?lesson= wins; otherwise the last lesson viewed on this device. Both are validated against the course.
  const isValidId = (id: string | null | undefined) =>
    Boolean(id) && (id === INTRO ? Boolean(introLesson) : all.some((l) => l.id === id));
  const activeId: string | null = isValidId(lessonParam)
    ? lessonParam!
    : isValidId(storedId)
      ? storedId
      : null;
  useEffect(() => {
    if (!lessonParam || !isValidId(lessonParam)) return;
    try {
      window.localStorage.setItem(lastKey, lessonParam);
    } catch {
      /* storage unavailable */
    }
  }, [lessonParam, all, introLesson]); // eslint-disable-line react-hooks/exhaustive-deps
  const showIntro = Boolean(introLesson) && (activeId === INTRO || (activeId === null && progressRows.length === 0));
  const active = showIntro
    ? introLesson
    : all.find((l) => l.id === activeId) ?? all.find((lesson) => !done.has(lesson.id)) ?? all[0];
  const activeSection = showIntro ? undefined : curriculum.find((s) => s.lessons.some((l) => l.id === active?.id));
  const activeSectionId = activeSection?.id;
  const activeGroup =
    groups.find((g) => g.sections.some((s) => s.id === activeSectionId)) ?? groups[0];
  const groupLessons = useMemo(
    () => activeGroup?.sections.flatMap((s) => s.lessons) ?? [],
    [activeGroup],
  );
  const index = active && !showIntro ? groupLessons.findIndex((l) => l.id === active.id) : -1;
  const planIdx = planMode && active ? planOrder.findIndex((p) => p.id === active.id) : -1;
  const planCtx = planIdx >= 0 ? planOrder[planIdx] : undefined;
  const byId = (id?: string) => (id ? all.find((l) => l.id === id) : undefined);
  const prev = planCtx ? byId(planOrder[planIdx - 1]?.id) : index > 0 ? groupLessons[index - 1] : undefined;
  const next = planCtx ? byId(planOrder[planIdx + 1]?.id) : index >= 0 ? groupLessons[index + 1] : undefined;
  const groupDone = groupLessons.filter((l) => done.has(l.id)).length;

  // First-time students see the course overview above the introduction; returning students get a clean stage.
  useEffect(() => {
    if (progressReady && progressRows.length === 0) setShowOverview(true);
  }, [progressReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSectionId) setOpenSections((s) => new Set(s).add(activeSectionId));
  }, [activeSectionId]);
  const activeGroupName = activeGroup?.name;
  useEffect(() => {
    if (activeGroupName) setOpenGroups((s) => new Set(s).add(activeGroupName));
  }, [activeGroupName]);

  const parsed = useMemo(() => parseContent(active?.content ?? ""), [active?.content]);

  if (isLoading) {
    return (
      <AppShell>
        <Container className="section">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="aspect-video animate-pulse rounded-2xl bg-secondary" />
            <div className="h-96 animate-pulse rounded-2xl bg-secondary" />
          </div>
        </Container>
      </AppShell>
    );
  }
  if (!course) {
    return (
      <AppShell>
        <Container className="section">
          <p className="text-sm text-muted-foreground">That course does not exist.</p>
          <Link to="/programs" className={cn(buttonStyles.outline, "mt-4")}>All programs</Link>
        </Container>
      </AppShell>
    );
  }

  const percent = all.length ? Math.round((done.size / all.length) * 100) : 0;
  const go = (id: string) => {
    try {
      window.localStorage.setItem(lastKey, id);
    } catch {
      /* storage unavailable */
    }
    setStoredId(id);
    navigate({ search: { lesson: id, ...(mode ? { mode } : {}) } });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const completeAndNext = () => {
    if (!active) return;
    if (showIntro) {
      const first = all.find((l) => !done.has(l.id)) ?? all[0];
      if (first) go(first.id);
      return;
    }
    progressMutation.mutate({ lessonId: active.id, completed: true });
    if (next) go(next.id);
    else if (planCtx) navigate({ to: "/mtk-plan" });
  };
  const isDone = active ? done.has(active.id) : false;
  const sectionTitle = activeSection?.title;
  const groupName = activeGroup?.name;
  const multiGroup = groups.length > 1;
  const audio = parsed.resources.filter((r) => r.kind === "audio");
  const files = parsed.resources.filter((r) => r.kind !== "audio");
  const locked = course.access === "locked";


  const extraVideos = active ? [...active.extraVideos, ...parsed.vimeos].filter((v, i, arr) => v.vimeoId !== active.vimeoId && arr.findIndex((x) => x.vimeoId === v.vimeoId) === i) : [];
  const trackPercent = multiGroup
    ? groupLessons.length ? Math.round((groupDone / groupLessons.length) * 100) : 0
    : percent;
  const q = search.trim().toLowerCase();
  const matches = q
    ? curriculum.flatMap((s) =>
        s.lessons
          .filter((l) => l.title.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
          .map((l) => ({ lesson: l, section: s })),
      )
    : [];

  const lessonRow = (lesson: (typeof all)[number], sub?: string) => {
    const isActive = !showIntro && lesson.id === active?.id;
    const lDone = done.has(lesson.id);
    return (
      <li key={lesson.id}>
        <button
          type="button"
          onClick={() => {
            go(lesson.id);
            setDrawerOpen(false);
          }}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
            isActive ? "bg-primary/10 font-semibold text-foreground" : "text-muted-foreground hover:bg-secondary",
          )}
        >
          {isActive && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />}
          <span
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-full",
              lDone ? "bg-success text-success-foreground" : isActive ? "bg-primary text-primary-foreground" : "bg-secondary",
            )}
          >
            {lDone ? <Check className="h-3 w-3" strokeWidth={3} /> : lesson.vimeoId ? <Play className="h-3 w-3 fill-current" /> : <FileText className="h-3 w-3" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{lesson.title}</span>
            {sub && <span className="block truncate text-xs font-normal text-muted-foreground">{sub}</span>}
          </span>
        </button>
      </li>
    );
  };

  const curriculumPanel = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow text-muted-foreground">Curriculum</p>
          <span className="numeric text-xs text-muted-foreground">{done.size}/{all.length} lessons</span>
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {q ? (
          matches.length ? (
            <ul className="space-y-0.5">
              {matches.slice(0, 80).map(({ lesson, section }) =>
                lessonRow(lesson, [section.group, section.title].filter(Boolean).join(" · ")),
              )}
            </ul>
          ) : (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No lessons match “{search}”.</p>
          )
        ) : (
          <>
            {introLesson && (
              <button
                type="button"
                onClick={() => {
                  go(INTRO);
                  setDrawerOpen(false);
                }}
                className={cn(
                  "mb-3 flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  showIntro ? "border-primary/40 bg-primary/10 font-semibold text-foreground" : "border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                <span className="truncate">Course introduction</span>
                <span className="text-xs text-muted-foreground">Not counted</span>
              </button>
            )}
            {multiGroup && (
              <div className="mb-3">
                <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Groups</p>
                <div className="flex flex-col gap-0.5">
                  {groups.map((g) => {
                    const lessons = g.sections.flatMap((s) => s.lessons);
                    const gDone = lessons.filter((l) => done.has(l.id)).length;
                    const isActive = !showIntro && g.name === groupName;
                    return (
                      <button
                        key={g.name}
                        type="button"
                        onClick={() => {
                          const first = lessons.find((l) => !done.has(l.id)) ?? lessons[0];
                          if (first) go(first.id);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        <span className="truncate font-medium">{g.name}</span>
                        <span className={cn("numeric shrink-0 text-xs", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {gDone}/{lessons.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {(showIntro && multiGroup ? [] : activeGroup?.sections ?? []).map((section) => {
                const open = openSections.has(section.id);
                const sDone = section.lessons.filter((l) => done.has(l.id)).length;
                return (
                  <div key={section.id} className="overflow-hidden rounded-xl border border-border bg-card">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSections((s) => {
                          const n = new Set(s);
                          if (n.has(section.id)) n.delete(section.id);
                          else n.add(section.id);
                          return n;
                        })
                      }
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{section.title}</span>
                        <span className="numeric text-xs text-muted-foreground">{sDone}/{section.lessons.length} lessons</span>
                      </span>
                      {sDone === section.lessons.length && section.lessons.length > 0 && <Check className="h-4 w-4 text-success" strokeWidth={3} />}
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </button>
                    {open && <ul className="border-t border-border p-1.5">{section.lessons.map((l) => lessonRow(l))}</ul>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const overview = (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="grid md:grid-cols-[14rem_minmax(0,1fr)]">
        {course.image && <img src={course.image} alt={course.name} className="h-full min-h-40 w-full object-cover" />}
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">{course.type}</span>
            <span>{course.access === "owned" ? "Owned" : locked ? "Locked" : "Included"}</span>
            {course.level && <span>{course.level}</span>}
            <span className="inline-flex items-center gap-1"><Layers3 className="h-3.5 w-3.5" /> {groups.length > 1 && `${groups.length} groups · `}{curriculum.length} sections · {all.length} lessons</span>
          </div>
          <h1 className="mt-3 text-2xl text-foreground">{course.name}</h1>
          {course.instructor && <p className="mt-1 text-sm text-muted-foreground">With {course.instructor}</p>}
          {course.summary && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{course.summary}</p>}
          {course.highlights.length > 0 && <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">{course.highlights.map((h) => <li key={h} className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5 text-primary" />{h}</li>)}</ul>}
          <div className="mt-5 flex flex-wrap gap-2">
            {locked && <span className={buttonStyles.outline}><LockKeyhole className="h-4 w-4" />Access required</span>}
            <Link to="/programs/$programSlug/intake" params={{ programSlug: courseSlug }} className={buttonStyles.outline}><ClipboardCheck className="h-4 w-4" />{intake?.response?.completed_at ? "Review intake" : "Take program intake"}</Link>
          </div>
        </div>
      </div>
    </div>
  );

  const menOfMovement = course.slug === "men-of-movement" && (
    <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <p className="eyebrow text-primary">Retreat preparation</p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">Arrive grounded through five pillars</h2>
        <div className="mt-4 flex flex-wrap gap-2">{["Rotation", "Movement", "Breathwork", "Nature", "Storywork"].map((p) => <span key={p} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">{p}</span>)}</div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Six foundational practices are included with retreat enrollment. For now, access remains available without an expiry date.</p>
      </div>
      <div className="rounded-2xl border border-border bg-subtle p-5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary"><LockKeyhole className="h-4 w-4" /></span>
        <p className="mt-4 text-sm font-semibold text-foreground">Post-retreat integration</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Content in development. This module will unlock after a future retreat when its material and release rules are confirmed.</p>
      </div>
    </div>
  );

  if (locked) {
    return (
      <AppShell>
        <ContextBar backTo="/programs" backLabel="All programs" title={course.name} />
        <Section>
          {overview}
          <div className="mt-6 rounded-2xl border border-border bg-subtle p-6 text-center"><Sparkles className="mx-auto h-5 w-5 text-primary" /><h2 className="mt-3 text-lg font-semibold text-foreground">Preview the program, then choose access</h2><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Your intake is available now. Lessons open once this program is included in your membership or added to your account.</p></div>
        </Section>
      </AppShell>
    );
  }

  // Template 2 premium layout — applies to every database-backed course (Kettlebell Lifestyle uses its own routes).
  if (courseSlug) {
    const toggleSection = (id: string) =>
      setOpenSections((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });
    const toggleGroup = (name: string) =>
      setOpenGroups((s) => {
        const n = new Set(s);
        if (n.has(name)) n.delete(name);
        else n.add(name);
        return n;
      });
    const pRow = (lesson: (typeof all)[number], sub?: string) => {
      const isActive = !showIntro && lesson.id === active?.id;
      const lDone = done.has(lesson.id);
      return (
        <li key={lesson.id}>
          <button
            type="button"
            onClick={() => {
              go(lesson.id);
              setDrawerOpen(false);
            }}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
              isActive ? "bg-primary/10 font-medium text-primary" : lDone ? "text-muted-foreground hover:bg-secondary" : "text-foreground/85 hover:bg-secondary",
            )}
          >
            <span className={cn("grid h-4 w-4 shrink-0 place-items-center", lDone ? "text-success" : isActive ? "text-primary" : "text-muted-foreground/70")}>
              {lDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : lesson.vimeoId ? <Play className="h-3 w-3 fill-current" /> : <FileText className="h-3 w-3" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{lesson.title}</span>
              {sub && <span className={cn("block truncate text-xs font-normal", isActive ? "text-primary/70" : "text-muted-foreground")}>{sub}</span>}
            </span>
            {planIds?.has(lesson.id) && <span aria-label="Recommended for you" title="Recommended for you" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
          </button>
        </li>
      );
    };
    const nav = (
      <div className="flex h-full flex-col">
        <div className="px-3 pb-3 pt-5">
          <div className="flex items-baseline justify-between px-1">
            <p className="text-xs font-medium text-muted-foreground">Progress</p>
            <p className="numeric text-xs text-muted-foreground"><span className="font-semibold text-foreground">{percent}%</span> · {done.size}/{all.length}</p>
          </div>
          <div className="mx-1 mt-2 h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} /></div>
          <label className="mt-4 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
          {q ? (
            matches.length ? <ul>{matches.slice(0, 80).map(({ lesson, section }) => pRow(lesson, [section.group, section.title].filter(Boolean).join(" · ")))}</ul>
              : <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing matches “{search}”.</p>
          ) : (
            <>
              {isMtk && (
                <div className="mb-3 rounded-xl bg-primary/5 px-3 py-3">
                  <div className="flex rounded-full bg-secondary p-0.5 text-xs font-semibold">
                    {planMode ? <span className="flex-1 rounded-full bg-background px-3 py-1.5 text-center text-foreground shadow-sm">My Plan</span> : <Link to="/mtk-plan" className="flex-1 rounded-full px-3 py-1.5 text-center text-muted-foreground hover:text-foreground">My Plan</Link>}
                    {planMode ? <Link to="/courses/$courseSlug" params={{ courseSlug }} search={{ mode: "full" }} className="flex-1 rounded-full px-3 py-1.5 text-center text-muted-foreground hover:text-foreground">Full Curriculum</Link> : <span className="flex-1 rounded-full bg-background px-3 py-1.5 text-center text-foreground shadow-sm">Full Curriculum</span>}
                  </div>
                  {planIds ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {planIds.size} lessons recommended for you</p>
                  ) : (
                    <Link to="/programs/$programSlug/intake" params={{ programSlug: MTK_SLUG }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Create my personalized plan <ArrowRight className="h-3 w-3" /></Link>
                  )}
                </div>
              )}
              {introLesson && (
                <button type="button" onClick={() => { go(INTRO); setDrawerOpen(false); }} className={cn("mb-2 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors", showIntro ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary")}>
                  <Sparkles className="h-4 w-4 text-primary" /> Start here
                </button>
              )}
              <div className="space-y-1">
                {groups.map((g, gi) => {
                  const gLessons = g.sections.flatMap((s) => s.lessons);
                  const gDone = gLessons.filter((l) => done.has(l.id)).length;
                  const isActiveG = !showIntro && g.name === groupName;
                  const gOpen = !multiGroup || openGroups.has(g.name);
                  const sectionList = (
                    <div className="pb-1">
                      {g.sections.map((section) => {
                        const open = openSections.has(section.id);
                        const sDone = section.lessons.filter((l) => done.has(l.id)).length;
                        const sActive = section.id === activeSectionId && !showIntro;
                        return (
                          <div key={section.id}>
                            <button type="button" onClick={() => toggleSection(section.id)} className="tap flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-secondary">
                              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
                              <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", sActive ? "text-primary" : "text-foreground")}>{section.title}</span>
                              {mtkPath && sectionInPath(mtkPath.path, section.sequence) && <span aria-label="On your path" title="On your path" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                              <span className={cn("numeric text-xs", sDone === section.lessons.length && section.lessons.length ? "text-success" : "text-muted-foreground")}>{sDone}/{section.lessons.length}</span>
                            </button>
                            {open && <ul className="mb-1 ml-4">{section.lessons.map((l) => pRow(l))}</ul>}
                          </div>
                        );
                      })}
                    </div>
                  );
                  if (!multiGroup) return <div key={g.name}>{sectionList}</div>;
                  return (
                    <div key={g.name}>
                      <button type="button" onClick={() => toggleGroup(g.name)} aria-expanded={gOpen} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left hover:bg-secondary">
                        <span className={cn("numeric w-5 text-xs font-medium", isActiveG ? "text-primary" : "text-muted-foreground")}>{String(gi + 1).padStart(2, "0")}</span>
                        <span className={cn("min-w-0 flex-1 truncate text-sm font-semibold", isActiveG ? "text-primary" : "text-foreground")}>{g.name}</span>
                        <span className="numeric text-xs text-muted-foreground">{gDone}/{gLessons.length}</span>
                        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", !gOpen && "-rotate-90")} />
                      </button>
                      {gOpen && <div className="ml-3">{sectionList}</div>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
    const ghostBtn = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors";
    return (
      <AppShell immersive>
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="flex h-12 items-center gap-2 px-3 sm:px-5">
            {planMode ? (
              <Link to="/mtk-plan" aria-label="Back to My Plan" className={cn(ghostBtn, "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">My Plan</span>
              </Link>
            ) : (
              <Link to="/programs" aria-label="Back to Programs" className={cn(ghostBtn, "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Programs</span>
              </Link>
            )}
            <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-foreground">{course.name}</p>
            <span className="numeric hidden text-xs text-muted-foreground md:inline">{percent}%</span>
            <button type="button" onClick={() => setShowOverview((v) => !v)} aria-label="About" className={cn(ghostBtn, showOverview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              <Info className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Lessons" className={cn(ghostBtn, "text-primary hover:bg-primary/10 lg:hidden")}>
              <ListTree className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setFocus((v) => !v)} aria-pressed={focus} aria-label={focus ? "Show lessons" : "Focus"} className={cn(ghostBtn, "hidden lg:inline-flex", focus ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              {focus ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
          <div className="h-px bg-transparent"><div className="h-px bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} /></div>
        </div>

        <div className="flex">
          {!focus && <aside className="sticky top-12 hidden h-[calc(100vh-3rem)] w-[300px] shrink-0 self-start border-r border-border/60 lg:block">{nav}</aside>}
          <main className="min-w-0 flex-1 px-5 pb-24 pt-10 sm:px-8">
            <div className="mx-auto max-w-[760px]">
              {planCtx && (
                <div className="mb-6 flex items-center gap-3 rounded-xl bg-primary/5 px-4 py-2.5 text-sm">
                  <span className="font-semibold text-primary">My Plan · Day {planCtx.day}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">Lesson {planCtx.pos} of {planCtx.size} · {planCtx.title}</span>
                  <Link to="/mtk-plan" className="shrink-0 font-medium text-primary hover:underline">View plan</Link>
                </div>
              )}
              {isMtk && mtkState && !mtkState.plan && (
                <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <p className="min-w-0 flex-1 text-sm text-foreground">Get a plan built around your strengths and gaps — about 2 minutes.</p>
                  <Link to={mtkState.assessmentDone ? "/mtk-plan/results" : "/programs/$programSlug/intake"} params={{ programSlug: MTK_SLUG }} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{mtkState.assessmentDone ? "Finish my plan" : "Create my personalized plan"} <ArrowRight className="h-4 w-4" /></Link>
                </div>
              )}
              {showOverview && (
                <div className="mb-10 border-b border-border/60 pb-8">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">{course.instructor ? `With ${course.instructor}` : "Mike Salemi"}</p>
                      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{course.name}</h1>
                      {course.summary && <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{course.summary}</p>}
                    </div>
                    <button type="button" onClick={() => setShowOverview(false)} aria-label="Close details" className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    {[[groups.length > 1 ? groups.length : curriculum.length, groups.length > 1 ? "chapters" : "sections"], [all.length, "sessions"], [`${percent}%`, "complete"]].map(([v, l]) => (
                      <span key={String(l)}><span className="numeric font-semibold text-foreground">{v}</span> {l}</span>
                    ))}
                    <Link to="/programs/$programSlug/intake" params={{ programSlug: courseSlug }} className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                      <ClipboardCheck className="h-4 w-4" />{intake?.response?.completed_at ? "Review intake" : "Take the intake"}
                    </Link>
                  </div>
                  {course.highlights.length > 0 && <ul className="mt-4 space-y-1.5">{course.highlights.map((h) => <li key={h} className="flex gap-2 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{h}</li>)}</ul>}
                </div>
              )}
              {active && (
                <>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {showIntro ? <span className="font-medium text-primary">Start here</span> : (
                      <>
                        {multiGroup && groupName && <span className="font-medium text-primary">{groupName}</span>}
                        {sectionTitle && <span>{multiGroup && groupName ? "· " : ""}{sectionTitle}</span>}
                        <span className="numeric ml-auto">{index + 1} of {groupLessons.length}</span>
                        {isDone && <span className="inline-flex items-center gap-1 font-medium text-success"><Check className="h-3 w-3" strokeWidth={3} />Done</span>}
                      </>
                    )}
                  </div>
                  <h2 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[2rem]">{active.title}</h2>

                  {active.vimeoId && (
                    <div className="mt-8 overflow-hidden rounded-xl bg-secondary"><LessonVideo key={active.id} id={active.id} src={active.vimeoId} title={active.title} /></div>
                  )}

                  {audio.length > 0 && (
                    <div className="mt-6 divide-y divide-border/60 border-y border-border/60">
                      {audio.map((r) => (
                        <a key={r.url} href={r.url} target="_blank" rel="noreferrer" download className="flex items-center gap-3 py-3 transition-colors hover:text-primary">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Headphones className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{prettyTitle(r.title)}</span><span className="block text-xs text-muted-foreground">Audio session</span></span>
                          <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  )}

                  {parsed.body && (
                    <div className="mt-10 space-y-5 text-base leading-[1.75] text-foreground/80 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:text-foreground [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:pt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:font-semibold [&_h3]:text-foreground [&_img]:rounded-xl [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ol>li]:list-decimal [&_p>strong:only-child]:block [&_p>strong:only-child]:pt-3 [&_p>strong:only-child]:text-base [&_strong]:font-semibold [&_strong]:text-foreground [&_table]:w-full [&_td]:border-t [&_td]:border-border [&_td]:p-2 [&_th]:p-2 [&_th]:text-left">
                      <ReactMarkdown components={{ a: (props) => <a {...props} target="_blank" rel="noreferrer" /> }}>{parsed.body}</ReactMarkdown>
                    </div>
                  )}

                  {extraVideos.length > 0 && (
                    <div className="mt-12">
                      <p className="mb-4 text-xs font-medium text-muted-foreground">Technique breakdowns · {extraVideos.length}</p>
                      <div className="grid gap-6 md:grid-cols-2">
                        {extraVideos.map((v, i) => (
                          <div key={v.vimeoId}>
                            <div className="overflow-hidden rounded-xl bg-secondary"><VimeoPlayer vimeoId={v.vimeoId} title={v.title} /></div>
                            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                              <span className="numeric text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                              <span className="truncate">{prettyTitle(v.title)}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {files.length > 0 && (
                    <div className="mt-12">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Downloads</p>
                      <div className="divide-y divide-border/60 border-y border-border/60">
                        {files.map((r) => (
                          <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 py-3">
                            {r.kind === "link" ? <ExternalLink className="h-4 w-4 shrink-0 text-primary" /> : <FileText className="h-4 w-4 shrink-0 text-primary" />}
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-hover:text-primary">{prettyTitle(r.title)}</span>
                            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="sticky bottom-20 z-20 mt-14 flex items-center gap-2 rounded-full bg-background/85 p-1 backdrop-blur-xl sm:static sm:rounded-none sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                    {prev && !showIntro && (
                      <button type="button" onClick={() => go(prev.id)} aria-label={`Previous: ${prev.title}`} className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Previous</span>
                      </button>
                    )}
                    <button type="button" onClick={completeAndNext} className="ml-auto flex min-w-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]">
                      <span className="truncate">
                        {showIntro ? (done.size ? "Resume" : "Start training") : next ? (isDone ? "Next" : "Complete & continue") : planCtx ? (isDone ? "Plan complete" : "Complete plan") : isDone ? "All done" : "Mark complete"}
                      </span>
                      {next || showIntro ? <ArrowRight className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Training plan">
            <button type="button" aria-label="Close" className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-[90%] max-w-sm flex-col bg-background">
              <div className="flex items-center justify-between px-4 pt-4">
                <p className="truncate text-sm font-semibold text-foreground">{course.name}</p>
                <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="min-h-0 flex-1">{nav}</div>
            </div>
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Compact classroom header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link to="/programs" className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Academy</span>
          </Link>
          <span className="hidden h-5 w-px bg-border sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{course.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {showIntro ? "Course introduction" : [multiGroup ? groupName : null, sectionTitle].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="hidden items-center gap-2 md:flex" title={multiGroup ? `${groupName}: ${groupDone}/${groupLessons.length}` : undefined}>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${trackPercent}%` }} />
            </div>
            <span className="numeric text-xs text-muted-foreground">
              {multiGroup ? `${groupDone}/${groupLessons.length}` : `${done.size}/${all.length}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowOverview((v) => !v)}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors", showOverview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}
          >
            <Info className="h-4 w-4" /><span className="hidden sm:inline">Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
          >
            <ListTree className="h-4 w-4" /> Lessons
          </button>
          <button
            type="button"
            onClick={() => setFocus((v) => !v)}
            aria-pressed={focus}
            className={cn("hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors lg:inline-flex", focus ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}
          >
            {focus ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {focus ? "Show lessons" : "Focus"}
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1500px] gap-6 px-4 sm:px-6">
        {/* Left curriculum sidebar (desktop) */}
        {!focus && (
          <aside className="sticky top-[3.6rem] hidden h-[calc(100vh-4.5rem)] w-[300px] shrink-0 self-start py-6 lg:block">
            <div className="h-full overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur">{curriculumPanel}</div>
          </aside>
        )}

        {/* Lesson stage */}
        <main className="min-w-0 flex-1 py-6 pb-16">
          <div className="mx-auto max-w-[820px]">
            {showOverview && <div className="mb-6">{overview}</div>}
            {menOfMovement}
            {active && (
              <>
                <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
                  {showIntro ? (
                    <span className="font-semibold text-primary">Course introduction</span>
                  ) : (
                    <>
                      {multiGroup && groupName && <><span className="font-semibold text-primary">{groupName}</span><span>/</span></>}
                      {sectionTitle && <span>{sectionTitle}</span>}
                      <span className="numeric ml-1 rounded-full bg-secondary px-2 py-0.5">Lesson {index + 1} of {groupLessons.length}</span>
                      {isDone && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 font-semibold text-success">
                          <Check className="h-3 w-3" strokeWidth={3} /> Completed
                        </span>
                      )}
                    </>
                  )}
                </nav>
                <h2 className="mt-2 text-2xl leading-tight text-foreground sm:text-[2rem]">{active.title}</h2>

                {active.vimeoId && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                    <LessonVideo key={active.id} id={active.id} src={active.vimeoId} title={active.title} />
                  </div>
                )}

                {audio.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {audio.map((r) => (
                      <a key={r.url} href={r.url} target="_blank" rel="noreferrer" download className="group flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary hover:bg-primary/10">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Headphones className="h-5 w-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-foreground">{prettyTitle(r.title)}</span>
                          <span className="block text-xs text-muted-foreground">Audio · tap to download and listen</span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" /> <span className="hidden sm:inline">Download</span></span>
                      </a>
                    ))}
                  </div>
                )}

                {parsed.body && (
                  <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-7">
                    <div className="space-y-4 text-[0.9375rem] leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:bg-primary/5 [&_blockquote]:p-4 [&_blockquote]:italic [&_h1]:text-xl [&_h1]:text-foreground [&_h2]:text-lg [&_h2]:text-foreground [&_h3]:text-foreground [&_img]:rounded-xl [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_p>strong:only-child]:block [&_p>strong:only-child]:pt-2 [&_p>strong:only-child]:text-base [&_strong]:text-foreground">
                      <ReactMarkdown components={{ a: (props) => <a {...props} target="_blank" rel="noreferrer" /> }}>{parsed.body}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {extraVideos.length > 0 && (
                  <div className="mt-6">
                    <p className="eyebrow text-muted-foreground">Lesson videos · {extraVideos.length}</p>
                    <div className="mt-3 grid gap-5 md:grid-cols-2">
                      {extraVideos.map((v, i) => (
                        <div key={v.vimeoId}>
                          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="numeric grid h-5 w-5 place-items-center rounded-full bg-secondary text-[0.6875rem] text-muted-foreground">{i + 1}</span>
                            <span className="truncate">{prettyTitle(v.title)}</span>
                          </p>
                          <div className="overflow-hidden rounded-xl border border-border bg-card"><VimeoPlayer vimeoId={v.vimeoId} title={v.title} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {files.length > 0 && (
                  <div className="mt-6">
                    <p className="eyebrow text-muted-foreground">Resources</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {files.map((r) => (
                        <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">{r.kind === "link" ? <ExternalLink className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{prettyTitle(r.title)}</span>
                          <Download className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lesson navigation */}
                <div className="mt-10 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
                  {prev && !showIntro ? (
                    <button type="button" onClick={() => go(prev.id)} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40">
                      <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                      <span className="min-w-0">
                        <span className="block text-xs text-muted-foreground">Previous</span>
                        <span className="block truncate text-sm font-semibold text-foreground">{prev.title}</span>
                      </span>
                    </button>
                  ) : <span className="hidden sm:block" />}
                  <button type="button" onClick={completeAndNext} className="group flex items-center justify-end gap-3 rounded-2xl bg-primary p-4 text-right text-primary-foreground shadow-lg transition-transform active:scale-[0.99]">
                    <span className="min-w-0">
                      <span className="block text-xs text-primary-foreground/80">
                        {showIntro ? (done.size ? "Resume the course" : "Begin the course") : next ? (isDone ? "Next lesson" : "Complete & continue") : isDone ? (multiGroup ? `${groupName} finished` : "Course finished") : multiGroup ? `Finish ${groupName}` : "Finish course"}
                      </span>
                      <span className="block truncate text-sm font-semibold">
                        {showIntro ? (all.find((l) => !done.has(l.id)) ?? all[0])?.title : next ? next.title : "Mark this lesson complete"}
                      </span>
                    </span>
                    {next || showIntro ? <ArrowRight className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Mobile / tablet curriculum drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Curriculum">
          <button type="button" aria-label="Close curriculum" className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-foreground">{course.name}</p>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1">{curriculumPanel}</div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
