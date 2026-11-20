import type { Metadata } from "next";
import { SettingsHubView } from "@/components/settings/SettingsHubView";
import { SubPage } from "@/components/you/SubPage";
import { loadSettingsHub } from "@/lib/settings/loader";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  const d = await loadSettingsHub();
  return (
    <SubPage title="Settings" back="/you">
      <SettingsHubView d={d} />
    </SubPage>
  );
}
