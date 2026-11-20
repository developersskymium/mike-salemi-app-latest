/** A tiny, dependency-free one-page PDF (Helvetica text lines). Enough for a clean receipt. */
export function simplePdf(lines: { text: string; size?: number; bold?: boolean; gap?: number }[]): Uint8Array {
  const esc = (s: string) => s.replace(/[^\x20-\x7E]/g, (c) => (c === "·" ? "-" : c === "—" || c === "–" ? "-" : "")).replace(/([\\()])/g, "\\$1");
  let y = 780;
  const ops: string[] = [];
  for (const l of lines) {
    const size = l.size ?? 11;
    y -= l.gap ?? size + 8;
    ops.push(`BT /${l.bold ? "F2" : "F1"} ${size} Tf 56 ${y} Td (${esc(l.text)}) Tj ET`);
  }
  const stream = ops.join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => {
    offs.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}
