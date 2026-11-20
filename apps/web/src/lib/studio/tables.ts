import { z } from "zod";

/**
 * Field and table configs that drive the generic studio forms and server actions.
 * Plain data + zod: imported by Client Components (forms) and Server Actions (validation).
 */
export type FieldKind = "text" | "long" | "int" | "bool" | "select" | "datetime" | "json" | "lines" | "ints" | "id";
export type Field = {
  name: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  required?: boolean;
  help?: string;
  wide?: boolean;
  /** Column is NOT NULL with no usable null: empty string stays "". */
  notNull?: boolean;
};
export type TableCfg = {
  label: string;
  pk: readonly string[];
  fields: readonly Field[];
  /** Sibling scope columns for ordering by `position`. */
  scope?: readonly string[];
  positioned?: boolean;
  /** Primary key must be typed in on create (text ids). */
  typedId?: boolean;
  /** Primary label column used in audit detail. */
  title?: string;
};

const t = (name: string, label: string, o: Partial<Field> = {}): Field => ({ name, label, kind: "text", ...o });
const long = (name: string, label: string, o: Partial<Field> = {}): Field => ({ name, label, kind: "long", wide: true, ...o });
const int = (name: string, label: string, o: Partial<Field> = {}): Field => ({ name, label, kind: "int", ...o });
const bool = (name: string, label: string, o: Partial<Field> = {}): Field => ({ name, label, kind: "bool", ...o });
const sel = (name: string, label: string, options: readonly string[], o: Partial<Field> = {}): Field => ({ name, label, kind: "select", options, ...o });
const dt = (name: string, label: string, o: Partial<Field> = {}): Field => ({ name, label, kind: "datetime", ...o });
const json = (name: string, label: string, o: Partial<Field> = {}): Field => ({ name, label, kind: "json", wide: true, ...o });
const lines = (name: string, label: string, o: Partial<Field> = {}): Field => ({ name, label, kind: "lines", wide: true, ...o });

export const PROGRAM_TYPES = ["course", "day_program", "challenge", "live", "retreat", "coaching", "tool", "bundle"] as const;
export const CONTENT_STATUS = ["draft", "published", "archived"] as const;
export const CATALOG_GROUPS = ["training", "experiences", "free"] as const;
export const MODES = ["immersion", "self_guided", "library"] as const;
export const STEP_SPECIAL = ["none", "readiness", "workout", "overview", "completion"] as const;
export const STEP_KINDS = ["video", "workout", "warmup", "mobility", "recovery", "lifestyle", "text", "download", "link"] as const;
export const OUTCOMES = ["workout", "recovery", "rest"] as const;
export const PLACEMENTS = ["today", "program_page", "program_complete", "tool_result", "checkout", "library", "you"] as const;
export const TARGET_KINDS = ["url", "program", "plan", "coaching", "run"] as const;
export const APPLICATION_STATUS = ["submitted", "call_booked", "accepted", "waitlist", "declined", "booked", "cancelled"] as const;
export const LEAD_STATUS = ["new", "contacted", "booked", "closed"] as const;
export const REQUEST_STATUS = ["open", "in_progress", "done", "withdrawn"] as const;
export const FULFILLMENT = ["processing", "shipped", "delivered"] as const;
export const RUN_STATUS = ["upcoming", "open", "full", "past", "cancelled"] as const;

