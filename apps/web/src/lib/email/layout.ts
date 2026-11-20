/**
 * Branded email layout (Summit). Table-based HTML (Gmail, Outlook, Apple Mail, Yahoo), inline styles,
 * a small dark-mode layer (`prefers-color-scheme` for Apple Mail / iOS / Outlook.com, `[data-ogsc]`
 * for Outlook.com's forced dark) and a plain-text alternative built from the same blocks.
 *
 * Visual language follows the app: warm chalk ground, a crisp white card, Mike in full colour at the
 * top where it fits, Archivo-style heavy headlines, glacier blue for the one action, ember for
 * progress, streaks and achievements.
 */
import { appUrl, BRAND, MIKE, type EmailSender } from "./config";

/* Summit tokens (packages/tokens, light theme; dark overrides live in DARK_CSS). */
const C = {
  page: "#F5F2EC",
  card: "#FFFFFF",
  ink: "#0E1B2C",
  ink2: "#4A5563",
  ink3: "#6C7684",
  line: "#E6E0D6",
  fill: "#F1EDE6",
  accent: "#1A85D6",
  accentInk: "#135690",
  accentSoft: "#EEF6FD",
  warm: "#F2632A",
  warmInk: "#A93C12",
  warmSoft: "#FFF3EC",
  ok: "#1F9D6A",
  okSoft: "#E5F5EE",
  night: "#0E1B2C",
} as const;
const FONT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const DISPLAY = "Archivo,'Helvetica Neue',Helvetica,Arial,sans-serif";

