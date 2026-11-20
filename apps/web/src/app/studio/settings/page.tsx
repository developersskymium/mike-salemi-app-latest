import { SettingEditor } from "@/components/studio/pieces";
import { Disclosure } from "@/components/studio/forms";
import { NewSetting } from "@/components/studio/NewSetting";
import { DataTable, Note, PageHead, Panel, Tabs, fdate } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadAudit, loadSettings } from "@/lib/studio/loaders";

export const metadata = { title: "Settings" };
const SECRET = new Set(["import_token"]);

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await studioAdmin();
  const tab = (await searchParams).tab === "audit" ? "audit" : "settings";
  return (
    <>
      <PageHead title="Site settings" sub="Validated JSON values the app reads at runtime. Changes are logged." />
      <Tabs items={[{ href: "/studio/settings", label: "Settings", active: tab === "settings" }, { href: "/studio/settings?tab=audit", label: "Audit log", active: tab === "audit" }]} />
      {tab === "settings" ? <Settings /> : <Audit />}
    </>
  );
}

async function Settings() {
  const s = await loadSettings();
  return (
    <>
      {s.map((x) => (
        <Panel key={x.key} title={x.key} meta={`updated ${fdate(x.updated_at)}`}>
          {SECRET.has(x.key) ? <Note>Internal value, not editable here.</Note> : <SettingEditor k={x.key} value={x.value} />}
        </Panel>
      ))}
      <Panel title="New setting"><Disclosure label="Add setting"><NewSetting /></Disclosure></Panel>
    </>
  );
}

async function Audit() {
  const a = await loadAudit();
  return (
    <Panel title="Audit log" meta="latest 100">
      <DataTable rows={a} empty="Nothing recorded yet." cols={[
        { label: "When", render: (r) => fdate(r.created_at, true) }, { label: "Action", render: (r) => r.action }, { label: "Entity", render: (r) => r.entity }, { label: "Id", render: (r) => <span className="st-faint">{r.entity_id}</span> },
        { label: "Actor", render: (r) => <span className="st-faint">{String(r.actor ?? "").slice(0, 8)}</span> },
      ]} />
    </Panel>
  );
}
