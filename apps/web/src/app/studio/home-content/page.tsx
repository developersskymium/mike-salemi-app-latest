import { MikeNoteForm, PicksPicker } from "@/components/studio/content";
import { Note, PageHead, Panel, fdate } from "@/components/studio/ui";
import { PHOTO } from "@/lib/photos";
import { studioAdmin } from "@/lib/studio/guard";
import { loadHomeContent } from "@/lib/studio/loaders-new";

export const metadata = { title: "Home content" };

export default async function HomeContentPage() {
  await studioAdmin();
  const d = await loadHomeContent();
  const photos = Object.entries(PHOTO).map(([key, p]) => ({ key, src: p.src, alt: p.alt, fallback: "fallback" in p ? p.fallback : undefined }));
  return (
    <>
      <PageHead title="Home content" sub="What members see change week to week: Mike's note on Home and the “Mike's picks” shelf in the Library." />
      <Panel title="Mike's weekly note" meta={d.noteUpdated ? `last saved ${fdate(d.noteUpdated, true)}` : "not set"}>
        {!d.note.text && <div style={{ marginBottom: 14 }}><Note tone="warn">No note yet, so Home shows no note card.</Note></div>}
        <MikeNoteForm note={d.note} photos={photos} />
      </Panel>
      <Panel title="Library · Mike's picks" meta={d.picks.month ? `for ${d.picks.month}` : "not set"}>
        <PicksPicker month={d.picks.month} picked={d.picks.videos.map((v) => ({ id: String(v.id), title: String(v.title) }))} videos={d.videos} />
      </Panel>
    </>
  );
}
