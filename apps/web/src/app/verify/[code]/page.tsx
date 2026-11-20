import type { Metadata } from "next";
import { Button, Glass, Icon } from "@/components/ui";
import { Completion, EmptyScene } from "@/components/graphics";
import { loadVerification } from "@/lib/loaders/training";
import "@/components/training/training.css";

export const metadata: Metadata = { title: "Verify a certificate", robots: { index: false } };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** Public certificate verification (no sign-in). */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const v = await loadVerification(decodeURIComponent(code));
  return (
    <main className="trn-verify">
      <Glass level="thick" className="trn-verify-card">
        {v ? (
          <>
            <Completion variant="milestone" size={240} />
            <span className="trn-verified lq-t13">
              <Icon name="check" size="xs" /> Verified certificate
            </span>
            <h1 className="lq-t34" style={{ textWrap: "balance" }}>{v.name}</h1>
            <p className="lq-t17">
              completed <b>{v.program}</b>
            </p>
            {v.path && <p className="lq-t15 lq-c2">{v.path}</p>}
            <p className="lq-t15 lq-c2 lq-num">
              Issued {fmt(v.issuedAt)}
              {v.run > 1 ? ` · Run ${v.run}` : ""} · Code {code.toUpperCase()}
            </p>
            <Button variant="glass" href="/" style={{ marginTop: 12 }}>
              About Mike Salemi
            </Button>
          </>
        ) : (
          <>
            <EmptyScene scene="caught-up" size={200} />
            <h1 className="lq-t28">We couldn&apos;t verify that code</h1>
            <p className="lq-t15 lq-c2">Check the code on the certificate and try again. Codes are 8 letters and numbers.</p>
            <Button variant="glass" href="/" style={{ marginTop: 12 }}>
              Go to Mike Salemi
            </Button>
          </>
        )}
      </Glass>
    </main>
  );
}
