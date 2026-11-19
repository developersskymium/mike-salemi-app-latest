/**
 * Server-only certificate PDF generator.
 *
 * Draws the same engraved certificate the app shows on screen, so the copy
 * that lands in the athlete's inbox matches what they see in their account.
 * pdf-lib is pure JS and uses the built-in standard fonts, so it runs fine in
 * the edge runtime (no native binaries, no filesystem access).
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type CertificatePdfInput = {
  /** Athlete name printed on the certificate. */
  name: string;
  /** Level / course title, e.g. "Kettlebell Lifestyle — Level 1". */
  title: string;
  /** Human-readable issue date. */
  issuedOn: string;
  /** Optional phase labels printed as a footnote row. */
  phases?: string[];
};

const INK = rgb(0.08, 0.08, 0.08);
const MUTED = rgb(0.45, 0.45, 0.45);
const RULE = rgb(0.25, 0.25, 0.25);

/** Returns the certificate as raw PDF bytes (A4 landscape). */
export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${input.title} — Certificate of Completion`);
  pdf.setAuthor("Kettlebell Lifestyle");

  const page = pdf.addPage([841.89, 595.28]); // A4 landscape
  const { width, height } = page.getSize();

  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  /** pdf-lib has no letter-spacing, so tracked text is spelled out with gaps. */
  const track = (text: string, tracked: boolean) => (tracked ? text.split("").join(" ") : text);

  const centre = (
    text: string,
    y: number,
    size: number,
    font: typeof sans,
    color = INK,
    tracked = false,
  ) => {
    const label = track(text, tracked);
    const textWidth = font.widthOfTextAtSize(label, size);
    page.drawText(label, { x: (width - textWidth) / 2, y, size, font, color });
  };

  // Engraved double rule
  page.drawRectangle({
    x: 26,
    y: 26,
    width: width - 52,
    height: height - 52,
    borderColor: RULE,
    borderWidth: 0.75,
  });
  page.drawRectangle({
    x: 33,
    y: 33,
    width: width - 66,
    height: height - 66,
    borderColor: RULE,
    borderWidth: 1.5,
  });

  // Corner marks
  const corner = 22;
  const marks: [number, number, number, number][] = [
    [46, height - 46, corner, 0],
    [46, height - 46, 0, -corner],
    [width - 46, height - 46, -corner, 0],
    [width - 46, height - 46, 0, -corner],
    [46, 46, corner, 0],
    [46, 46, 0, corner],
    [width - 46, 46, -corner, 0],
    [width - 46, 46, 0, corner],
  ];
  for (const [x, y, dx, dy] of marks) {
    page.drawLine({ start: { x, y }, end: { x: x + dx, y: y + dy }, thickness: 0.75, color: RULE });
  }

  centre("KETTLEBELL LIFESTYLE", height - 90, 11, sansBold, MUTED, true);
  centre("MIKE SALEMI", height - 110, 8, sans, MUTED, true);

  // Seal
  const sealY = height - 168;
  page.drawCircle({ x: width / 2, y: sealY, size: 26, borderColor: RULE, borderWidth: 1 });
  page.drawCircle({ x: width / 2, y: sealY, size: 20, borderColor: RULE, borderWidth: 0.5 });
  centre("KB", sealY - 5, 12, sansBold, INK, true);

  centre("CERTIFICATE OF COMPLETION", height - 226, 11, sans, MUTED, true);
  centre("This is to certify that", height - 258, 10, sans, MUTED, true);

  const name = input.name.trim() || "Kettlebell Lifestyle Athlete";
  const nameSize = name.length > 28 ? 30 : 42;
  centre(name, height - 312, nameSize, serifItalic, INK);

  page.drawLine({
    start: { x: width / 2 - 130, y: height - 330 },
    end: { x: width / 2 + 130, y: height - 330 },
    thickness: 0.75,
    color: RULE,
  });

  centre("has completed every phase, day and lesson of", height - 358, 11, sans, MUTED);

  const courseTitle = input.title.replace(/^Kettlebell Lifestyle\s*[—-]\s*/i, "").toUpperCase();
  centre(courseTitle, height - 392, 20, sansBold, INK, true);

  if (input.phases?.length) {
    centre(input.phases.join("   ·   ").toUpperCase(), height - 418, 8, sans, MUTED, true);
  }

  // Signature row
  const baseline = 92;
  const colWidth = 210;
  const leftX = width / 2 - colWidth - 30;
  const rightX = width / 2 + 30;

  page.drawText(input.issuedOn, { x: leftX, y: baseline + 12, size: 12, font: sans, color: INK });
  page.drawLine({
    start: { x: leftX, y: baseline },
    end: { x: leftX + colWidth, y: baseline },
    thickness: 0.75,
    color: RULE,
  });
  page.drawText(track("DATE ISSUED", true), {
    x: leftX,
    y: baseline - 14,
    size: 7.5,
    font: sans,
    color: MUTED,
  });

  page.drawText("Mike Salemi", {
    x: rightX,
    y: baseline + 10,
    size: 18,
    font: serifItalic,
    color: INK,
  });
  page.drawLine({
    start: { x: rightX, y: baseline },
    end: { x: rightX + colWidth, y: baseline },
    thickness: 0.75,
    color: RULE,
  });
  page.drawText(track("FOUNDER, KETTLEBELL LIFESTYLE", true), {
    x: rightX,
    y: baseline - 14,
    size: 7.5,
    font: sans,
    color: MUTED,
  });

  return pdf.save();
}

/** Base64 encoding of the certificate, ready for an email attachment. */
export async function certificatePdfBase64(input: CertificatePdfInput): Promise<string> {
  const bytes = await buildCertificatePdf(input);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Safe filename for the attachment. */
export function certificateFileName(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "certificate"}-certificate.pdf`;
}
