import type { Metadata } from "next";
import { Button, Icon } from "@/components/ui";
import { Medal } from "@/components/graphics";
import { Photo, PubWordmark } from "@/components/discover/public/Pieces";
import { PHOTOS } from "@/components/discover/public/photos";
import { loadVerification } from "@/lib/loaders/training";
import "@/components/discover/public/public.css";

export const metadata: Metadata = { title: "Verify a certificate", robots: { index: false } };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** Public certificate verification (no sign-in). */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const v = await loadVerification(decodeURIComponent(code));
  return (
    <main className="pub pub-solo">
      <article className="pub-solo-card">
        <Photo p={v ? PHOTOS.summitGroup : PHOTOS.summitClouds} sizes="520px" priority>
          <PubWordmark />
        </Photo>
        <div className="pub-solo-body">
          {v ? (
            <>
              <span className="pub-solo-badge" data-tone="ember"><Medal tier="gold" size={76} /></span>
              <span className="pub-solo-ok"><Icon name="check" size="xs" /> Verified certificate</span>
              <h1 className="lq-d-lg">{v.name}</h1>
              <p className="lq-lede">
                completed <b style={{ color: "var(--text)" }}>{v.program}</b>
                {v.path ? ` · ${v.path}` : ""}
              </p>
              <div className="pub-solo-facts">
                <div><span>Issued</span><b>{fmt(v.issuedAt)}</b></div>
                <div><span>Run</span><b className="lq-num">{v.run}</b></div>
                <div><span>Code</span><b className="lq-num">{code.toUpperCase()}</b></div>
              </div>
              <div className="pub-solo-actions">
                <Button href="/" size="md" variant="secondary">About Mike Salemi</Button>
              </div>
            </>
          ) : (
            <>
              <span className="pub-solo-badge" data-tone="accent"><Icon name="search" /></span>
              <h1 className="lq-d-md">We couldn&rsquo;t verify that code</h1>
              <p className="lq-t15 lq-c2">Check the code on the certificate and try again. Codes are 8 letters and numbers.</p>
              <div className="pub-solo-actions">
                <Button href="/" size="md" variant="secondary">Go to Mike Salemi</Button>
              </div>
            </>
          )}
        </div>
      </article>
    </main>
  );
}
