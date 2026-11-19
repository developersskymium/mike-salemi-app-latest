/**
 * Calendar sync helpers — pure, browser-safe.
 *
 * Produces an .ics feed (Apple Calendar, Outlook, Google import) and
 * "add to Google Calendar" template links for scheduled training days.
 */

export type CalendarEvent = {
  uid: string;
  title: string;
  description?: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM local start time */
  time: string;
  durationMinutes?: number;
  /** Minutes before start for a reminder alarm; omit for none. */
  reminderMinutesBefore?: number | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

function stamp(date: string, time: string, addMinutes = 0): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.slice(0, 5).split(":").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  dt.setMinutes(dt.getMinutes() + addMinutes);
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(
    dt.getMinutes(),
  )}00`;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function fold(line: string): string {
  if (line.length <= 74) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    chunks.push(rest.slice(0, 74));
    rest = rest.slice(74);
  }
  chunks.push(rest);
  return chunks.join("\r\n ");
}

/** Build an RFC 5545 calendar document for a set of training sessions. */
export function buildIcs(events: CalendarEvent[], calendarName = "Kettlebell Lifestyle"): string {
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(
    now.getUTCHours(),
  )}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kettlebell Lifestyle//Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}@kettlebell-lifestyle`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${stamp(ev.date, ev.time)}`);
    lines.push(`DTEND:${stamp(ev.date, ev.time, ev.durationMinutes ?? 60)}`);
    lines.push(`SUMMARY:${escapeText(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.reminderMinutesBefore != null) {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeText(ev.title)}`);
      lines.push(`TRIGGER:-PT${Math.max(0, Math.round(ev.reminderMinutesBefore))}M`);
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n");
}

/** Trigger a download of an .ics file in the browser. */
export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** "Add to Google Calendar" link for a single session. */
export function googleCalendarUrl(ev: CalendarEvent): string {
  const start = stamp(ev.date, ev.time);
  const end = stamp(ev.date, ev.time, ev.durationMinutes ?? 60);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${start}/${end}`,
    details: ev.description ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
