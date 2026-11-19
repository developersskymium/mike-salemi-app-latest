import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock, Plus, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import {
  deleteContentRow,
  getContentGraph,
  getIsAdmin,
  saveContentRow,
} from "@/lib/admin-content.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/content")({
  head: () => ({
    meta: [
      { title: "Content Admin — Mike Salemi App" },
      { name: "description", content: "Internal content and catalogue administration." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Content Admin — Mike Salemi App" },
      { property: "og:description", content: "Internal content and catalogue administration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminContentPage,
});

type Row = Record<string, any>;

type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "bool" | "select";
  options?: string[];
};

const PROGRAM_FIELDS: Field[] = [
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug" },
  {
    key: "type",
    label: "Type",
    type: "select",
    options: ["live_online", "recorded", "retreat", "coaching", "immersion"],
  },
  { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] },
  { key: "level", label: "Level" },
  { key: "category", label: "Category" },
  { key: "starts_on", label: "Starts", type: "date" },
  { key: "ends_on", label: "Ends", type: "date" },
  { key: "price_cents", label: "Price (cents)", type: "number" },
  { key: "plan_tier", label: "Plan tier", type: "select", options: ["free", "pro", "max"] },
  { key: "included_in_subscription", label: "In subscription", type: "bool" },
  { key: "access_percent", label: "Access %", type: "number" },
  { key: "sort_order", label: "Sort", type: "number" },
  { key: "hero_image_url", label: "Hero image URL" },
  { key: "thumbnail_url", label: "Thumbnail URL" },
  { key: "summary", label: "Summary", type: "textarea" },
  { key: "description", label: "Description", type: "textarea" },
];

const SECTION_FIELDS: Field[] = [
  { key: "title", label: "Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "sequence", label: "Sequence", type: "number" },
  {
    key: "drip_method",
    label: "Drip",
    type: "select",
    options: ["immediate", "daily", "weekly", "date"],
  },
  { key: "drip_offset_days", label: "Drip offset (days)", type: "number" },
];

const LESSON_FIELDS: Field[] = [
  { key: "title", label: "Title" },
  {
    key: "day_type",
    label: "Day type",
    type: "select",
    options: ["general", "workout", "recovery", "skill", "mobility", "challenge", "preparation"],
  },
  { key: "day_number", label: "Day number", type: "number" },
  { key: "sequence", label: "Sequence", type: "number" },
  { key: "drip_offset_days", label: "Drip offset (days)", type: "number" },
  { key: "has_readiness_form", label: "Readiness form", type: "bool" },
  { key: "has_workout_table", label: "Workout table", type: "bool" },
  { key: "intro", label: "Intro", type: "textarea" },
];

const SUBLESSON_FIELDS: Field[] = [
  { key: "title", label: "Title" },
  { key: "sequence", label: "Sequence", type: "number" },
  { key: "kind", label: "Kind", type: "select", options: ["video", "form", "content", "table"] },
  { key: "vimeo_id", label: "Vimeo ID" },
  { key: "duration_label", label: "Duration" },
  { key: "has_form", label: "Has form", type: "bool" },
  { key: "has_table", label: "Has table", type: "bool" },
  { key: "has_associated_videos", label: "Associated videos", type: "bool" },
  { key: "content", label: "Content", type: "textarea" },
];

const ASSOCIATED_FIELDS: Field[] = [
  { key: "title", label: "Title" },
  { key: "vimeo_id", label: "Vimeo ID" },
  { key: "sequence", label: "Sequence", type: "number" },
];

const LIBRARY_FIELDS: Field[] = [
  { key: "title", label: "Title" },
  { key: "slug", label: "Slug" },
  { key: "vimeo_id", label: "Vimeo ID" },
  { key: "category", label: "Category" },
  { key: "level", label: "Level" },
  { key: "duration_seconds", label: "Duration (s)", type: "number" },
  { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] },
  { key: "description", label: "Description", type: "textarea" },
];

const TAG_FIELDS: Field[] = [
  { key: "label", label: "Label" },
  { key: "slug", label: "Slug" },
  { key: "kind", label: "Kind", type: "select", options: ["topic", "equipment", "level", "goal"] },
];

const RETREAT_FIELDS: Field[] = [
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug" },
  { key: "location", label: "Location" },
  { key: "starts_on", label: "Starts", type: "date" },
  { key: "ends_on", label: "Ends", type: "date" },
  { key: "capacity", label: "Capacity", type: "number" },
  { key: "price_cents", label: "Price (cents)", type: "number" },
  { key: "plan_tier", label: "Plan tier", type: "select", options: ["free", "pro", "max"] },
  { key: "included_in_subscription", label: "In subscription", type: "bool" },
  { key: "access_percent", label: "Access %", type: "number" },
  { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] },
  { key: "hero_image_url", label: "Hero image URL" },
  { key: "summary", label: "Summary", type: "textarea" },
];

const ITINERARY_FIELDS: Field[] = [
  { key: "day_number", label: "Day", type: "number" },
  { key: "time_label", label: "Time" },
  { key: "title", label: "Title" },
  { key: "sequence", label: "Sequence", type: "number" },
  { key: "description", label: "Description", type: "textarea" },
];

const COACHING_FIELDS: Field[] = [
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug" },
  { key: "mode", label: "Mode", type: "select", options: ["group", "one_to_one"] },
  { key: "session_count", label: "Sessions", type: "number" },
  { key: "duration_minutes", label: "Minutes", type: "number" },
  { key: "price_cents", label: "Price (cents)", type: "number" },
  { key: "plan_tier", label: "Plan tier", type: "select", options: ["free", "pro", "max"] },
  { key: "included_in_subscription", label: "In subscription", type: "bool" },
  { key: "access_percent", label: "Access %", type: "number" },
  { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] },
  { key: "summary", label: "Summary", type: "textarea" },
];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

const TABS = [
  { id: "programs", label: "Programs & structure" },
  { id: "library", label: "Library" },
  { id: "retreats", label: "Retreats" },
  { id: "coaching", label: "Coaching" },
  { id: "tags", label: "Tags" },
] as const;

function AdminContentPage() {
  const queryClient = useQueryClient();
  const fetchIsAdmin = useServerFn(getIsAdmin);
  const fetchGraph = useServerFn(getContentGraph);
  const saveRow = useServerFn(saveContentRow);
  const removeRow = useServerFn(deleteContentRow);

  const adminQuery = useQuery({ queryKey: ["admin-check"], queryFn: () => fetchIsAdmin() });
  const isAdmin = adminQuery.data?.isAdmin ?? false;

  const graphQuery = useQuery({
    queryKey: ["admin-content"],
    queryFn: () => fetchGraph(),
    enabled: isAdmin,
  });

  const save = useMutation({
    mutationFn: (input: { table: string; values: Row; id?: string | null }) =>
      saveRow({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content"] });
      toast.success("Saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const destroy = useMutation({
    mutationFn: (input: { table: string; id: string }) => removeRow({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content"] });
      toast.success("Deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("programs");
  const [programId, setProgramId] = useState<string | null>(null);
  const [retreatId, setRetreatId] = useState<string | null>(null);

  const graph = graphQuery.data;
  const programs = graph?.programs ?? [];
  const activeProgram = useMemo(
    () => programs.find((p: Row) => p.id === programId) ?? programs[0] ?? null,
    [programs, programId],
  );
  const retreats = graph?.retreats ?? [];
  const activeRetreat = useMemo(
    () => retreats.find((r: Row) => r.id === retreatId) ?? retreats[0] ?? null,
    [retreats, retreatId],
  );

  if (adminQuery.isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <Section>
          <div className="mx-auto max-w-md rounded-2xl border border-border p-8 text-center">
            <Lock className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Restricted</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This area is only available to administrators.
            </p>
          </div>
        </Section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHead
        eyebrow="Internal"
        title="Content admin"
        lede="Programs, structure, library, retreats and coaching — the data behind every screen in the app."
      />
      <Section>
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition",
                tab === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {graphQuery.isLoading ? (
          <Spinner />
        ) : (
          <>
            {tab === "programs" && (
              <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                <RowList
                  title="Programs"
                  rows={programs}
                  activeId={activeProgram?.id ?? null}
                  labelOf={(r) => `${r.name} · ${r.type}`}
                  onSelect={setProgramId}
                  onCreate={() =>
                    save.mutate({
                      table: "programs",
                      values: {
                        name: "New program",
                        slug: `program-${Date.now()}`,
                        type: "recorded",
                      },
                    })
                  }
                />
                {activeProgram && (
                  <div className="space-y-6">
                    <RowForm
                      title="Program details"
                      fields={PROGRAM_FIELDS}
                      row={activeProgram}
                      onSave={(values) =>
                        save.mutate({ table: "programs", values, id: activeProgram.id })
                      }
                      onDelete={() => destroy.mutate({ table: "programs", id: activeProgram.id })}
                    />
                    <StructureEditor
                      program={activeProgram}
                      graph={graph}
                      onSave={(table, values, id) => save.mutate({ table, values, id })}
                      onDelete={(table, id) => destroy.mutate({ table, id })}
                    />
                  </div>
                )}
              </div>
            )}

            {tab === "library" && (
              <CollectionEditor
                table="library_videos"
                title="Library videos"
                fields={LIBRARY_FIELDS}
                rows={graph?.libraryVideos ?? []}
                defaults={() => ({
                  title: "New video",
                  slug: `video-${Date.now()}`,
                  vimeo_id: "",
                })}
                labelOf={(r) => r.title}
                onSave={(values, id) => save.mutate({ table: "library_videos", values, id })}
                onDelete={(id) => destroy.mutate({ table: "library_videos", id })}
              />
            )}

            {tab === "retreats" && (
              <div className="space-y-6">
                <CollectionEditor
                  table="retreats"
                  title="Retreats"
                  fields={RETREAT_FIELDS}
                  rows={retreats}
                  defaults={() => ({ name: "New retreat", slug: `retreat-${Date.now()}` })}
                  labelOf={(r) => r.name}
                  activeId={activeRetreat?.id ?? null}
                  onSelect={setRetreatId}
                  onSave={(values, id) => save.mutate({ table: "retreats", values, id })}
                  onDelete={(id) => destroy.mutate({ table: "retreats", id })}
                />
                {activeRetreat && (
                  <ChildList
                    title={`Itinerary — ${activeRetreat.name}`}
                    fields={ITINERARY_FIELDS}
                    rows={(graph?.itinerary ?? []).filter(
                      (i: Row) => i.retreat_id === activeRetreat.id,
                    )}
                    onCreate={() =>
                      save.mutate({
                        table: "retreat_itinerary_items",
                        values: { retreat_id: activeRetreat.id, title: "New item", day_number: 1 },
                      })
                    }
                    onSave={(values, id) =>
                      save.mutate({ table: "retreat_itinerary_items", values, id })
                    }
                    onDelete={(id) => destroy.mutate({ table: "retreat_itinerary_items", id })}
                  />
                )}
              </div>
            )}

            {tab === "coaching" && (
              <CollectionEditor
                table="coaching_offerings"
                title="Coaching offerings"
                fields={COACHING_FIELDS}
                rows={graph?.coaching ?? []}
                defaults={() => ({ name: "New offering", slug: `coaching-${Date.now()}` })}
                labelOf={(r) => `${r.name} · ${r.mode}`}
                onSave={(values, id) => save.mutate({ table: "coaching_offerings", values, id })}
                onDelete={(id) => destroy.mutate({ table: "coaching_offerings", id })}
              />
            )}

            {tab === "tags" && (
              <ChildList
                title="Tags"
                fields={TAG_FIELDS}
                rows={graph?.tags ?? []}
                onCreate={() =>
                  save.mutate({
                    table: "tags",
                    values: { label: "New tag", slug: `tag-${Date.now()}` },
                  })
                }
                onSave={(values, id) => save.mutate({ table: "tags", values, id })}
                onDelete={(id) => destroy.mutate({ table: "tags", id })}
              />
            )}
          </>
        )}
      </Section>
    </AppShell>
  );
}

function RowList({
  title,
  rows,
  activeId,
  labelOf,
  onSelect,
  onCreate,
}: {
  title: string;
  rows: Row[];
  activeId: string | null;
  labelOf: (row: Row) => string;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button type="button" onClick={onCreate} className={buttonStyles.ghost}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row.id)}
            className={cn(
              "w-full rounded-lg px-3 py-2 text-left text-sm transition",
              row.id === activeId ? "bg-primary/10 text-foreground" : "hover:bg-muted",
            )}
          >
            {labelOf(row)}
          </button>
        ))}
        {!rows.length && <p className="px-3 py-4 text-sm text-muted-foreground">Nothing yet.</p>}
      </div>
    </div>
  );
}

function RowForm({
  title,
  fields,
  row,
  onSave,
  onDelete,
}: {
  title: string;
  fields: Field[];
  row: Row;
  onSave: (values: Row) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<Row>(row);
  const [key, setKey] = useState(row.id);
  if (key !== row.id) {
    setKey(row.id);
    setDraft(row);
  }

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="flex gap-2">
          {onDelete && (
            <button type="button" onClick={onDelete} className={buttonStyles.ghost}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onSave(pickFields(draft, fields))}
            className={buttonStyles.primary}
          >
            <Save className="mr-1 h-4 w-4" /> Save
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={draft[field.key]}
            onChange={(value) => setDraft((d) => ({ ...d, [field.key]: value }))}
          />
        ))}
      </div>
    </div>
  );
}

function pickFields(row: Row, fields: Field[]) {
  const values: Row = {};
  for (const field of fields) {
    let value = row[field.key];
    if (field.type === "number") value = value === "" || value == null ? null : Number(value);
    if (value === "") value = null;
    values[field.key] = value;
  }
  return values;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: any;
  onChange: (value: any) => void;
}) {
  const label = <span className="mb-1 block text-xs text-muted-foreground">{field.label}</span>;

  if (field.type === "bool") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <label className="block">
        {label}
        <select className={inputClass} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (field.type === "textarea") {
    return (
      <label className="block sm:col-span-2">
        {label}
        <textarea
          rows={3}
          className={inputClass}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }
  return (
    <label className="block">
      {label}
      <input
        className={inputClass}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function CollectionEditor({
  title,
  fields,
  rows,
  defaults,
  labelOf,
  activeId,
  onSelect,
  onSave,
  onDelete,
}: {
  table: string;
  title: string;
  fields: Field[];
  rows: Row[];
  defaults: () => Row;
  labelOf: (row: Row) => string;
  activeId?: string | null;
  onSelect?: (id: string) => void;
  onSave: (values: Row, id?: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const [localId, setLocalId] = useState<string | null>(null);
  const currentId = activeId ?? localId;
  const active = rows.find((r) => r.id === currentId) ?? rows[0] ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <RowList
        title={title}
        rows={rows}
        activeId={active?.id ?? null}
        labelOf={labelOf}
        onSelect={(id) => {
          setLocalId(id);
          onSelect?.(id);
        }}
        onCreate={() => onSave(defaults(), null)}
      />
      {active && (
        <RowForm
          title={title}
          fields={fields}
          row={active}
          onSave={(values) => onSave(values, active.id)}
          onDelete={() => onDelete(active.id)}
        />
      )}
    </div>
  );
}

function ChildList({
  title,
  fields,
  rows,
  onCreate,
  onSave,
  onDelete,
}: {
  title: string;
  fields: Field[];
  rows: Row[];
  onCreate: () => void;
  onSave: (values: Row, id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button type="button" onClick={onCreate} className={buttonStyles.outline}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </button>
      </div>
      <div className="space-y-4">
        {rows.map((row) => (
          <RowForm
            key={row.id}
            title={row.title ?? row.label ?? "Item"}
            fields={fields}
            row={row}
            onSave={(values) => onSave(values, row.id)}
            onDelete={() => onDelete(row.id)}
          />
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
      </div>
    </div>
  );
}

function StructureEditor({
  program,
  graph,
  onSave,
  onDelete,
}: {
  program: Row;
  graph: any;
  onSave: (table: string, values: Row, id?: string | null) => void;
  onDelete: (table: string, id: string) => void;
}) {
  const sections = (graph?.sections ?? []).filter((s: Row) => s.program_id === program.id);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [openSublesson, setOpenSublesson] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Structure</h2>
        <button
          type="button"
          className={buttonStyles.outline}
          onClick={() =>
            onSave("program_sections", {
              program_id: program.id,
              title: `Section ${sections.length + 1}`,
              sequence: sections.length,
            })
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Section
        </button>
      </div>

      <div className="space-y-4">
        {sections.map((section: Row) => {
          const lessons = (graph?.lessons ?? []).filter((l: Row) => l.section_id === section.id);
          const expanded = openSection === section.id;
          return (
            <div key={section.id} className="rounded-xl border border-border/70 p-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-left text-sm font-medium"
                  onClick={() => setOpenSection(expanded ? null : section.id)}
                >
                  {section.title} · {lessons.length} days
                </button>
                <button
                  type="button"
                  className={buttonStyles.ghost}
                  onClick={() => onDelete("program_sections", section.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {expanded && (
                <div className="mt-3 space-y-4">
                  <RowForm
                    title="Section"
                    fields={SECTION_FIELDS}
                    row={section}
                    onSave={(values) => onSave("program_sections", values, section.id)}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={buttonStyles.outline}
                      onClick={() =>
                        onSave("program_lessons", {
                          section_id: section.id,
                          title: `Day ${lessons.length + 1}`,
                          sequence: lessons.length,
                          day_number: lessons.length + 1,
                        })
                      }
                    >
                      <Plus className="mr-1 h-4 w-4" /> Day / lesson
                    </button>
                  </div>

                  {lessons.map((lesson: Row) => {
                    const sublessons = (graph?.sublessons ?? []).filter(
                      (s: Row) => s.lesson_id === lesson.id,
                    );
                    const lessonOpen = openLesson === lesson.id;
                    return (
                      <div key={lesson.id} className="rounded-xl border border-border/60 p-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            className="text-left text-sm"
                            onClick={() => setOpenLesson(lessonOpen ? null : lesson.id)}
                          >
                            {lesson.title} · {lesson.day_type} · {sublessons.length} sub-lessons
                          </button>
                          <button
                            type="button"
                            className={buttonStyles.ghost}
                            onClick={() => onDelete("program_lessons", lesson.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {lessonOpen && (
                          <div className="mt-3 space-y-4">
                            <RowForm
                              title="Day"
                              fields={LESSON_FIELDS}
                              row={lesson}
                              onSave={(values) => onSave("program_lessons", values, lesson.id)}
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                className={buttonStyles.outline}
                                onClick={() =>
                                  onSave("program_sublessons", {
                                    lesson_id: lesson.id,
                                    title: `Sub-lesson ${sublessons.length + 1}`,
                                    sequence: sublessons.length,
                                  })
                                }
                              >
                                <Plus className="mr-1 h-4 w-4" /> Sub-lesson
                              </button>
                            </div>

                            {sublessons.map((sublesson: Row) => {
                              const videos = (graph?.associatedVideos ?? []).filter(
                                (v: Row) => v.sublesson_id === sublesson.id,
                              );
                              const subOpen = openSublesson === sublesson.id;
                              return (
                                <div
                                  key={sublesson.id}
                                  className="rounded-lg border border-border/50 p-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <button
                                      type="button"
                                      className="text-left text-sm"
                                      onClick={() =>
                                        setOpenSublesson(subOpen ? null : sublesson.id)
                                      }
                                    >
                                      {sublesson.title}
                                      {sublesson.vimeo_id ? ` · ${sublesson.vimeo_id}` : ""}
                                    </button>
                                    <button
                                      type="button"
                                      className={buttonStyles.ghost}
                                      onClick={() =>
                                        onDelete("program_sublessons", sublesson.id)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                  {subOpen && (
                                    <div className="mt-3 space-y-4">
                                      <RowForm
                                        title="Sub-lesson"
                                        fields={SUBLESSON_FIELDS}
                                        row={sublesson}
                                        onSave={(values) =>
                                          onSave("program_sublessons", values, sublesson.id)
                                        }
                                      />
                                      <ChildList
                                        title="Associated videos"
                                        fields={ASSOCIATED_FIELDS}
                                        rows={videos}
                                        onCreate={() =>
                                          onSave("sublesson_videos", {
                                            sublesson_id: sublesson.id,
                                            title: "New video",
                                            vimeo_id: "",
                                            sequence: videos.length,
                                          })
                                        }
                                        onSave={(values, id) =>
                                          onSave("sublesson_videos", values, id)
                                        }
                                        onDelete={(id) => onDelete("sublesson_videos", id)}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {!sections.length && (
          <p className="text-sm text-muted-foreground">No sections yet — add the first one.</p>
        )}
      </div>
    </div>
  );
}
