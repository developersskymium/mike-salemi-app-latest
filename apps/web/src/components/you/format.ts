/** Small formatting helpers shared by the You screens (pure, server or client). */

const dtf = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...o });
const DAY = dtf({ day: "numeric", month: "short" });
const DAY_Y = dtf({ day: "numeric", month: "short", year: "numeric" });
const LONG = dtf({ day: "numeric", month: "long", year: "numeric" });
const MONTH = dtf({ month: "long", year: "numeric" });

export const fmtDay = (iso: string) => DAY.format(new Date(iso));
export const fmtDayYear = (iso: string) => DAY_Y.format(new Date(iso));
export const fmtLong = (iso: string) => LONG.format(new Date(iso));
export const fmtMonth = (iso: string) => MONTH.format(new Date(iso));
export const monthKey = (iso: string) => iso.slice(0, 7);

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;

export function fmtMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const money = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

/** "Level I · Beginner" → "Level I". */
export const levelShort = (path: string | null | undefined) => path?.split("·")[0]?.trim() ?? null;

/** "Day 23 - Workout II Day" → { day: "23", title: "Workout II Day" }. */
export function splitDay(title: string) {
  const m = title.match(/^Day\s+(\d+)\s*[-–—:]\s*(.+)$/i);
  return m ? { day: m[1]!, title: m[2]! } : { day: null, title };
}

/** Machine-readable passport line (MRZ style): P<MSA<SURNAME<<GIVEN<<<… */
export function mrz(name: string, id: string, width = 44) {
  const clean = (s: string) => s.toUpperCase().normalize("NFD").replace(/[^A-Z ]/g, "").trim();
  const parts = clean(name).split(/\s+/).filter(Boolean);
  const surname = parts.length > 1 ? parts[parts.length - 1]! : parts[0] ?? "MEMBER";
  const given = parts.length > 1 ? parts.slice(0, -1).join("<") : "";
  const l1 = `P<MSA${surname}<<${given}`.padEnd(width, "<").slice(0, width);
  const l2 = `${id.replace(/-/g, "").toUpperCase().slice(0, 9)}<MSA<KBL<<${id.replace(/\D/g, "").slice(0, 10)}`.padEnd(width, "<").slice(0, width);
  return [l1, l2] as const;
}

/** Passport number shown on the card: MS-XXXX-XXXX from the member id. */
export const passportNo = (id: string) => `MS-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}-${id.replace(/-/g, "").slice(-4).toUpperCase()}`;
