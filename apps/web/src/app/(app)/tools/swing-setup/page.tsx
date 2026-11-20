import type { Metadata } from "next";
import { SwingCoach, type SwingView } from "@/components/swing/SwingCoach";
import { Button, EmptyState } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { loadSwingHome } from "@/lib/loaders/swing";
import { hasCameraAccess } from "@/lib/swing-access";
import "@/components/swing/swing.css";

export const metadata: Metadata = {
  title: "Swing Set-Up Coach",
  description: "Film your kettlebell swing set-up side-on and fix one thing at a time, in Mike's words.",
};

const VIEWS: SwingView[] = ["home", "profile", "check", "result", "approach", "feet", "program"];

/**
 * Swing Set-Up Coach (spec 13): the program "What Your Kettlebell Swing Is Missing" as a tool.
 * `?view=` opens a mode directly (the program page links to `check`, the program lesson to `program`).
 */
export default async function SwingSetupPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  let data;
  let cameraAccess = false;
  try {
    [data, cameraAccess] = await Promise.all([loadSwingHome(), hasCameraAccess().catch(() => false)]);
  } catch {
    return (
      <EmptyState
        title="The Swing Set-Up Coach didn't load"
        body="Check your connection and try again."
        illustration={<EmptyScene scene="offline" size={160} />}
        action={<Button variant="glass" size="md" href="/tools/swing-setup">Try again</Button>}
      />
    );
  }
  const view = VIEWS.includes(sp.view as SwingView) ? (sp.view as SwingView) : "home";
  return <SwingCoach data={data} initialView={view} cameraAccess={cameraAccess} />;
}
