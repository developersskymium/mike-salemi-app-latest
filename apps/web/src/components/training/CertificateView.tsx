"use client";

import { useState } from "react";
import { AmbientBackdrop, Button, Glass, IconButton, useToast } from "@/components/ui";
import { LevelEmblem } from "@/components/graphics";
import type { CertificateData } from "@/lib/loaders/training";
import "./training.css";

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3 };
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** A member's certificate: crest, name, level, date, verify code; share and print. */
export function CertificateView({ cert, origin }: { cert: CertificateData; origin: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const level = ROMAN[(cert.path ?? "").match(/Level\s+([IV]+)/)?.[1] ?? ""] ?? 1;
  const url = `${origin}/verify/${cert.verifyCode}`;
  async function share() {
    const text = `${cert.name} completed ${cert.program}${cert.path ? `, ${cert.path}` : ""}.`;
    try {
      if (navigator.share) await navigator.share({ title: "Certificate", text, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast("Verification link copied", { tone: "success" });
      }
    } catch {}
  }
  return (
    <div className="trn-cert-page">
      {cert.image && <AmbientBackdrop src={cert.image} fixed className="trn-ambient" />}
      <div className="trn-prog-top">
        <IconButton icon="back" label="Back" href={cert.programSlug ? `/programs/${cert.programSlug}` : "/you"} />
      </div>
      <Glass as="article" level="thick" className="trn-cert" aria-label="Certificate of completion">
        <LevelEmblem level={level} size={104} tier="gold" />
        <p className="lq-t13 lq-c2 trn-eyebrow" style={{ marginTop: 6 }}>
          Certificate of completion
        </p>
        <h1 className="trn-cert-name">{cert.name}</h1>
        <p className="lq-t17">
          completed <b>{cert.program}</b>
        </p>
        {cert.path && <p className="lq-t15 lq-c2">{cert.path}</p>}
        <div className="trn-cert-meta lq-t15 lq-num">
          {cert.days ? <span>{cert.days} days</span> : null}
          {cert.phases ? <span>{cert.phases} phases</span> : null}
          <span>{fmt(cert.issuedAt)}</span>
          {cert.run > 1 ? <span>Run {cert.run}</span> : null}
        </div>
        <p className="lq-t13 lq-c2" style={{ marginTop: 14 }}>
          Signed, Mike Salemi
        </p>
        <span className="trn-cert-code" aria-label={`Verification code ${cert.verifyCode}`}>
          {cert.verifyCode}
        </span>
      </Glass>
      <div className="trn-cert-actions">
        <Button icon="share" onClick={share}>
          {copied ? "Link copied" : "Share"}
        </Button>
        <Button variant="glass" icon="down" onClick={() => window.print()}>
          Save as PDF
        </Button>
      </div>
    </div>
  );
}
