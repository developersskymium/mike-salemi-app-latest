import { notFound } from "next/navigation";
import { studioAdmin } from "@/lib/studio/guard";

/** Design references are admin-only (Studio › Design); everyone else gets a 404. */
export default async function AdminOnlyLayout({ children }: { children: React.ReactNode }) {
  try {
    await studioAdmin();
  } catch {
    notFound();
  }
  return children;
}
