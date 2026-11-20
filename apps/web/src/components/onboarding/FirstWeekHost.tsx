import { surfacePhoto } from "@/lib/photos";
import { loadFirstWeek, loadWelcomeVideo } from "@/lib/settings/loader";
import { FirstWeekChecklist, InstallPrompt, ResumeDraftCard, WelcomeVideo } from "./FirstWeek";

/**
 * Drop-in for Home (one line, owned by the home agent): welcome video once, first-week checklist,
 * "Pick up where you left off", and the install prompt after the first completed session.
 * Renders nothing once the member is settled in.
 */
export async function FirstWeekHost() {
  const [fw, vimeo] = await Promise.all([loadFirstWeek().catch(() => null), loadWelcomeVideo()]);
  if (!fw) return null;
  const p = surfacePhoto("homeEmpty");
  return (
    <>
      {fw.showWelcome && <WelcomeVideo vimeoId={vimeo} photo={{ src: p.src, position: p.focal }} />}
      <ResumeDraftCard />
      <FirstWeekChecklist d={fw.checklist} />
      <InstallPrompt completedSessions={fw.completedSessions} prompted={fw.installPrompted} />
    </>
  );
}
