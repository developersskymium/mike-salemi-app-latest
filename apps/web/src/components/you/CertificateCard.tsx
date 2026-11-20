"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBrowserValue } from "@/lib/hooks/clock";
import { Icon, IconButton, ProgressBar, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { qrPath, verifyUrl } from "@/lib/certificates/qr";
import type { Certificate, Enrollment } from "@/lib/loaders/today-plan-you";
import { fmtLong, levelShort } from "./format";

function useOrigin() {
  return useBrowserValue(() => window.location.origin, "https://app.mikesalemi.com");
}

function Qr({ text, size = 64 }: { text: string; size?: number }) {
  const { size: n, d } = useMemo(() => qrPath(text), [text]);
  return (
    <svg className="yu-qr" viewBox={`-1 -1 ${n + 2} ${n + 2}`} width={size} height={size} role="img" aria-label="Verification QR code" shapeRendering="crispEdges">
      <rect x={-1} y={-1} width={n + 2} height={n + 2} className="yu-qr-bg" />
      <path d={d} className="yu-qr-fg" />
    </svg>
  );
}

/** Engraved certificate sheet (landscape, double rule, corner marks, seal, name, level, signature, verify QR). */
export function CertificateSheet({ name, program, path, issuedAt, code, origin }: { name: string; program: string; path: string | null; issuedAt: string; code: string; origin: string }) {
  return (
    <div className="yu-cert" aria-label={`Certificate of completion: ${name}, ${program}${path ? `, ${path}` : ""}`}>
      <i className="yu-cert-corner" data-c="tl" aria-hidden />
      <i className="yu-cert-corner" data-c="tr" aria-hidden />
      <i className="yu-cert-corner" data-c="bl" aria-hidden />
      <i className="yu-cert-corner" data-c="br" aria-hidden />
      <p className="yu-cert-brand">{program}</p>
      <span className="yu-cert-seal" aria-hidden>
        <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" /><circle cx="20" cy="20" r="14.5" /><path d="M15.2 16.4a4.8 4.8 0 0 1 9.6 0" /><circle cx="20" cy="23.5" r="5.6" /></svg>
      </span>
      <p className="yu-cert-kicker">Certificate of completion</p>
      <p className="yu-cert-name">{name}</p>
      <p className="yu-cert-level">{(path ?? program).toUpperCase()}</p>
      <div className="yu-cert-foot">
        <span><b className="lq-num">{fmtLong(issuedAt)}</b><small>Date issued</small></span>
        <Qr text={verifyUrl(origin, code)} size={44} />
        <span><b className="yu-cert-sig">Mike Salemi</b><small>Founder</small></span>
      </div>
    </div>
  );
}

/** Plain anchor (not a client navigation) so the browser downloads the PDF. */
export function PdfLink({ id, label = "PDF", size = "sm" }: { id: string; label?: string; size?: "sm" | "md" }) {
  return (
    <a className="lq-btn lq-fx lq-press" data-variant="glass" data-size={size} data-fx="" href={`/api/certificates/${id}/pdf`} download onClick={() => haptic(8)}>
      <Icon name="down" size="xs" />
      <span>{label}</span>
    </a>
  );
}

/** A certificate the member holds: the engraved sheet, verify code, View / Download PDF / Share. */
export function CertificateCard({ c, name }: { c: Certificate; name: string }) {
  const origin = useOrigin();
  const toast = useToast();
  const url = verifyUrl(origin, c.verify_code);
  const share = async () => {
    haptic(8);
    const text = `${name} completed ${c.program_name}${c.path_name ? `, ${levelShort(c.path_name)}` : ""}.`;
    try {
      if (navigator.share) await navigator.share({ title: "Certificate of completion", text, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Verification link copied", { tone: "success", icon: "check" });
      }
    } catch {
      /* dismissed */
    }
  };
  return (
    <article className="yu-cert-card">
      <Link href={`/you/certificates/${c.id}`} className="yu-cert-link" aria-label="Open certificate">
        <CertificateSheet name={name} program={c.program_name} path={c.path_name} issuedAt={c.issued_at} code={c.verify_code} origin={origin} />
      </Link>
      <div className="yu-cert-actions">
        <span className="lq-t13 lq-c2">
          Verify code <b className="lq-num yu-code-sm">{c.verify_code}</b>
        </span>
        <span className="yu-cert-btns">
          <IconButton icon="share" label="Share verification link" size="sm" onClick={share} />
          <PdfLink id={c.id} />
        </span>
      </div>
    </article>
  );
}

/** No certificate yet: a ghosted sheet that fills in as the member closes in on finishing a level. */
export function CertificateTeaser({ active, name }: { active: Enrollment | undefined; name: string }) {
  const origin = useOrigin();
  const left = active ? active.lessons_total - active.lessons_done : 0;
  return (
    <article className="yu-cert-card" data-locked="">
      <div className="yu-cert-ghost" aria-hidden>
        <CertificateSheet name={name} program={active?.program_name ?? "Kettlebell Lifestyle"} path={active?.path_name ?? "Level I · Beginner"} issuedAt={new Date().toISOString()} code="PENDING" origin={origin} />
        <span className="yu-cert-lock"><Icon name="lock" size="sm" /></span>
      </div>
      <div className="yu-cert-teaser">
        <p className="lq-t17">No certificates yet</p>
        <p className="lq-t13 lq-c2">
          {active ? `Finish ${levelShort(active.path_name) ?? active.program_name} to earn it: ${left} ${left === 1 ? "day" : "days"} to go.` : "Finish a full level to earn a certificate of completion."}
        </p>
        {active && <ProgressBar value={active.lessons_total ? active.lessons_done / active.lessons_total : 0} tone="accent" label="Progress to certificate" />}
      </div>
    </article>
  );
}