export const TABLES = {
  programs: {
    label: "Program", pk: ["id"], title: "name", positioned: true,
    fields: [
      t("name", "Name", { required: true }), t("slug", "Slug", { required: true, help: "Lowercase, dashes. Used in URLs." }),
      sel("type", "Type", PROGRAM_TYPES, { required: true }), sel("status", "Status", CONTENT_STATUS, { required: true }),
      sel("catalog_group", "Catalog group", CATALOG_GROUPS, { required: true }),
      t("tagline", "Tagline"), t("level", "Level"), t("audience", "Audience"),
      long("summary", "Summary"), long("description", "Description (markdown)"),
      lines("highlights", "Highlights", { help: "One per line." }),
      t("format_label", "Format label"), t("duration_label", "Duration label"),
      t("section_label", "Section label", { required: true, notNull: true, help: "What sections are called: Phase, Week, Section." }),
      t("lesson_label", "Lesson label", { required: true, notNull: true, help: "What lessons are called: Day, Lesson." }),
      bool("is_free", "Free"), bool("is_listed", "Listed in catalog"), bool("sequence_locked", "Lessons unlock in order"),
      long("draft_note", "Draft note", { help: "Shown to admins only: what is still awaiting Mike." }),
    ],
  },
  program_paths: {
    label: "Path", pk: ["id"], scope: ["program_id"], positioned: true, title: "name",
    fields: [t("name", "Name", { required: true }), t("short_name", "Short name"), t("key", "Key"), sel("kind", "Kind", ["level", "focus"], { required: true, notNull: true }), long("description", "Description"), json("meta", "Meta (JSON)")],
  },
  program_media: {
    label: "Image", pk: ["id"], scope: ["program_id"], positioned: true, title: "alt",
    fields: [t("url", "Image URL", { required: true, wide: true }), sel("role", "Role", ["hero", "card", "gallery"], { required: true, notNull: true }), t("alt", "Alt text", { required: true, notNull: true })],
  },
  sections: {
    label: "Section", pk: ["id"], scope: ["program_id", "path_id"], positioned: true, title: "title",
    fields: [t("title", "Title", { required: true, notNull: true }), t("label", "Label"), t("subtitle", "Subtitle"), long("description", "Description"), t("key", "Key"), json("release_rule", "Release rule (JSON)"), json("meta", "Meta (JSON)")],
  },
  lessons: {
    label: "Lesson", pk: ["id"], scope: ["section_id"], positioned: true, title: "title",
    fields: [
      t("title", "Title", { required: true, notNull: true }), t("day_type", "Day type", { help: "e.g. Workout, Recovery, Skill, Challenge, Overview." }), int("day_number", "Day number"),
      t("focus", "Focus"), long("intro", "Intro"), int("estimated_minutes", "Minutes"),
      t("form_id", "Readiness form id", { help: "Pick from Readiness. Leave empty for none." }), t("starter_table_id", "Starter table id"),
      t("page_type", "Page type"), t("key", "Key"), json("meta", "Meta (JSON)"),
    ],
  },
  steps: {
    label: "Step", pk: ["id"], scope: ["lesson_id"], positioned: true, title: "title",
    fields: [
      t("title", "Title", { required: true, notNull: true }), sel("kind", "Kind", STEP_KINDS), sel("special", "Special", STEP_SPECIAL, { required: true, notNull: true, help: "readiness / workout steps render the form and table." }),
      t("duration_label", "Duration label"), bool("is_required", "Required"), long("description", "Description"), long("body", "Notes (markdown)"),
      json("attachments", "Attachments (JSON list of {title,url,kind})", { notNull: true }), t("key", "Key"),
    ],
  },
  step_videos: {
    label: "Clip", pk: ["id"], scope: ["step_id"], positioned: true, title: "title",
    fields: [t("title", "Title", { notNull: true }), t("video_id", "Video id", { required: true, help: "Pick from Library; id of a videos row." })],
  },
  resources: {
    label: "Resource", pk: ["id"], scope: ["program_id"], positioned: true, title: "title",
    fields: [t("title", "Title", { required: true }), t("url", "URL", { required: true }), t("kind", "Kind", { notNull: true })],
  },
  intake_forms: {
    label: "Intake form", pk: ["id"], title: "title",
    fields: [t("title", "Title", { required: true }), t("key", "Key"), long("introduction", "Introduction"), bool("is_published", "Published"), int("version", "Version"), json("questions", "Questions (JSON)", { notNull: true }), json("result_rules", "Result rules (JSON)", { notNull: true })],
  },
  forms: {
    label: "Readiness form", pk: ["id"], typedId: true, title: "title",
    fields: [t("title", "Title", { required: true }), int("max_score", "Max score", { required: true }), t("default_table_id", "Default table id")],
  },
  form_questions: {
    label: "Question", pk: ["form_id", "key"], scope: ["form_id"], positioned: true, title: "prompt",
    fields: [t("key", "Key", { required: true }), long("prompt", "Prompt", { required: true, notNull: true }), json("options", "Options (JSON: [{label, weight}])", { notNull: true }), json("note", "Note (JSON)")],
  },
  form_bands: {
    label: "Band", pk: ["id"], scope: ["form_id"], positioned: true, title: "name",
    fields: [t("name", "Name", { required: true, notNull: true }), t("band", "Colour", { required: true, notNull: true, help: "green, yellow, red, ..." }), sel("outcome", "Outcome", OUTCOMES, { required: true }), int("min_score", "Min score", { required: true }), int("max_score", "Max score", { required: true }), t("table_id", "Workout table id"), long("message", "Message", { notNull: true })],
  },
  workout_tables: {
    label: "Workout table", pk: ["id"], typedId: true, title: "title",
    fields: [t("title", "Title", { required: true }), long("notes", "Notes"), json("rows", "Rows (JSON)", { notNull: true }), json("images", "Images (JSON)", { notNull: true })],
  },
  videos: {
    label: "Video", pk: ["id"], title: "title",
    fields: [t("title", "Title", { required: true }), sel("provider", "Provider", ["vimeo", "youtube", "file"], { required: true, notNull: true }), t("provider_id", "Provider id", { required: true }), t("privacy_hash", "Vimeo privacy key"), int("duration_seconds", "Seconds"), t("category", "Category"), t("level", "Level"), t("thumbnail_url", "Thumbnail URL"), long("description", "Description"), bool("needs_key", "Needs key")],
  },
  tags: { label: "Tag", pk: ["id"], title: "name", fields: [t("name", "Name", { required: true }), t("slug", "Slug", { required: true }), t("namespace", "Namespace", { required: true, notNull: true })] },
  plans: {
    label: "Plan", pk: ["id"], typedId: true, title: "name",
    fields: [t("name", "Name", { required: true }), t("tagline", "Tagline"), int("rank", "Rank", { required: true }), lines("features", "Features"), bool("is_active", "Active"), long("draft_note", "Draft note")],
  },
  prices: {
    label: "Price", pk: ["id"], title: "label",
    fields: [sel("kind", "Applies to", ["plan", "program", "coaching", "run", "bundle"], { required: true, notNull: true }), t("ref_id", "Reference id", { required: true, help: "Plan id, or program / coaching package / run uuid." }), t("label", "Label"), int("amount_cents", "Amount (cents)", { required: true }), t("currency", "Currency", { required: true, notNull: true }), sel("interval", "Interval", ["one_time", "month", "year"], { required: true, notNull: true }), int("access_days", "Access days"), t("stripe_price_id", "Stripe price id"), t("revenuecat_product_id", "RevenueCat product"), bool("is_active", "Active"), long("draft_note", "Draft note")],
  },
  coupons: {
    label: "Coupon", pk: ["id"], title: "code",
    fields: [t("code", "Code", { required: true }), int("percent_off", "Percent off"), int("amount_off_cents", "Amount off (cents)"), int("max_redemptions", "Max redemptions"), dt("expires_at", "Expires"), t("stripe_coupon_id", "Stripe coupon id"), json("applies_to", "Applies to (JSON)", { notNull: true }), bool("is_active", "Active")],
  },
  offers: {
    label: "Offer", pk: ["id"], title: "name",
    fields: [
      t("name", "Internal name", { required: true }), bool("is_active", "Active"), int("priority", "Priority", { required: true, help: "Lower number wins." }),
      json("trigger", "Trigger (JSON)", { notNull: true }), json("audience", "Audience (JSON)", { notNull: true }),
      lines("placements", "Placements", { help: "One per line. " + PLACEMENTS.join(", ") }),
      sel("target_kind", "Target kind", TARGET_KINDS, { required: true }), t("target_ref", "Target", { required: true, help: "URL, program id, plan id, coaching package id…" }),
      t("headline", "Headline", { required: true }), long("body", "Body"), t("cta_label", "Button label", { required: true }), t("image_url", "Image URL"),
      int("max_views", "Max views", { required: true }), int("cooldown_days", "Cooldown days", { required: true }), dt("starts_at", "Starts"), dt("ends_at", "Ends"), t("coupon_id", "Coupon id"),
    ],
  },
  program_runs: {
    label: "Run", pk: ["id"], title: "name",
    fields: [t("program_id", "Program id", { required: true }), t("name", "Name", { required: true }), sel("status", "Status", RUN_STATUS, { required: true, notNull: true }), dt("starts_at", "Starts", { required: true }), dt("ends_at", "Ends"), t("timezone", "Timezone", { required: true, notNull: true }), int("capacity", "Capacity"), t("price_note", "Price note"), bool("requires_application", "Requires application"), json("location", "Location (JSON)", { notNull: true }), json("details", "Details (JSON)", { notNull: true }), json("gallery", "Gallery (JSON: [{url, caption}])", { notNull: true }), long("draft_note", "Draft note")],
  },
  itinerary_items: {
    label: "Itinerary item", pk: ["id"], scope: ["run_id"], positioned: true, title: "title",
    fields: [t("title", "Title", { required: true, notNull: true }), int("day_index", "Day", { required: true }), dt("starts_at", "Starts"), t("location", "Location"), long("description", "Description")],
  },
  run_applications: {
    label: "Application", pk: ["id"], title: "id",
    fields: [sel("status", "Status", APPLICATION_STATUS, { required: true, notNull: true }), long("admin_note", "Admin note")],
  },
  coaching_packages: {
    label: "Package", pk: ["id"], positioned: true, title: "name",
    fields: [t("name", "Name", { required: true }), t("program_id", "Program id"), sel("format", "Format", ["one_to_one", "group"], { required: true, notNull: true }), int("sessions", "Sessions", { required: true }), int("duration_minutes", "Minutes", { required: true }), bool("requires_application", "Requires application"), bool("is_active", "Active"), long("description", "Description")],
  },
  coaching_slots: {
    label: "Slot", pk: ["id"], title: "starts_at",
    fields: [dt("starts_at", "Starts", { required: true }), int("duration_minutes", "Minutes", { required: true }), bool("is_open", "Open")],
  },
  coaching_bookings: {
    label: "Booking", pk: ["id"], title: "id",
    fields: [sel("status", "Status", ["booked", "completed", "cancelled", "no_show"], { required: true, notNull: true }), t("meeting_url", "Meeting URL"), long("coach_note", "Coach note"), long("homework", "Homework (one highest-priority thing)")],
  },
  organizations: {
    label: "Organization", pk: ["id"], title: "name",
    fields: [t("name", "Name", { required: true }), t("slug", "Slug", { required: true }), sel("status", "Status", ["active", "grace", "suspended"], { required: true, notNull: true }), int("seats", "Seats", { required: true }), t("plan_id", "Plan id"), t("join_domain", "Join domain"), t("logo_url", "Logo URL"), bool("is_partner", "Partner"), int("revenue_share_percent", "Revenue share %"), dt("grace_until", "Grace until")],
  },
  notices: {
    label: "Notice", pk: ["id"], positioned: true, title: "title",
    fields: [t("title", "Title"), long("body", "Body", { required: true, notNull: true }), sel("placement", "Placement", ["banner", "today", "program_page", "you"], { required: true, notNull: true }), json("audience", "Audience (JSON)", { notNull: true }), t("link_label", "Link label"), t("link_url", "Link URL"), dt("starts_at", "Starts"), dt("ends_at", "Ends"), bool("is_active", "Active")],
  },
  coaching_live_sessions: {
    label: "Live session", pk: ["id"], title: "title",
    fields: [
      t("title", "Title", { required: true }), dt("starts_at", "Starts", { required: true, help: "Your local time." }), int("duration_minutes", "Minutes", { required: true }),
      t("series", "Series", { required: true, notNull: true, help: "zen-savage" }), long("summary", "Summary"),
      t("join_url", "Join link", { wide: true }), t("replay_url", "Replay URL", { wide: true }), t("replay_thumb", "Replay thumbnail URL", { wide: true }),
      bool("is_published", "Published"), long("draft_note", "Draft note", { help: "Shown to admins only. Clear it to confirm the date." }),
    ],
  },
  podcast_episodes: {
    label: "Episode", pk: ["id"], positioned: true, title: "title",
    fields: [t("title", "Title", { required: true }), t("show", "Show", { required: true, notNull: true, help: "king-within" }), t("published_on", "Published on", { help: "YYYY-MM-DD" }), t("url", "Episode link", { required: true, wide: true }), t("image_url", "Image URL", { wide: true }), bool("is_published", "Published")],
  },
  retreat_leads: {
    label: "Enquiry", pk: ["id"], title: "email",
    fields: [sel("status", "Status", LEAD_STATUS, { required: true, notNull: true }), long("admin_note", "Note")],
  },
  account_requests: {
    label: "Request", pk: ["id"], title: "kind",
    fields: [sel("status", "Status", REQUEST_STATUS, { required: true, notNull: true }), long("admin_note", "Note")],
  },
  site_settings: { label: "Setting", pk: ["key"], title: "key", fields: [t("key", "Key", { required: true }), json("value", "Value (JSON)", { required: true, notNull: true })] },
} as const satisfies Record<string, TableCfg>;

