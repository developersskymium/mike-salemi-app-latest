import { BadgeVideoForm } from "@/components/studio/content";
import { Note, PageHead, Panel } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadBadgePerks } from "@/lib/studio/loaders-new";

export const metadata = { title: "Badges" };

export default async function BadgesPage() {
  await studioAdmin();
  const d = await loadBadgePerks();
  return (
    <>
      <PageHead title="Badges" sub="Some badges unlock a bonus video from Mike. Choose which video each one opens; members who already earned it get the new link too." />
      {d.badges.length ? d.badges.map((b) => (
        <Panel key={b.id} title={b.name} meta={`${b.tier} · ${b.family}`}>
          <p className="st-muted" style={{ margin: "0 0 14px" }}>{b.description}</p>
          <BadgeVideoForm badge={{ id: b.id, perk: b.perk }} videos={d.videos} />
        </Panel>
      )) : <Panel><div className="st-empty">No badges carry a bonus-video perk.</div></Panel>}
      <Note>{d.other} other badges carry a discount or free-month perk; those are set by the badge rules and need no video.</Note>
    </>
  );
}
