/** Display helpers shared by commerce, experiences and orgs screens. */

export function money(cents: number, currency = "usd") {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
}

export function dateLong(iso: string, tz?: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz }).format(new Date(iso));
}
export function dateShort(iso: string, tz?: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz }).format(new Date(iso));
}
export function dayMonth(iso: string, tz?: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: tz }).format(new Date(iso));
}
export function time(iso: string, tz?: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(iso));
}

/** "May 13 – 16, 2027" */
export function dateRange(startIso: string, endIso: string | null, tz?: string) {
  const s = new Date(startIso);
  if (!endIso) return dateShort(startIso, tz);
  const e = new Date(endIso);
  const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...o, timeZone: tz }).format(d);
  const sameMonth = f(s, { month: "short", year: "numeric" }) === f(e, { month: "short", year: "numeric" });
  return sameMonth
    ? `${f(s, { month: "short", day: "numeric" })} – ${f(e, { day: "numeric" })}, ${f(e, { year: "numeric" })}`
    : `${f(s, { month: "short", day: "numeric" })} – ${f(e, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function relativeDays(iso: string, now = Date.now()) {
  const d = Math.round((new Date(iso).getTime() - now) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return d > 0 ? `in ${d} days` : `${-d} days ago`;
}

export const INTERVAL_LABEL: Record<string, string> = { month: "month", year: "year", one_time: "one time" };
