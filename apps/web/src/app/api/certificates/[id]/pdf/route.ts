import { buildCertificatePdf, certificatePdfName } from "@/lib/certificates/pdf";
import { loadCertificatePdf, type CertificatePdfData } from "@/lib/loaders/you";
import { fixture, MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/**
 * GET /api/certificates/:id/pdf — the member's own certificate as an A4 landscape PDF
 * (RLS: only the owner can read the row). `?inline=1` opens it in the browser instead of downloading.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let cert: CertificatePdfData | null;
  if (MOCK) cert = await fixture<CertificatePdfData>("you-certificate");
  else {
    const { user } = await getUser();
    if (!user) return Response.json({ error: "not_signed_in" }, { status: 401 });
    if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "not_found" }, { status: 404 });
    cert = await loadCertificatePdf(id);
  }
  if (!cert) return Response.json({ error: "not_found" }, { status: 404 });

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
  const bytes = await buildCertificatePdf({ ...cert, origin });
  const inline = new URL(request.url).searchParams.has("inline");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${certificatePdfName(cert)}"`,
      "cache-control": "private, no-store",
    },
  });
}
