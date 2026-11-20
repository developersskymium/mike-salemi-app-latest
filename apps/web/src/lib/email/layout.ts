/**
 * Branded email layout. Table-based HTML (Gmail, Outlook, Apple Mail), inline styles with a small
 * dark-mode layer (`prefers-color-scheme` for Apple Mail / iOS, `[data-ogsc]` for Outlook.com), and a
 * plain-text alternative built from the same blocks so both parts always say the same thing.
 *
 * Visual language follows the app: monochrome paper and ink, Glacier blue only for the one primary
 * action and "now" accents, generous type, hairline rules.
 */
import { appUrl, BRAND, MIKE, type EmailSender } from "./config";

/* Tokens (packages/tokens, light theme; dark overrides live in the <style> block). */
const C = {
  page: "#F2F2F4",
  card: "#FFFFFF",
  ink: "#0A0A0A",
  ink2: "#545454",
  ink3: "#6B6B6B",
  line: "#E6E6EA",
  fill: "#F4F4F6",
  accent: "#1A6FE0",
  accentInk: "#1667D9",
  accentSoft: "#E8F0FC",
  graphite: "#141416",
} as const;
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Inter,Helvetica,Arial,sans-serif";

export type Block =
  | { t: "p"; text: string; strong?: boolean }
  | { t: "section"; text: string }
  | { t: "score"; value: string; label: string; caption?: string }
  | { t: "details"; rows: { label: string; value: string }[] }
  | { t: "steps"; items: string[] }
  | { t: "bullets"; items: string[] }
  | { t: "callout"; title: string; text: string }
  | { t: "stats"; tiles: { value: string; label: string }[] }
  | { t: "progress"; percent: number; label: string };

export interface EmailContent {
  subject: string;
  preheader: string;
  /** Small label above the heading (e.g. "Reward unlocked"). */
  eyebrow: string;
  heading: string;
  subheading?: string;
  blocks: Block[];
  cta?: { label: string; url: string };
  secondary?: { label: string; url: string };
  ctaNote?: string;
  sender: EmailSender;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  sender: EmailSender;
  preheader: string;
}