export type TableName = keyof typeof TABLES;
export const cfg = (t: string): TableCfg | undefined => (TABLES as Record<string, TableCfg>)[t];

/** Database value -> raw form string. */
export function toRaw(f: Field, v: unknown): string | boolean {
  if (f.kind === "bool") return Boolean(v);
  if (v === null || v === undefined) return "";
  if (f.kind === "json") return JSON.stringify(v, null, 2);
  if (f.kind === "lines") return Array.isArray(v) ? v.join("\n") : "";
  if (f.kind === "ints") return Array.isArray(v) ? v.join(", ") : "";
  if (f.kind === "datetime") return String(v).slice(0, 16);
  return String(v);
}

/** zod for one field: raw form value -> database value. */
export function fieldSchema(f: Field) {
  const empty = (s: unknown) => s === undefined || s === null || (typeof s === "string" && s.trim() === "");
  const req = (ctx: z.RefinementCtx) => ctx.addIssue({ code: "custom", message: `${f.label} is required` });
  return z.any().transform((raw, ctx): unknown => {
    if (f.kind === "bool") return raw === true || raw === "true" || raw === "on";
    const s = typeof raw === "string" ? raw.trim() : raw;
    if (empty(s)) {
      if (f.required && f.kind !== "lines") { req(ctx); return z.NEVER; }
      if (f.kind === "lines") return [];
      if (f.kind === "json") return f.notNull ? {} : null;
      return f.notNull ? "" : null;
    }
    switch (f.kind) {
      case "int": {
        const n = Number(s);
        if (!Number.isInteger(n)) { ctx.addIssue({ code: "custom", message: `${f.label} must be a whole number` }); return z.NEVER; }
        return n;
      }
      case "ints": return String(s).split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n));
      case "lines": return String(s).split("\n").map((x) => x.trim()).filter(Boolean);
      case "datetime": {
        const d = new Date(String(s));
        if (Number.isNaN(d.getTime())) { ctx.addIssue({ code: "custom", message: `${f.label} is not a valid date` }); return z.NEVER; }
        return d.toISOString();
      }
      case "json":
        try { return JSON.parse(String(s)); } catch { ctx.addIssue({ code: "custom", message: `${f.label} is not valid JSON` }); return z.NEVER; }
      case "select":
        if (!f.options!.includes(String(s))) { ctx.addIssue({ code: "custom", message: `${f.label}: pick one of ${f.options!.join(", ")}` }); return z.NEVER; }
        return s;
      default: return s;
    }
  });
}