export type Block =
  | { t: "p"; text: string; strong?: boolean }
  | { t: "section"; text: string }
  | { t: "score"; value: string; label: string; caption?: string }
  | { t: "details"; rows: { label: string; value: string }[] }
  | { t: "steps"; items: string[] }
  | { t: "bullets"; items: string[] }
  | { t: "callout"; title: string; text: string }
  | { t: "stats"; tiles: { value: string; label: string; warm?: boolean }[] }
  | { t: "progress"; percent: number; label: string }
  | { t: "achievement"; label: string; items: string[]; caption?: string };

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
  /** Full-colour header photo (a 1200×560 crop in /media/email, no baked-in text). */
  hero?: { src: string; alt: string };
  /** warm = achievements and streaks: ember eyebrow and accents. */
  tone?: "accent" | "warm";
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
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${cls ? ` class="${cls}"` : ""} style="border-collapse:separate;mso-table-lspace:0;mso-table-rspace:0;${style}">${inner}</table>`;

function blockHtml(b: Block): string {
  switch (b.t) {
    case "p":
      return `<p class="em-ink2" style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.ink2}">${b.strong ? `<strong class="em-ink" style="color:${C.ink};font-weight:650">${esc(b.text)}</strong>` : esc(b.text)}</p>`;
    case "section":
      return `<p class="em-ink3" style="margin:28px 0 10px;font-family:${FONT};font-size:11.5px;line-height:1.4;letter-spacing:.09em;text-transform:uppercase;color:${C.ink3};font-weight:650">${esc(b.text)}</p>`;
    case "score":
      return table(
        `<tr><td class="em-night" style="padding:24px 24px 22px;background:${C.night};border-radius:20px;text-align:left">
          <p style="margin:0;font-family:${FONT};font-size:11.5px;letter-spacing:.09em;text-transform:uppercase;color:#FFB58C;font-weight:650">${esc(b.label)}</p>
          <p style="margin:8px 0 0;font-family:${DISPLAY};font-size:48px;line-height:1;font-weight:800;letter-spacing:-.03em;color:#FFFFFF">${esc(b.value)}</p>
          ${b.caption ? `<p style="margin:12px 0 0;font-family:${FONT};font-size:15px;line-height:1.5;color:#D3D8DF">${esc(b.caption)}</p>` : ""}
        </td></tr>`,
        "margin:6px 0 8px",
      );
    case "achievement":
      if (!b.items.length) return "";
      return table(
        `<tr><td class="em-warmsoft" style="padding:20px 22px;background:${C.warmSoft};border:1px solid #FFD9C4;border-radius:20px">
          <p class="em-warmink" style="margin:0 0 12px;font-family:${FONT};font-size:11.5px;letter-spacing:.09em;text-transform:uppercase;color:${C.warmInk};font-weight:700">${esc(b.label)}</p>
          ${table(
            b.items
              .map(
                (item) => `<tr>
                  <td valign="middle" style="padding:6px 12px 6px 0;width:36px">
                    <div style="width:36px;height:36px;border-radius:18px;background:${C.warm};color:#FFFFFF;font-family:${DISPLAY};font-size:17px;font-weight:800;text-align:center;line-height:36px">&#9733;</div>
                  </td>
                  <td valign="middle" class="em-ink" style="padding:6px 0;font-family:${DISPLAY};font-size:18px;line-height:1.3;font-weight:800;color:${C.ink};letter-spacing:-.01em">${esc(item)}</td>
                </tr>`,
              )
              .join(""),
          )}
          ${b.caption ? `<p class="em-ink2" style="margin:10px 0 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink2}">${esc(b.caption)}</p>` : ""}
        </td></tr>`,
        "margin:4px 0 10px",
      );
    case "details":
      if (!b.rows.length) return "";
      return table(
        b.rows
          .map(
            (r, i) => `<tr>
              <td class="em-ink3 em-line" style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-family:${FONT};font-size:14px;line-height:1.4;color:${C.ink3};width:42%;vertical-align:top">${esc(r.label)}</td>
              <td class="em-ink em-line" style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ""}font-family:${FONT};font-size:14px;line-height:1.4;color:${C.ink};font-weight:650;text-align:right;vertical-align:top">${esc(r.value)}</td>
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
              <td valign="top" style="padding:7px 12px 7px 0;width:28px">
                <div class="em-accentsoft" style="width:28px;height:28px;border-radius:14px;background:${C.accentSoft};color:${C.accentInk};font-family:${DISPLAY};font-size:13px;font-weight:800;text-align:center;line-height:28px">${i + 1}</div>
              </td>
              <td valign="top" class="em-ink2" style="padding:10px 0 7px;font-family:${FONT};font-size:15px;line-height:1.55;color:${C.ink2}">${esc(item)}</td>
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
                <div class="em-oksoft" style="width:20px;height:20px;border-radius:10px;background:${C.okSoft};color:${C.ok};font-size:11px;font-weight:800;text-align:center;line-height:20px">&#10003;</div>
              </td>
              <td valign="top" class="em-ink2" style="padding:6px 0;font-family:${FONT};font-size:15px;line-height:1.55;color:${C.ink2}">${esc(item)}</td>
            </tr>`,
          )
          .join(""),
        "margin:2px 0 12px",
      );
    case "callout":
      return table(
        `<tr><td class="em-fill" style="padding:16px 18px;background:${C.fill};border-radius:16px">
          <p class="em-ink" style="margin:0 0 4px;font-family:${FONT};font-size:14.5px;font-weight:650;color:${C.ink}">${esc(b.title)}</p>
          <p class="em-ink2" style="margin:0;font-family:${FONT};font-size:14px;line-height:1.55;color:${C.ink2}">${esc(b.text)}</p>
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
                `<tr><td class="em-fill" style="padding:16px 10px;background:${C.fill};border-radius:16px;text-align:center">
                  <p class="${x.warm ? "em-warm" : "em-ink"}" style="margin:0;font-family:${DISPLAY};font-size:28px;line-height:1.05;font-weight:800;letter-spacing:-.02em;color:${x.warm ? C.warm : C.ink}">${esc(x.value)}</p>
                  <p class="em-ink3" style="margin:6px 0 0;font-family:${FONT};font-size:12px;line-height:1.3;color:${C.ink3};font-weight:550">${esc(x.label)}</p>
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
        `<tr><td class="em-ink3" style="padding:0 0 8px;font-family:${FONT};font-size:13px;color:${C.ink3};font-weight:550">${esc(b.label)} · <span class="em-warm" style="color:${C.warm};font-weight:700">${pct}%</span></td></tr>
         <tr><td>${table(
           `<tr>${pct > 0 ? `<td width="${pct}%" class="em-warmbar" style="height:10px;background:${C.warm};border-radius:99px;font-size:0;line-height:0">&nbsp;</td>` : ""}<td style="font-size:0;line-height:0">&nbsp;</td></tr>`,
           `background:${C.fill};border-radius:99px`,
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
    case "achievement":
      return `${b.label}:\n${b.items.map((x) => `* ${x}`).join("\n")}${b.caption ? `\n${b.caption}` : ""}`;
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

/* Dark: warm ink ground, raised card, lighter glacier and ember. Keep the media query string as is:
   the Studio preview swaps "@media (prefers-color-scheme:dark){" to show either theme. */
const DARK_CSS = `
:root{color-scheme:light dark;supported-color-schemes:light dark}
body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a{text-decoration:none}
@media (max-width:620px){.em-pad{padding-left:22px!important;padding-right:22px!important}.em-h1{font-size:28px!important}.em-btn-t{display:table!important;width:100%!important}.em-btn a{display:block!important;text-align:center!important}.em-sec{display:block!important;margin:10px 0 0!important}.em-sec a{display:block!important;text-align:center!important}.em-outer{padding:16px 8px 28px!important}}
@media (prefers-color-scheme:dark){
.em-page{background:#101215!important}.em-card{background:#181B20!important;border-color:#2A2F37!important}
.em-ink{color:#F5F2EC!important}.em-ink2{color:#B3B9C2!important}.em-ink3{color:#858D98!important}
.em-fill{background:#1D2127!important}.em-line{border-color:#2A2F37!important}.em-track{background:#1D2127!important}
.em-accentsoft{background:#14283A!important;color:#8CCBF5!important}.em-link{color:#62B4EE!important}
.em-oksoft{background:#15302A!important;color:#37C08A!important}
.em-warm{color:#FF7F3F!important}.em-warmink{color:#FFB58C!important}.em-warmbar{background:#FF7F3F!important}
.em-warmsoft{background:#2A1D16!important;border-color:#4A2C1E!important}
.em-btn,.em-btn a{background:#3FA0E6!important}
.em-sec a{background:#1D2127!important;color:#F5F2EC!important;border-color:#383E48!important}
.em-night{background:#0B0D10!important}
}
[data-ogsc] .em-page{background:#101215!important}[data-ogsc] .em-card{background:#181B20!important}
[data-ogsc] .em-ink{color:#F5F2EC!important}[data-ogsc] .em-ink2{color:#B3B9C2!important}[data-ogsc] .em-ink3{color:#858D98!important}
[data-ogsc] .em-fill{background:#1D2127!important}[data-ogsc] .em-link{color:#62B4EE!important}[data-ogsc] .em-warm{color:#FF7F3F!important}
`;

/** Render the branded HTML + plain-text email. */
export function renderLayout(c: EmailContent): RenderedEmail {
  const base = appUrl();
  const abs = (src: string) => (/^https?:/.test(src) ? src : `${base}${src}`);
  const warm = c.tone === "warm";
  const primary = c.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-btn-t" style="display:inline-table"><tr><td class="em-btn" style="border-radius:999px;background:${C.accent}">
        <a href="${esc(c.cta.url)}" style="display:inline-block;padding:16px 28px;font-family:${FONT};font-size:16px;line-height:1;font-weight:650;color:#FFFFFF;border-radius:999px;background:${C.accent}">${esc(c.cta.label)}</a>
      </td></tr></table>`
    : "";
  const secondary = c.secondary
    ? `<span class="em-sec" style="display:inline-block;margin-left:10px;vertical-align:top"><a href="${esc(c.secondary.url)}" style="display:inline-block;padding:15px 22px;font-family:${FONT};font-size:15px;line-height:1;font-weight:650;color:${C.ink};border:1px solid ${C.line};border-radius:999px;background:${C.card}">${esc(c.secondary.label)}</a></span>`
    : "";
  const signature =
    c.sender === "mike"
      ? table(
          `<tr>
            <td class="em-line" style="padding:22px 14px 0 0;border-top:1px solid ${C.line};width:56px" valign="middle">
              <img src="${abs("/media/email/mike.jpg")}" width="56" height="56" alt="Mike Salemi" style="display:block;width:56px;height:56px;border-radius:28px">
            </td>
            <td class="em-line" style="padding:22px 0 0;border-top:1px solid ${C.line}" valign="middle">
              <p class="em-ink" style="margin:0;font-family:${DISPLAY};font-size:17px;line-height:1.3;font-weight:800;color:${C.ink}">Mike</p>
              <p class="em-ink3" style="margin:2px 0 0;font-family:${FONT};font-size:13px;color:${C.ink3}">${MIKE} · ${BRAND}</p>
            </td>
          </tr>`,
          "margin:30px 0 0",
        )
      : "";
  const hero = c.hero
    ? `<tr><td style="padding:0;font-size:0;line-height:0"><img src="${esc(abs(c.hero.src))}" width="600" alt="${esc(c.hero.alt)}" style="display:block;width:100%;max-width:600px;height:auto;border-radius:24px 24px 0 0"></td></tr>`
    : "";
  const footerLinks = [
    { label: "Open the app", url: `${base}/today` },
    { label: "Notification settings", url: `${base}/you/settings#notifications` },
  ]
    .map((l) => `<a class="em-link" href="${l.url}" style="color:${C.accentInk};font-weight:650;margin-right:16px">${esc(l.label)}</a>`)
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
  `<tr><td align="center" class="em-outer" style="padding:32px 12px 40px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
      <tr><td class="em-pad" style="padding:0 8px 16px">
        ${table(`<tr>
          <td style="vertical-align:middle;width:40px;padding-right:10px">
            <img src="${abs("/media/email/mark.png")}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border-radius:11px">
          </td>
          <td style="vertical-align:middle">
            <p class="em-ink" style="margin:0;font-family:${DISPLAY};font-size:15px;line-height:1;font-weight:800;letter-spacing:.04em;color:${C.ink}">MIKE SALEMI</p>
            <p class="em-ink3" style="margin:5px 0 0;font-family:${FONT};font-size:10px;line-height:1;color:${C.ink3};letter-spacing:.14em;text-transform:uppercase;font-weight:650">Kettlebell · Movement</p>
          </td>
        </tr>`)}
      </td></tr>
      <tr><td class="em-card" style="background:${C.card};border:1px solid ${C.line};border-radius:24px;box-shadow:0 1px 2px rgba(14,27,44,.04),0 6px 20px -8px rgba(14,27,44,.14)">
        ${table(`${hero}<tr><td class="em-pad" style="padding:${c.hero ? "30px" : "36px"} 36px 34px">
          <p class="${warm ? "em-warmink" : "em-link"}" style="margin:0 0 12px;font-family:${FONT};font-size:11.5px;line-height:1;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:${warm ? C.warmInk : C.accentInk}">${esc(c.eyebrow)}</p>
          <h1 class="em-ink em-h1" style="margin:0 0 ${c.subheading ? "10px" : "18px"};font-family:${DISPLAY};font-size:32px;line-height:1.1;font-weight:800;letter-spacing:-.025em;color:${C.ink}">${esc(c.heading)}</h1>
          ${c.subheading ? `<p class="em-ink2" style="margin:0 0 22px;font-family:${FONT};font-size:17px;line-height:1.5;color:${C.ink2}">${esc(c.subheading)}</p>` : ""}
          ${c.blocks.map(blockHtml).join("\n")}
          ${primary || secondary ? `<div style="margin:28px 0 0">${primary}${secondary}</div>` : ""}
          ${c.ctaNote ? `<p class="em-ink3" style="margin:14px 0 0;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.ink3}">${esc(c.ctaNote)}</p>` : ""}
          ${signature}
        </td></tr>`)}
      </td></tr>
      <tr><td class="em-pad" style="padding:22px 12px 0">
        <p style="margin:0 0 10px;font-family:${FONT};font-size:13px;line-height:1.6">${footerLinks}</p>
        <p class="em-ink3" style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.ink3}">You're getting this because of your ${BRAND} account and notification settings. Change what we send any time in Settings.</p>
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
    c.sender === "mike" ? `\n— Mike\n${MIKE} · ${BRAND}` : "",
    "",
    "--",
    `Notification settings: ${base}/you/settings#notifications`,
  ]
    .filter((x, i, a) => !(x === "" && a[i - 1] === ""))
    .join("\n")
    .trim();

  return { subject: c.subject, html, text, sender: c.sender, preheader: c.preheader };
}
