import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, CalendarDays, LayoutGrid, Lock, Megaphone, PanelsTopLeft, Save, Tags } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import { DatabaseProgramCard } from "@/components/database-program-card";
import { getContentGraph, getIsAdmin } from "@/lib/admin-content.functions";
import {
  getSiteSettings,
  saveProgramMerch,
  saveSiteSetting,
  type Announcement,
  type HomeSettings,
  type ProgramsPageSettings,
  type RetreatCohort,
} from "@/lib/site-settings.functions";
import { listRetreatApplications, updateRetreatApplication, type RetreatApplication } from "@/lib/retreat-applications.functions";
import { retreats as baseRetreats } from "@/content/retreats";
import { applyCohort } from "@/hooks/use-retreats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Studio — Mike Salemi App" },
      { name: "description", content: "Manage pricing, offers, copy, placement and announcements." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Studio — Mike Salemi App" },
      { property: "og:description", content: "Manage pricing, offers, copy, placement and announcements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminStudio,
});

const GROUPS = [
  { id: "mastery", label: "Technique & progressions" },
  { id: "athletic", label: "Strength & conditioning" },
  { id: "mind-body", label: "Recovery & inner work" },
];

const TABS = [
  { id: "programs", label: "Pricing, offers & placement", icon: Tags },
  { id: "announcement", label: "Announcement bar", icon: Megaphone },
  { id: "copy", label: "Main copy", icon: PanelsTopLeft },
  { id: "retreats", label: "Retreats & applications", icon: CalendarDays },
] as const;

const input = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

function AdminStudio() {
  const isAdminFn = useServerFn(getIsAdmin);
  const { data: admin, isLoading } = useQuery({ queryKey: ["admin-check"], queryFn: () => isAdminFn() });
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("programs");

  if (isLoading) return <AppShell><div className="grid min-h-[50vh] place-items-center"><Spinner /></div></AppShell>;
  if (!admin?.isAdmin) {
    return (
      <AppShell>
        <Section>
          <div className="glass-panel mx-auto max-w-md rounded-3xl p-8 text-center">
            <Lock className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Restricted</h1>
            <p className="mt-2 text-sm text-muted-foreground">This area is only available to administrators.</p>
          </div>
        </Section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHead eyebrow="Admin studio" title="Run the academy" lede="Prices, offers, badges, page copy, catalog placement and the announcement bar — changes go live for members immediately." />
      <Section>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("tap inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold", tab === t.id ? "bg-primary text-primary-foreground" : "border border-border bg-surface text-muted-foreground")}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
          <Link to="/admin/content" className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <LayoutGrid className="h-4 w-4" /> Lessons, library, retreats & coaching <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {tab === "programs" && <ProgramsPanel />}
        {tab === "announcement" && <AnnouncementPanel />}
        {tab === "copy" && <CopyPanel />}
        {tab === "retreats" && <RetreatsPanel />}
      </Section>
    </AppShell>
  );
}

function useSettings() {
  const fn = useServerFn(getSiteSettings);
  return useQuery({ queryKey: ["site-settings"], queryFn: () => fn() });
}

