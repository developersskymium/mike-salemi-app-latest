import { NextResponse, type NextRequest } from "next/server";
import { loadSettingsHub } from "@/lib/settings/loader";
import { simplePdf } from "@/lib/settings/pdf";

const money = (c: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase() }).format(c / 100);

/** Invoice / receipt as a PDF (Settings › Billing 7). Only the member's own orders are readable (RLS). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/you/settings/invoices/[id]">) {
  const { id } = await ctx.params;
  const hub = await loadSettingsHub().catch(() => null);
  const inv = hub?.billing.invoices.find((i) => i.id === id);
  if (!hub || !inv) return NextResponse.json({ error: "not found" }, { status: 404 });
  const date = new Date(inv.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const pdf = simplePdf([
    { text: "Mike Salemi", size: 22, bold: true, gap: 0 },
    { text: inv.status === "refunded" ? "Receipt (refunded)" : "Receipt", size: 13, gap: 26 },
    { text: `Reference ${inv.reference}`, gap: 34 },
    { text: `Date ${date}` },
    { text: `Billed to ${hub.account.name} <${hub.account.email}>` },
    { text: "Item", bold: true, gap: 40 },
    { text: inv.label },
    { text: `Total ${money(inv.totalCents, inv.currency)}`, size: 14, bold: true, gap: 34 },
    { text: `Status ${inv.status}` },
    { text: "Questions? Reply from Settings > Help, or email support.", size: 9, gap: 60 },
  ]);
  return new NextResponse(Buffer.from(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="mike-salemi-${inv.reference}.pdf"`, "cache-control": "private, no-store" },
  });
}
