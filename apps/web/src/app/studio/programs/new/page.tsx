import { PageHead } from "@/components/studio/ui";
import { NewProgram } from "@/components/studio/NewProgram";
import { studioAdmin } from "@/lib/studio/guard";

export const metadata = { title: "New program" };

export default async function NewProgramPage() {
  await studioAdmin();
  return (
    <>
      <PageHead eyebrow={[{ label: "Programs", href: "/studio/programs" }, { label: "New" }]} title="New program" sub="Four short steps. Everything can be changed later; it starts as a draft." />
      <NewProgram />
    </>
  );
}
