import qrcode from "qrcode-generator";

/** QR modules for a string (error correction M): `dark[row][col]`. Pure JS, runs anywhere. */
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/** One SVG path ("M x y h1 v1 h-1z" per dark module) for a QR code on a unit grid. */
export function qrPath(text: string): { size: number; d: string } {
  const m = qrMatrix(text);
  let d = "";
  m.forEach((row, y) => row.forEach((on, x) => {
    if (on) d += `M${x} ${y}h1v1h-1z`;
  }));
  return { size: m.length, d };
}

/** Public verification link for a certificate code. */
export const verifyUrl = (origin: string, code: string) => `${origin.replace(/\/$/, "")}/verify/${code}`;

/** Safe file name, e.g. "kettlebell-lifestyle-level-i-certificate.pdf". */
export function certificateFileName(title: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "certificate"}-certificate.pdf`;
}
