import type { Metadata } from "next";
import { ReminderHistory } from "@/components/notifications/ReminderHistory";
import { SubPage } from "@/components/you/SubPage";
import { loadReminderHistory } from "@/lib/loaders/notifications";

export const metadata: Metadata = { title: "Reminder history" };

export default async function Page() {
  const d = await loadReminderHistory();
  return (
    <SubPage title="Reminder history" eyebrow="Troubleshooting" back="/you/settings#notifications">
      <p className="ntf-lede" style={{ position: "relative", marginBottom: 16 }}>Every nudge this app tried to deliver — when it went out, whether you opened it, and anything that failed on the way.</p>
      <ReminderHistory d={d} />
    </SubPage>
  );
}
