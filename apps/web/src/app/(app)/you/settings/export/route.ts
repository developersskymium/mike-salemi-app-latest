import { NextResponse } from "next/server";
import { requestExport } from "@/lib/settings/actions";
import { loadSettingsHub } from "@/lib/settings/loader";

/** Download my data (Settings › Privacy 9): the member's own records as JSON, right now; also logged as a request. */
export async function GET() {
  const hub = await loadSettingsHub().catch(() => null);
  if (!hub) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  await requestExport().catch(() => undefined);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), account: hub.account, trainingProfile: hub.profile, settings: hub.settings, reminders: hub.reminders, billing: { plan: hub.billing.plan, status: hub.billing.status, interval: hub.billing.interval, renewsOn: hub.billing.renewsOn, invoices: hub.billing.invoices }, requests: hub.requests }, null, 2);
  return new NextResponse(body, {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="mike-salemi-my-data.json"`, "cache-control": "private, no-store" },
  });
}
