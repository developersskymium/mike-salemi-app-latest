/**
 * Certificate PDF (ported from the original app's certificate-pdf.server.ts, A4 landscape).
 * The same engraved sheet the member sees: double rule, corner marks, seal, name in italic serif,
 * the level, its phases, date and Mike Salemi's signature line, plus a verification QR code.
 * pdf-lib with the standard fonts: pure JS, no filesystem, runs in Node and edge runtimes.
 * Used by GET /api/certificates/[id]/pdf (download) and by the certificate email (W3) as an attachment.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { certificateFileName, qrMatrix, verifyUrl } from "./qr";

export interface CertificatePdfInput {
  /** Name printed on the certificate. */
  name: string;
  /** Program name, e.g. "Kettlebell Lifestyle". */
  program: string;
  /** Level, e.g. "Level I · Beginner" (null for single-path programs). */
  path: string | null;
  /** Phase titles printed under the level. */
  phases?: string[];
  issuedAt: string;
  run?: number;
  verifyCode: string;
  /** Site origin for the verification link (https://app.mikesalemi.com). */
  origin: string;
}

const INK = rgb(0.08, 0.08, 0.08);
const MUTED = rgb(0.42, 0.42, 0.44);
const RULE = rgb(0.24, 0.24, 0.26);
const GLACIER = rgb(0.1, 0.435, 0.878);

/** WinAnsi (standard fonts) can't encode everything: map the rest to close ASCII. */
function safe(s: string) {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–/g, "-")
    .replace(/[^\x20-\x7E -ÿ—•…·]/g, "");
}

const fmtDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const level = input.path?.split("·")[0]?.trim() || null;
  pdf.setTitle(safe(`${input.program}${level ? ` — ${level}` : ""} — Certificate of Completion`));
  pdf.setAuthor("Mike Salemi");
  pdf.setSubject(safe(`Awarded to ${input.name}`));
  pdf.setCreator("Mike Salemi App");

  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  /** pdf-lib has no letter-spacing: tracked text is spelled out with gaps. */
  const track = (t: string, on: boolean) => (on ? t.split("").join(" ") : t);
  const centre = (p: PDFPage, text: string, y: number, size: number, font: PDFFont, color = INK, tracked = false) => {
    const label = safe(track(text, tracked));
    p.drawText(label, { x: (width - font.widthOfTextAtSize(label, size)) / 2, y, size, font, color });
  };
  const fit = (text: string, font: PDFFont, max: number, size: number, min: number) => {
    let s = size;
    while (s > min && font.widthOfTextAtSize(safe(text), s) > max) s -= 1;
    return s;
  };

  // Engraved double rule + guilloche-like inner hairlines
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: RULE, borderWidth: 0.6 });
  page.drawRectangle({ x: 31, y: 31, width: width - 62, height: height - 62, borderColor: RULE, borderWidth: 1.6 });
  page.drawRectangle({ x: 38, y: 38, width: width - 76, height: height - 76, borderColor: rgb(0.7, 0.7, 0.72), borderWidth: 0.35 });

  // Corner marks
  const k = 22;
  for (const [x, y, dx, dy] of [
    [48, height - 48, k, 0], [48, height - 48, 0, -k], [width - 48, height - 48, -k, 0], [width - 48, height - 48, 0, -k],
    [48, 48, k, 0], [48, 48, 0, k], [width - 48, 48, -k, 0], [width - 48, 48, 0, k],
  ] as const) page.drawLine({ start: { x, y }, end: { x: x + dx, y: y + dy }, thickness: 0.75, color: RULE });

  centre(page, input.program.toUpperCase(), height - 88, 11, sansBold, MUTED, true);
  centre(page, "MIKE SALEMI", height - 106, 8, sans, MUTED, true);

  // Seal: concentric rings with a kettlebell mark
  const sx = width / 2, sy = height - 160;
  page.drawCircle({ x: sx, y: sy, size: 27, borderColor: RULE, borderWidth: 1 });
  page.drawCircle({ x: sx, y: sy, size: 22, borderColor: RULE, borderWidth: 0.4 });
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    page.drawLine({
      start: { x: sx + Math.cos(a) * 27, y: sy + Math.sin(a) * 27 },
      end: { x: sx + Math.cos(a) * 29.5, y: sy + Math.sin(a) * 29.5 },
      thickness: 0.4, color: RULE,
    });
  }
  // bell body + handle
  page.drawCircle({ x: sx, y: sy - 4, size: 9, color: INK });
  page.drawEllipse({ x: sx, y: sy + 7, xScale: 6.5, yScale: 6, borderColor: INK, borderWidth: 2.2 });

  centre(page, "CERTIFICATE OF COMPLETION", height - 222, 11, sans, MUTED, true);
  centre(page, "This is to certify that", height - 252, 10, sans, MUTED, true);

  const name = input.name.trim() || "Kettlebell Lifestyle Athlete";
  centre(page, name, height - 304, fit(name, serifItalic, width - 220, 42, 24), serifItalic, INK);
  page.drawLine({ start: { x: width / 2 - 140, y: height - 322 }, end: { x: width / 2 + 140, y: height - 322 }, thickness: 0.75, color: RULE });

  centre(page, level ? "has completed every phase, day and lesson of" : "has completed", height - 348, 11, sans, MUTED);
  const title = (input.path ?? input.program).toUpperCase();
  centre(page, title, height - 380, fit(track(title, true), sansBold, width - 200, 20, 12), sansBold, INK, true);
  if (input.phases?.length) centre(page, input.phases.join("   ·   ").toUpperCase(), height - 404, 7.5, sans, MUTED, true);
  if ((input.run ?? 1) > 1) centre(page, `RUN ${input.run}`, height - 420, 7.5, sansBold, GLACIER, true);

  // Signature row
  const base = 96, col = 196;
  const leftX = width / 2 - col - 92;
  const rightX = width / 2 + 92;
  page.drawText(safe(fmtDate(input.issuedAt)), { x: leftX, y: base + 12, size: 12, font: sans, color: INK });
  page.drawLine({ start: { x: leftX, y: base }, end: { x: leftX + col, y: base }, thickness: 0.75, color: RULE });
  page.drawText(track("DATE ISSUED", true), { x: leftX, y: base - 14, size: 7.5, font: sans, color: MUTED });

  page.drawText("Mike Salemi", { x: rightX, y: base + 9, size: 20, font: serifItalic, color: INK });
  page.drawLine({ start: { x: rightX, y: base }, end: { x: rightX + col, y: base }, thickness: 0.75, color: RULE });
  page.drawText(track("FOUNDER, KETTLEBELL LIFESTYLE", true), { x: rightX, y: base - 14, size: 7.5, font: sans, color: MUTED });

  // Verification QR (centre, between the signatures)
  const url = verifyUrl(input.origin, input.verifyCode);
  const m = qrMatrix(url);
  const qrSize = 64, cell = qrSize / m.length, qx = width / 2 - qrSize / 2, qy = base - 22;
  m.forEach((row, r) => row.forEach((on, c) => {
    if (on) page.drawRectangle({ x: qx + c * cell, y: qy + (m.length - 1 - r) * cell, width: cell + 0.02, height: cell + 0.02, color: INK });
  }));
  centre(page, `VERIFY ${input.verifyCode}`, qy - 13, 6.5, sansBold, MUTED, true);
  page.drawText(safe(url.replace(/^https?:\/\//, "")), {
    x: (width - sans.widthOfTextAtSize(safe(url.replace(/^https?:\/\//, "")), 6)) / 2, y: qy - 23, size: 6, font: sans, color: MUTED,
  });

  return pdf.save();
}

/** Base64 of the certificate, ready for an email attachment. */
export async function certificatePdfBase64(input: CertificatePdfInput): Promise<string> {
  return Buffer.from(await buildCertificatePdf(input)).toString("base64");
}

/** File name for a certificate download or attachment. */
export const certificatePdfName = (input: Pick<CertificatePdfInput, "program" | "path">) =>
  certificateFileName(`${input.program} ${input.path?.split("·")[0]?.trim() ?? ""}`);