export function esc(value: string) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const table = (inner: string, style = "", cls = "") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${cls ? ` class="${cls}"` : ""} style="border-collapse:separate;${style}">${inner}</table>`;

function blockHtml(b: Block): string {
  switch (b.t) {
    case "p":
      return `<p class="em-ink2" style="margin:0 0 14px;font-size:16px;line-height:1.6;color:${C.ink2}">${b.strong ? `<strong class="em-ink" style="color:${C.ink};font-weight:600">${esc(b.text)}</strong>` : esc(b.text)}</p>`;
    case "section":
      return `<p class="em-ink3" style="margin:28px 0 10px;font-size:12px;line-height:1.4;letter-spacing:.08em;text-transform:uppercase;color:${C.ink3};font-weight:600">${esc(b.text)}</p>`;
    case "score":
      return table(
        `<tr><td class="em-graphite" style="padding:26px 24px;background:${C.graphite};border-radius:18px;text-align:left">
          <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#B3B3B3;font-weight:600">${esc(b.label)}</p>
          <p style="margin:8px 0 0;font-size:48px;line-height:1;font-weight:700;letter-spacing:-.02em;color:#FFFFFF">${esc(b.value)}</p>
          ${b.caption ? `<p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:#D9D9DE">${esc(b.caption)}</p>` : ""}
        </td></tr>`,
        "margin:6px 0 8px",
      );
    case "details":
      if (!b.rows.length) return "";
      return table(
        b.rows
          .map(
            (r, i) => `<tr>
              <td class="em-ink3 em-line" style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-size:14px;line-height:1.4;color:${C.ink3};width:42%;vertical-align:top">${esc(r.label)}</td>
              <td class="em-ink em-line" style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-size:14px;line-height:1.4;color:${C.ink};font-weight:600;text-align:right;vertical-align:top">${esc(r.value)}</td>
            </tr>`,
          )
          .join(""),
        "margin:2px 0 6px",
      );
    case "steps":
      if (!b.items.length) return "";
      return table(
        b.items
          .map(
            (item, i) => `<tr>
              <td valign="top" style="padding:7px 12px 7px 0;width:26px">
                <div class="em-fill em-ink" style="width:26px;height:26px;border-radius:13px;background:${C.fill};color:${C.ink};font-size:13px;font-weight:700;text-align:center;line-height:26px">${i + 1}</div>
              </td>
              <td valign="top" class="em-ink2" style="padding:9px 0 7px;font-size:15px;line-height:1.55;color:${C.ink2}">${esc(item)}</td>
            </tr>`,
          )
          .join(""),
        "margin:2px 0 6px",
      );
    case "bullets":
      if (!b.items.length) return "";
      return table(
        b.items
          .map(
            (item) => `<tr>
              <td valign="top" style="padding:6px 10px 6px 0;width:20px">
                <div class="em-accentsoft" style="width:20px;height:20px;border-radius:10px;background:${C.accentSoft};color:${C.accentInk};font-size:11px;font-weight:800;text-align:center;line-height:20px">&#10003;</div>
              </td>
              <td valign="top" class="em-ink2" style="padding:6px 0;font-size:15px;line-height:1.55;color:${C.ink2}">${esc(item)}</td>
            </tr>`,
          )
          .join(""),
        "margin:2px 0 12px",
      );
    case "callout":
      return table(
        `<tr><td class="em-fill" style="padding:16px 18px;background:${C.fill};border-radius:14px;border-left:3px solid ${C.accent}">
          <p class="em-ink" style="margin:0 0 4px;font-size:14px;font-weight:600;color:${C.ink}">${esc(b.title)}</p>
          <p class="em-ink2" style="margin:0;font-size:14px;line-height:1.55;color:${C.ink2}">${esc(b.text)}</p>
        </td></tr>`,
        "margin:18px 0 6px",
      );
    case "stats": {
      const tiles = b.tiles.filter((x) => x.value);
      if (!tiles.length) return "";
      const w = Math.floor(100 / tiles.length);
      return table(
        `<tr>${tiles
          .map(
            (x, i) => `<td width="${w}%" valign="top" style="padding:0 ${i < tiles.length - 1 ? "8px" : "0"} 0 0">
              ${table(
                `<tr><td class="em-fill" style="padding:16px 12px;background:${C.fill};border-radius:14px;text-align:center">
                  <p class="em-ink" style="margin:0;font-size:26px;line-height:1.1;font-weight:700;letter-spacing:-.01em;color:${C.ink}">${esc(x.value)}</p>
                  <p class="em-ink3" style="margin:6px 0 0;font-size:12px;line-height:1.3;color:${C.ink3};font-weight:500">${esc(x.label)}</p>
                </td></tr>`,
              )}
            </td>`,
          )
          .join("")}</tr>`,
        "margin:8px 0 12px",
      );
    }
    case "progress": {
      const pct = Math.max(0, Math.min(100, Math.round(b.percent)));
      return table(
        `<tr><td class="em-ink3" style="padding:0 0 8px;font-size:13px;color:${C.ink3};font-weight:500">${esc(b.label)} · ${pct}%</td></tr>
         <tr><td>${table(
           `<tr>${pct > 0 ? `<td width="${pct}%" style="height:8px;background:${C.accent};border-radius:99px;font-size:0;line-height:0">&nbsp;</td>` : ""}<td style="font-size:0;line-height:0">&nbsp;</td></tr>`,
           `background:${C.line};border-radius:99px`,
           "em-track",
         )}</td></tr>`,
        "margin:10px 0 16px",
      );
    }
  }
}

function blockText(b: Block): string {
  switch (b.t) {
    case "p":
      return b.text;
    case "section":
      return `\n${b.text.toUpperCase()}`;
    case "score":
      return `${b.label}: ${b.value}${b.caption ? `\n${b.caption}` : ""}`;
    case "details":
      return b.rows.map((r) => `${r.label}: ${r.value}`).join("\n");
    case "steps":
      return b.items.map((x, i) => `${i + 1}. ${x}`).join("\n");
    case "bullets":
      return b.items.map((x) => `- ${x}`).join("\n");
    case "callout":
      return `${b.title}: ${b.text}`;
    case "stats":
      return b.tiles.filter((x) => x.value).map((x) => `${x.label}: ${x.value}`).join(" · ");
    case "progress":
      return `${b.label}: ${Math.round(b.percent)}%`;
  }
}

const DARK_CSS = `
:root{color-scheme:light dark;supported-color-schemes:light dark}
body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
a{text-decoration:none}
@media (max-width:620px){.em-pad{padding-left:22px!important;padding-right:22px!important}.em-h1{font-size:26px!important}.em-btn-t{display:table!important;width:100%!important}.em-btn a{display:block!important;text-align:center!important}.em-sec{display:block!important;margin:10px 0 0!important}.em-sec a{display:block!important;text-align:center!important}}
@media (prefers-color-scheme:dark){
.em-page{background:#000000!important}.em-card{background:#141416!important;border-color:#2A2A2E!important}
.em-ink{color:#FFFFFF!important}.em-ink2{color:#C7C7CC!important}.em-ink3{color:#8C8C8C!important}
.em-fill{background:#1F1F23!important}.em-line{border-color:#2A2A2E!important}.em-track{background:#2A2A2E!important}
.em-accentsoft{background:#1A2A44!important;color:#5AADFF!important}.em-link{color:#5AADFF!important}
.em-graphite{background:#232327!important}.em-sec a{background:#1F1F23!important;color:#FFFFFF!important;border-color:#2A2A2E!important}
}
[data-ogsc] .em-page{background:#000000!important}[data-ogsc] .em-card{background:#141416!important}
[data-ogsc] .em-ink{color:#FFFFFF!important}[data-ogsc] .em-ink2{color:#C7C7CC!important}[data-ogsc] .em-ink3{color:#8C8C8C!important}
[data-ogsc] .em-fill{background:#1F1F23!important}[data-ogsc] .em-link{color:#5AADFF!important}
`;

/** Render the branded HTML + plain-text email. */
export function renderLayout(c: EmailContent): RenderedEmail {
  const base = appUrl();
  const primary = c.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-btn-t" style="display:inline-table"><tr><td class="em-btn" style="border-radius:14px;background:${C.accent}">
        <a href="${esc(c.cta.url)}" style="display:inline-block;padding:15px 26px;font-size:16px;line-height:1;font-weight:600;color:#FFFFFF;border-radius:14px;background:${C.accent};font-family:${FONT}">${esc(c.cta.label)}</a>
      </td></tr></table>`
    : "";
  const secondary = c.secondary
    ? `<span class="em-sec" style="display:inline-block;margin-left:10px;vertical-align:top"><a href="${esc(c.secondary.url)}" style="display:inline-block;padding:14px 20px;font-size:15px;line-height:1;font-weight:600;color:${C.ink};border:1px solid ${C.line};border-radius:14px;background:${C.card};font-family:${FONT}">${esc(c.secondary.label)}</a></span>`
    : "";
  const signature =
    c.sender === "mike"
      ? table(
          `<tr><td class="em-line" style="padding:22px 0 0;border-top:1px solid ${C.line}">
            <p class="em-ink" style="margin:0;font-size:17px;line-height:1.4;font-weight:600;font-style:italic;color:${C.ink}">Mike</p>
            <p class="em-ink3" style="margin:2px 0 0;font-size:13px;color:${C.ink3}">${MIKE} · Founder, ${BRAND}</p>
          </td></tr>`,
          "margin:30px 0 0",
        )
      : "";
  const footerLinks = [
    { label: "Open the app", url: `${base}/today` },
    { label: "Notification settings", url: `${base}/you/settings#notifications` },
  ]
    .map((l) => `<a class="em-link" href="${l.url}" style="color:${C.accentInk};font-weight:600;margin-right:16px">${esc(l.label)}</a>`)
    .join("");

  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(c.subject)}</title>
<style>${DARK_CSS}</style>
</head>
<body class="em-page" style="margin:0;padding:0;background:${C.page};font-family:${FONT};color:${C.ink};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(c.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
${table(
  `<tr><td align="center" style="padding:32px 12px 40px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
      <tr><td class="em-pad" style="padding:0 8px 16px">
        ${table(`<tr>
          <td style="vertical-align:middle">
            <p class="em-ink" style="margin:0;font-size:15px;line-height:1;font-weight:800;letter-spacing:.18em;color:${C.ink}">MIKE SALEMI</p>
            <p class="em-ink3" style="margin:5px 0 0;font-size:12px;line-height:1;color:${C.ink3};letter-spacing:.02em">${BRAND}</p>
          </td>
        </tr>`)}
      </td></tr>
      <tr><td class="em-card" style="background:${C.card};border:1px solid ${C.line};border-radius:24px">
        ${table(`<tr><td class="em-pad" style="padding:36px 36px 34px">
          <p style="margin:0 0 14px;font-size:13px;line-height:1;font-weight:600;color:${C.accentInk}" class="em-link">${esc(c.eyebrow)}</p>
          <h1 class="em-ink em-h1" style="margin:0 0 ${c.subheading ? "10px" : "18px"};font-size:30px;line-height:1.15;font-weight:700;letter-spacing:-.02em;color:${C.ink}">${esc(c.heading)}</h1>
          ${c.subheading ? `<p class="em-ink2" style="margin:0 0 22px;font-size:17px;line-height:1.5;color:${C.ink2}">${esc(c.subheading)}</p>` : ""}
          ${c.blocks.map(blockHtml).join("\n")}
          ${primary || secondary ? `<div style="margin:28px 0 0">${primary}${secondary}</div>` : ""}
          ${c.ctaNote ? `<p class="em-ink3" style="margin:14px 0 0;font-size:13px;line-height:1.5;color:${C.ink3}">${esc(c.ctaNote)}</p>` : ""}
          ${signature}
        </td></tr>`)}
      </td></tr>
      <tr><td class="em-pad" style="padding:22px 12px 0">
        <p style="margin:0 0 10px;font-size:13px;line-height:1.6">${footerLinks}</p>
        <p class="em-ink3" style="margin:0;font-size:12px;line-height:1.6;color:${C.ink3}">You're getting this because of your ${BRAND} account and notification settings. Change what we send any time in Settings.</p>
      </td></tr>
    </table>
  </td></tr>`,
  `background:${C.page}`,
  "em-page",
)}
</body>
</html>`;

  const text = [
    c.heading,
    c.subheading ?? "",
    "",
    ...c.blocks.map(blockText).filter(Boolean),
    "",
    c.cta ? `${c.cta.label}: ${c.cta.url}` : "",
    c.secondary ? `${c.secondary.label}: ${c.secondary.url}` : "",
    c.ctaNote ?? "",
    c.sender === "mike" ? `\n— Mike\n${MIKE} · Founder, ${BRAND}` : "",
    "",
    "--",
    `Notification settings: ${base}/you/settings#notifications`,
  ]
    .filter((x, i, a) => !(x === "" && a[i - 1] === ""))
    .join("\n")
    .trim();

  return { subject: c.subject, html, text, sender: c.sender, preheader: c.preheader };
}