function useSaveSetting() {
  const qc = useQueryClient();
  const fn = useServerFn(saveSiteSetting);
  return useMutation({
    mutationFn: (v: { key: "announcement" | "home" | "programs_page" | "retreats"; value: Record<string, unknown> }) => fn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["site-settings"] }); toast.success("Saved — live now"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ---------------- Programs: pricing, offers, placement ---------------- */

type Draft = {
  id: string; name: string; summary: string; status: "draft" | "published" | "archived";
  price: string; included: boolean; sort: number; badge: string; offer: string; group: string; featured: boolean; cta: string;
  image: string | null; highlights: string[]; slug: string;
};

function toDraft(p: Record<string, any>): Draft {
  const m = (p.meta ?? {}) as Record<string, any>;
  return {
    id: p.id, slug: p.slug, name: p.name ?? "", summary: p.summary ?? "", status: p.status ?? "draft",
    price: p.price_cents == null ? "" : (p.price_cents / 100).toFixed(2), included: Boolean(p.included_in_subscription),
    sort: p.sort_order ?? 0, badge: m.badge ?? "", offer: m.offer ?? "", group: m.catalogGroup ?? "", featured: Boolean(m.featured),
    cta: m.ctaLabel ?? "", image: p.hero_image_url ?? null, highlights: Array.isArray(m.highlights) ? m.highlights : [],
  };
}

function ProgramsPanel() {
  const graphFn = useServerFn(getContentGraph);
  const saveFn = useServerFn(saveProgramMerch);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-content"], queryFn: () => graphFn() });
  const programs = useMemo(() => [...(data?.programs ?? [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [data]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = programs.find((p: any) => p.id === activeId) ?? programs[0];
  const [d, setD] = useState<Draft | null>(null);
  useEffect(() => { if (active) setD(toDraft(active)); }, [active?.id, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: (x: Draft) => {
      const price = x.price.trim() === "" ? null : Math.round(Number(x.price) * 100);
      if (price != null && (!Number.isFinite(price) || price < 0)) throw new Error("Enter a valid price");
      return saveFn({ data: {
        id: x.id, name: x.name, summary: x.summary || null, status: x.status, price_cents: price,
        included_in_subscription: x.included, sort_order: Number(x.sort) || 0,
        meta: { badge: x.badge, offer: x.offer, catalogGroup: x.group, featured: x.featured, ctaLabel: x.cta },
      } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-content"] }); qc.invalidateQueries({ queryKey: ["courses"] }); toast.success("Program saved — live now"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !d) return <Spinner />;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v });

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <div className="glass-panel max-h-[70vh] overflow-y-auto rounded-3xl p-2">
        {programs.map((p: any) => (
          <button key={p.id} type="button" onClick={() => setActiveId(p.id)} className={cn("no-btn flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-sm", p.id === active?.id ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-secondary")}>
            <span className="truncate">{p.name}</span>
            <span className="shrink-0 text-[0.65rem] uppercase text-muted-foreground">{p.status}</span>
          </button>
        ))}
      </div>

      <div className="glass-panel space-y-6 rounded-3xl p-6">
        <Group title="Main copy">
          <F label="Program name"><input className={input} value={d.name} onChange={(e) => set("name", e.target.value)} /></F>
          <F label="Card summary" wide><textarea rows={3} className={input} value={d.summary} onChange={(e) => set("summary", e.target.value)} /></F>
          <F label="Button label"><input className={input} placeholder="Open program" value={d.cta} onChange={(e) => set("cta", e.target.value)} /></F>
        </Group>
        <Group title="Pricing & access">
          <F label="Price (USD)"><input className={input} inputMode="decimal" placeholder="Free / not for sale" value={d.price} onChange={(e) => set("price", e.target.value)} /></F>
          <F label="Visibility">
            <select className={input} value={d.status} onChange={(e) => set("status", e.target.value as Draft["status"])}>
              <option value="published">Published</option><option value="draft">Draft (hidden)</option><option value="archived">Archived</option>
            </select>
          </F>
          <Toggle label="Included for all members" checked={d.included} onChange={(v) => set("included", v)} />
        </Group>
        <Group title="Offer & badge">
          <F label="Badge"><input className={input} placeholder="New, Most popular…" value={d.badge} onChange={(e) => set("badge", e.target.value)} /></F>
          <F label="Offer line" wide><input className={input} placeholder="e.g. Founding members save 20% — Preview" value={d.offer} onChange={(e) => set("offer", e.target.value)} /></F>
        </Group>
        <Group title="Placement">
          <F label="Programs page section">
            <select className={input} value={d.group} onChange={(e) => set("group", e.target.value)}>
              <option value="">Automatic</option>
              {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </F>
          <F label="Order (lower shows first)"><input type="number" className={input} value={d.sort} onChange={(e) => set("sort", Number(e.target.value))} /></F>
          <Toggle label="Feature on Home (when member has no progress)" checked={d.featured} onChange={(v) => set("featured", v)} />
        </Group>
        <div className="flex justify-end">
          <button type="button" disabled={save.isPending} onClick={() => save.mutate(d)} className={buttonStyles.primary}>
            {save.isPending ? <Spinner /> : <Save className="h-4 w-4" />} Save program
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="eyebrow text-muted-foreground">Live preview</p>
        <DatabaseProgramCard course={{
          id: d.id, slug: d.slug, name: d.name, summary: d.summary, image: d.image, instructor: "Mike Salemi", highlights: d.highlights,
          sectionCount: 0, lessonCount: 0, included: d.included, access: d.included ? "included" : "locked",
          badge: d.badge || null, offer: d.offer || null, ctaLabel: d.cta || null,
        }} />
        <p className="text-xs text-muted-foreground">{d.price ? `Price shown on checkout: $${d.price}` : "No price set"} · Checkout stays Preview until payments are connected.</p>
      </div>
    </div>
  );
}

/* ---------------- Announcement bar ---------------- */

function AnnouncementPanel() {
  const { data } = useSettings();
  const save = useSaveSetting();
  const [a, setA] = useState<Announcement | null>(null);
  useEffect(() => { if (data) setA(data.announcement); }, [data]);
  if (!a) return <Spinner />;
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-hairline">
        <div className="announce-bar flex items-center justify-center gap-3 px-4 py-2 text-[0.8125rem]">
          {a.badge && <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider">{a.badge}</span>}
          <span className="font-medium">{a.text || "Your announcement text"}</span>
          {a.linkLabel && <span className="inline-flex items-center gap-1 font-semibold">{a.linkLabel} <ArrowRight className="h-3.5 w-3.5" /></span>}
        </div>
      </div>
      <div className="glass-panel space-y-5 rounded-3xl p-6">
        <Group title="Announcement">
          <Toggle label="Show to all members" checked={a.enabled} onChange={(v) => setA({ ...a, enabled: v })} />
          <F label="Badge"><input className={input} value={a.badge} placeholder="New, Live, Preview" onChange={(e) => setA({ ...a, badge: e.target.value })} /></F>
          <F label="Message" wide><input className={input} value={a.text} onChange={(e) => setA({ ...a, text: e.target.value })} /></F>
          <F label="Link label"><input className={input} value={a.linkLabel} onChange={(e) => setA({ ...a, linkLabel: e.target.value })} /></F>
          <F label="Link (e.g. /retreats or https://…)"><input className={input} value={a.linkTo} onChange={(e) => setA({ ...a, linkTo: e.target.value })} /></F>
        </Group>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={buttonStyles.outline} onClick={() => save.mutate({ key: "announcement", value: { ...a, id: String(Date.now()) } })}>Save & show again to everyone</button>
          <button type="button" className={buttonStyles.primary} onClick={() => save.mutate({ key: "announcement", value: a })}><Save className="h-4 w-4" /> Save</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Main copy ---------------- */

function CopyPanel() {
  const { data } = useSettings();
  const save = useSaveSetting();
  const [home, setHome] = useState<HomeSettings | null>(null);
  const [pp, setPp] = useState<ProgramsPageSettings | null>(null);
  useEffect(() => { if (data) { setHome(data.home); setPp(data.programs_page); } }, [data]);
  if (!home || !pp) return <Spinner />;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="glass-panel space-y-5 rounded-3xl p-6">
        <Group title="Home page">
          <F label="Hero label (new members)"><input className={input} placeholder="Featured program" value={home.heroEyebrow} onChange={(e) => setHome({ ...home, heroEyebrow: e.target.value })} /></F>
          <F label="Featured program (slug)"><input className={input} placeholder="e.g. athleticism-4-life" value={home.featuredSlug} onChange={(e) => setHome({ ...home, featuredSlug: e.target.value })} /></F>
          <F label="Enrolled row title" wide><input className={input} value={home.enrolledTitle} onChange={(e) => setHome({ ...home, enrolledTitle: e.target.value })} /></F>
        </Group>
        <div className="flex justify-end"><button type="button" className={buttonStyles.primary} onClick={() => save.mutate({ key: "home", value: home })}><Save className="h-4 w-4" /> Save home</button></div>
      </div>
      <div className="glass-panel space-y-5 rounded-3xl p-6">
        <Group title="Programs page">
          <F label="Page title" wide><input className={input} value={pp.title} onChange={(e) => setPp({ ...pp, title: e.target.value })} /></F>
          <F label="Intro" wide><textarea rows={2} className={input} value={pp.intro} onChange={(e) => setPp({ ...pp, intro: e.target.value })} /></F>
          <F label="Flagship label"><input className={input} value={pp.kblBadge} onChange={(e) => setPp({ ...pp, kblBadge: e.target.value })} /></F>
          <F label="Flagship title"><input className={input} value={pp.kblTitle} onChange={(e) => setPp({ ...pp, kblTitle: e.target.value })} /></F>
          <F label="Flagship description" wide><textarea rows={3} className={input} value={pp.kblCopy} onChange={(e) => setPp({ ...pp, kblCopy: e.target.value })} /></F>
        </Group>
        <div className="flex justify-end"><button type="button" className={buttonStyles.primary} onClick={() => save.mutate({ key: "programs_page", value: pp })}><Save className="h-4 w-4" /> Save programs page</button></div>
      </div>
    </div>
  );
}

/* ---------------- Retreats: dates, status, applications ---------------- */

const APP_STATUSES = ["submitted", "waitlist", "call_scheduled", "accepted", "declined", "withdrawn"] as const;

function RetreatsPanel() {
  const { data } = useSettings();
  const save = useSaveSetting();
  const [cohorts, setCohorts] = useState<Record<string, Partial<RetreatCohort>> | null>(null);
  useEffect(() => {
    if (!data) return;
    const next: Record<string, Partial<RetreatCohort>> = {};
    for (const r of baseRetreats) {
      const m = applyCohort(r, data.retreats?.cohorts?.[r.slug]);
      next[r.slug] = { startsOn: m.startsAt.slice(0, 10), endsOn: m.endsAt.slice(0, 10), status: m.status, capacity: m.capacity, datesTbd: Boolean(m.demoDates) };
    }
    setCohorts(next);
  }, [data]);

  const listFn = useServerFn(listRetreatApplications);
  const updateFn = useServerFn(updateRetreatApplication);
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ["retreat-applications"], queryFn: () => listFn() });
  const update = useMutation({
    mutationFn: (v: { id: string; status: (typeof APP_STATUSES)[number]; admin_notes: string | null }) => updateFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["retreat-applications"] }); toast.success("Application updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!cohorts) return <Spinner />;
  const setC = (slug: string, patch: Partial<RetreatCohort>) => setCohorts({ ...cohorts, [slug]: { ...cohorts[slug], ...patch } });

  return (
    <div className="space-y-6">
      <div className="glass-panel space-y-6 rounded-3xl p-6">
        {baseRetreats.map((r) => {
          const c = cohorts[r.slug] ?? {};
          return (
            <Group key={r.slug} title={r.name}>
              <F label="Starts"><input type="date" className={input} value={c.startsOn ?? ""} onChange={(e) => setC(r.slug, { startsOn: e.target.value })} /></F>
              <F label="Ends"><input type="date" className={input} value={c.endsOn ?? ""} onChange={(e) => setC(r.slug, { endsOn: e.target.value })} /></F>
              <F label="Status">
                <select className={input} value={c.status ?? "open"} onChange={(e) => setC(r.slug, { status: e.target.value as RetreatCohort["status"] })}>
                  <option value="open">Applications open</option>
                  <option value="waitlist">Waitlist only</option>
                  <option value="past">Closed / finished</option>
                </select>
              </F>
              <F label="Capacity (men)"><input type="number" min={1} className={input} value={c.capacity ?? 20} onChange={(e) => setC(r.slug, { capacity: Number(e.target.value) })} /></F>
              <Toggle label="Dates not announced yet (show as TBD)" checked={Boolean(c.datesTbd)} onChange={(v) => setC(r.slug, { datesTbd: v })} />
            </Group>
          );
        })}
        <div className="flex justify-end">
          <button type="button" className={buttonStyles.primary} onClick={() => save.mutate({ key: "retreats", value: { cohorts } })}><Save className="h-4 w-4" /> Save retreat dates</button>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <p className="eyebrow mb-4 text-primary">Applications</p>
        {apps.isLoading ? <Spinner /> : (apps.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <div className="space-y-3">
            {(apps.data ?? []).map((app) => <ApplicationRow key={app.id} app={app} onSave={(status, notes) => update.mutate({ id: app.id, status, admin_notes: notes })} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationRow({ app, onSave }: { app: RetreatApplication; onSave: (s: (typeof APP_STATUSES)[number], notes: string | null) => void }) {
  const [status, setStatus] = useState(app.status as (typeof APP_STATUSES)[number]);
  const [notes, setNotes] = useState(app.admin_notes ?? "");
  const [open, setOpen] = useState(false);
  const a = app.answers;
  const name = baseRetreats.find((r) => r.slug === app.retreat_slug)?.name ?? app.retreat_slug;
  return (
    <div className="rounded-2xl border border-hairline p-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
        <span className="text-sm font-semibold text-foreground">{name} · {String(a.phone ?? "")}</span>
        <span className="text-xs text-muted-foreground">{status.replace("_", " ")} · {new Date(app.created_at).toLocaleDateString()}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(a).map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="whitespace-pre-wrap text-foreground">{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v || "—")}</dd></div>
            ))}
          </dl>
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value as (typeof APP_STATUSES)[number])}>
              {APP_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
            <input className={input} placeholder="Internal notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button type="button" className={buttonStyles.primary} onClick={() => onSave(status, notes || null)}><Save className="h-4 w-4" /> Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3 text-primary">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function F({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={cn("block space-y-1.5", wide && "sm:col-span-2")}><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-hairline px-3 py-2.5 text-sm text-foreground">
      <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