/** Validate only the keys supplied. Returns database-ready values or a list of messages. */
export function parseValues(c: TableCfg, values: Record<string, unknown>, creating: boolean): { ok: true; data: Record<string, unknown> } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const data: Record<string, unknown> = {};
  for (const f of c.fields) {
    if (!(f.name in values)) {
      if (creating && f.required) errors.push(`${f.label} is required`);
      continue;
    }
    const r = fieldSchema(f).safeParse(values[f.name]);
    if (r.success) data[f.name] = r.data;
    else errors.push(...r.error.issues.map((i) => i.message));
  }
  if (c.typedId && creating) {
    const id = String(values.id ?? "").trim();
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) errors.push("Id: letters, numbers, dashes");
    else data.id = id;
  }
  return errors.length ? { ok: false, errors } : { ok: true, data };
}

/** Pull a Vimeo id and privacy hash out of whatever the admin pasted. */
export function parseVimeo(input: string): { id: string; hash: string | null } | null {
  const s = input.trim();
  let m = s.match(/player\.vimeo\.com\/video\/(\d+)(?:\?[^#]*?\bh=([0-9a-f]+))?/i);
  if (m) return { id: m[1]!, hash: m[2] ?? null };
  m = s.match(/vimeo\.com\/(?:[a-z]+\/)*(\d{5,})(?:\/([0-9a-f]{6,}))?/i);
  if (m) return { id: m[1]!, hash: m[2] ?? null };
  m = s.match(/^(\d{5,})(?:[\/:\s]+([0-9a-f]{6,}))?$/i);
  if (m) return { id: m[1]!, hash: m[2] ?? null };
  return null;
}
