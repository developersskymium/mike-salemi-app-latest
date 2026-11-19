import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ChevronRight,
  Copy,
  ListTree,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import { getStructure, saveStructure } from "@/lib/structure.functions";
import {
  DAY_TYPES,
  LESSON_CAPABILITIES,
  countStructure,
  emptyStructure,
  ensureWorkoutPair,
  isWorkoutDay,
  newDay,
  newLesson,
  normaliseStructure,
  structureFromProgram,
  uid,
  type CapabilityKey,
  type Structure,
  type StructureDay,
  type StructureLesson,
} from "@/lib/structure";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/structure/")({
  head: () => ({
    meta: [
      { title: "Structure — Mike Salemi App" },
      {
        name: "description",
        content:
          "Author the Kettlebell Lifestyle hierarchy: courses, phases, days and lessons, with the content blocks each lesson carries.",
      },
      { property: "og:title", content: "Structure — Mike Salemi App" },
      { property: "og:description", content: "Author courses, phases, days and lesson content blocks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StructurePage,
});

function StructurePage() {
  const queryClient = useQueryClient();
  const fetchStructure = useServerFn(getStructure);
  const persist = useServerFn(saveStructure);

  const { data, isLoading } = useQuery({ queryKey: ["structure"], queryFn: () => fetchStructure() });

  const [structure, setStructure] = useState<Structure>(emptyStructure());
  const [dirty, setDirty] = useState(false);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [openPhase, setOpenPhase] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const next = normaliseStructure((data as { data?: unknown }).data);
    setStructure(next.courses.length ? next : structureFromProgram());
    setOpenCourse((c) => c ?? next.courses[0]?.id ?? null);
  }, [data]);

  const counts = useMemo(() => countStructure(structure), [structure]);

  const saveMutation = useMutation({
    mutationFn: () => persist({ data: { data: structure } }),
    onSuccess: () => {
      setDirty(false);
      toast.success("Structure saved");
      queryClient.invalidateQueries({ queryKey: ["structure"] });
    },
    onError: () => toast.error("Couldn't save the structure"),
  });

  function edit(fn: (draft: Structure) => Structure) {
    setStructure((prev) => fn(structuredClone(prev)));
    setDirty(true);
  }

  const findDay = (draft: Structure, dayId: string) => {
    for (const course of draft.courses)
      for (const phase of course.phases) {
        const day = phase.days.find((d) => d.id === dayId);
        if (day) return day;
      }
    return null;
  };

  return (
    <AppShell>
      <div className="animate-page">
        <PageHead
          eyebrow="Admin"
          title="Program structure"
          lede="Courses, phases, days and lessons. For each lesson, say which content blocks it carries — we'll ask for the actual content next."
          meta={`${counts.courses} courses · ${counts.phases} phases · ${counts.days} days · ${counts.lessons} lessons · ${counts.forms} forms · ${counts.tables} tables`}
          actions={
            <>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !dirty}
                className={buttonStyles.primary}
              >
                {saveMutation.isPending ? <Spinner /> : <Save className="h-4 w-4" />}
                {dirty ? "Save changes" : "Saved"}
              </button>
              <button
                type="button"
                onClick={() => {
                  edit(() => structureFromProgram());
                  toast.message("Reseeded from the live program");
                }}
                className={buttonStyles.outline}
              >
                <RotateCcw className="h-4 w-4" />
                Reseed from program
              </button>
            </>
          }
        />

        <Section>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Loading structure
            </div>
          ) : (
            <div className="space-y-3">
              {structure.courses.map((course) => {
                const courseOpen = openCourse === course.id;
                return (
                  <div key={course.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setOpenCourse(courseOpen ? null : course.id)}
                        aria-expanded={courseOpen}
                        aria-label={courseOpen ? "Collapse course" : "Expand course"}
                        className="tap tap-target grid place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                      >
                        <ChevronRight className={cn("h-4 w-4 transition-transform", courseOpen && "rotate-90")} />
                      </button>
                      <input
                        value={course.title}
                        placeholder="Course title"
                        onChange={(e) =>
                          edit((d) => {
                            const c = d.courses.find((x) => x.id === course.id)!;
                            c.title = e.target.value;
                            return d;
                          })
                        }
                        className="min-w-0 bg-transparent text-sm font-semibold text-foreground outline-none"
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="numeric text-[0.625rem] text-muted-foreground">
                          {course.phases.length} phases
                        </span>
                        <IconButton
                          label="Delete course"
                          danger
                          onClick={() => edit((d) => ({ ...d, courses: d.courses.filter((c) => c.id !== course.id) }))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>
                    </div>

                    {courseOpen && (
                      <div className="animate-step-in space-y-2 p-3">
                        {course.phases.map((phase) => {
                          const phaseOpen = openPhase === phase.id;
                          return (
                            <div key={phase.id} className="rounded-xl border border-border">
                              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => setOpenPhase(phaseOpen ? null : phase.id)}
                                  aria-expanded={phaseOpen}
                                  aria-label={phaseOpen ? "Collapse phase" : "Expand phase"}
                                  className="tap tap-target grid place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                                >
                                  <ChevronRight
                                    className={cn("h-3.5 w-3.5 transition-transform", phaseOpen && "rotate-90")}
                                  />
                                </button>
                                <input
                                  value={phase.title}
                                  placeholder="Phase name"
                                  onChange={(e) =>
                                    edit((d) => {
                                      const p = d.courses
                                        .flatMap((c) => c.phases)
                                        .find((x) => x.id === phase.id)!;
                                      p.title = e.target.value;
                                      return d;
                                    })
                                  }
                                  className="min-w-0 bg-transparent text-sm text-foreground outline-none"
                                />
                                <div className="flex shrink-0 items-center gap-1">
                                  <span className="numeric text-[0.625rem] text-muted-foreground">
                                    {phase.days.length} days
                                  </span>
                                  <IconButton
                                    label="Delete phase"
                                    danger
                                    onClick={() =>
                                      edit((d) => {
                                        const c = d.courses.find((x) => x.id === course.id)!;
                                        c.phases = c.phases.filter((p) => p.id !== phase.id);
                                        return d;
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </IconButton>
                                </div>
                              </div>

                              {phaseOpen && (
                                <div className="animate-step-in space-y-1.5 border-t border-border p-2">
                                  {phase.days.map((day) => (
                                    <DayEditor
                                      key={day.id}
                                      day={day}
                                      open={openDay === day.id}
                                      onToggle={() => setOpenDay(openDay === day.id ? null : day.id)}
                                      onChange={(patch) =>
                                        edit((d) => {
                                          const target = findDay(d, day.id);
                                          if (target) Object.assign(target, patch);
                                          return d;
                                        })
                                      }
                                      onDelete={() =>
                                        edit((d) => {
                                          const p = d.courses
                                            .flatMap((c) => c.phases)
                                            .find((x) => x.id === phase.id)!;
                                          p.days = p.days.filter((x) => x.id !== day.id);
                                          return d;
                                        })
                                      }
                                      onDuplicate={() =>
                                        edit((d) => {
                                          const p = d.courses
                                            .flatMap((c) => c.phases)
                                            .find((x) => x.id === phase.id)!;
                                          const i = p.days.findIndex((x) => x.id === day.id);
                                          const clone: StructureDay = {
                                            ...structuredClone(day),
                                            id: uid(),
                                            lessons: day.lessons.map((l) => ({ ...l, id: uid() })),
                                          };
                                          p.days.splice(i + 1, 0, clone);
                                          return d;
                                        })
                                      }
                                    />
                                  ))}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      edit((d) => {
                                        const p = d.courses
                                          .flatMap((c) => c.phases)
                                          .find((x) => x.id === phase.id)!;
                                        p.days.push(
                                          ensureWorkoutPair(
                                            newDay({ title: `Day ${p.days.length + 1}` }),
                                          ),
                                        );
                                        return d;
                                      })
                                    }
                                    className="tap flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                                  >
                                    <Plus className="h-3.5 w-3.5" /> Add day
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() =>
                            edit((d) => {
                              const c = d.courses.find((x) => x.id === course.id)!;
                              c.phases.push({ id: uid(), title: "New phase", days: [] });
                              return d;
                            })
                          }
                          className="tap flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add phase
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  edit((d) => ({
                    ...d,
                    courses: [...d.courses, { id: uid(), title: "New course", phases: [] }],
                  }))
                }
                className="tap flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <ListTree className="h-4 w-4" /> Add course
              </button>
            </div>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */

function DayEditor({
  day,
  open,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
}: {
  day: StructureDay;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<StructureDay>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const workout = isWorkoutDay(day.dayType);

  function patchLesson(id: string, patch: Partial<StructureLesson>) {
    onChange({ lessons: day.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "Collapse day" : "Expand day"}
          className="tap tap-target grid place-items-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <input
            value={day.title}
            placeholder="Day title"
            onChange={(e) => onChange({ title: e.target.value })}
            className="min-w-0 bg-transparent text-sm text-foreground outline-none"
          />
          <select
            value={day.dayType}
            onChange={(e) => onChange(ensureWorkoutPair({ ...day, dayType: e.target.value }))}
            className="h-8 shrink-0 rounded-lg border border-border bg-surface px-2 text-[0.6875rem] text-muted-foreground outline-none focus:border-primary"
            aria-label="Day type"
          >
            {DAY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="numeric text-[0.625rem] text-muted-foreground">{day.lessons.length}</span>
          <IconButton label="Duplicate day" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Delete day" danger onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      {open && (
        <div className="animate-step-in space-y-2 border-t border-border p-2">
          {workout && (
            <p className="flex items-center gap-1.5 rounded-lg bg-subtle px-2.5 py-1.5 text-[0.6875rem] text-muted-foreground">
              <Lock className="h-3 w-3 shrink-0 text-primary" />
              Workout day: the check-in form unlocks this day's workout table.
            </p>
          )}

          {day.lessons.map((lesson) => (
            <div key={lesson.id} className="rounded-lg border border-border p-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <input
                  value={lesson.title}
                  placeholder="Lesson title"
                  onChange={(e) => patchLesson(lesson.id, { title: e.target.value })}
                  className="min-w-0 bg-transparent text-sm text-foreground outline-none"
                />
                <IconButton
                  label="Delete lesson"
                  danger
                  onClick={() => onChange({ lessons: day.lessons.filter((l) => l.id !== lesson.id) })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {LESSON_CAPABILITIES.map((cap) => {
                  const on = lesson[cap.key as CapabilityKey];
                  return (
                    <button
                      key={cap.key}
                      type="button"
                      title={cap.hint}
                      aria-pressed={on}
                      onClick={() => patchLesson(lesson.id, { [cap.key]: !on } as Partial<StructureLesson>)}
                      className={cn(
                        "tap rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold",
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {cap.label}
                    </button>
                  );
                })}
              </div>

              {(lesson.unlocksTable || lesson.lockedUntilForm) && (
                <p className="mt-2 text-[0.625rem] text-muted-foreground">
                  {lesson.unlocksTable ? "Submitting this form unlocks the workout table." : "Locked until the check-in form is submitted."}
                </p>
              )}

              <input
                value={lesson.notes ?? ""}
                placeholder="Notes for content (optional)"
                onChange={(e) => patchLesson(lesson.id, { notes: e.target.value })}
                className="mt-2 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-[0.6875rem] text-muted-foreground outline-none focus:border-primary"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() => onChange({ lessons: [...day.lessons, newLesson({ content: true })] })}
            className="tap flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[0.6875rem] font-semibold text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add lesson
          </button>
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "tap grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary",
        danger && "hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}
