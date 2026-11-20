import type { Metadata } from "next";
import { SettingsHubView } from "@/components/settings/SettingsHubView";
import { SubPage } from "@/components/you/SubPage";
import { loadSettingsHub } from "@/lib/settings/loader";
import { TestingGroup } from "@/components/settings/TestingGroup";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/** Admins see a Testing group (reset my progress). */
async function isAdmin() {
  if (MOCK) return true;
  try {
    const { supabase, user } = await getUser();
    if (!user) return false;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  const [d, admin] = await Promise.all([loadSettingsHub(), isAdmin()]);
  return (
    <SubPage title="Settings" back="/you">
      <SettingsHubView d={d} />
      {admin && <TestingGroup />}
    </SubPage>
  );
}
