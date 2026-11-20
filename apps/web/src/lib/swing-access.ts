import "server-only";
import { getAccessMap, isAdminViewer } from "@/lib/access";

/**
 * Who gets the camera check (spec 13 › Decided 5): admins, and members with any active plan or any
 * purchased program, i.e. at least one program "included" by their plan or "owned". Guided modes are
 * open to every signed-in member.
 */
export async function hasCameraAccess(): Promise<boolean> {
  if (await isAdminViewer()) return true;
  for (const a of (await getAccessMap()).values()) if (a.state === "owned" || a.state === "included") return true;
  return false;
}
