import { HomeCopyEditor, ProgramsCopyEditor } from "@/components/studio/site";
import { PageHead, Panel } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";
import { loadSiteCopy } from "@/lib/studio/loaders";

export const metadata = { title: "Site copy" };

/** Legacy admin "Main copy": the Home hero for new members and the Programs page header and flagship. */
export default async function SiteCopyPage() {
  await studioAdmin();
  const d = await loadSiteCopy();
  return (
    <>
      <PageHead title="Site copy" sub="The words on Home and the Programs page. Changes go live for members as soon as you save." />
      <Panel title="Home" meta="site_settings · home"><HomeCopyEditor value={d.home} programs={d.programs} /></Panel>
      <Panel title="Programs page" meta="site_settings · programs_page"><ProgramsCopyEditor value={d.programsPage} image={d.flagshipImage} /></Panel>
    </>
  );
}
