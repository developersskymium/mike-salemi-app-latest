import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ChooseNextStep } from "@/components/access/ChooseNextStep";
import { CertificateView } from "@/components/training/CertificateView";
import { loadCertificate } from "@/lib/loaders/training";

export const metadata: Metadata = { title: "Certificate" };

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cert = await loadCertificate(id);
  if (!cert) notFound();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "mikesalemi.com"}`;
  return (
    <>
      <CertificateView cert={cert} origin={origin} />
      {cert.programSlug && (
        <div style={{ maxWidth: 1040, margin: "40px auto 0" }}>
          <ChooseNextStep program={cert.programSlug} />
        </div>
      )}
    </>
  );
}
