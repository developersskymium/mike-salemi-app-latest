/** 1:1 coaching packages and scheduling helpers. */

export type CoachingPackage = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  summary: string;
  includes: string[];
  /** Highlighted as the recommended option. */
  featured?: boolean;
};

export const coachingPackages: CoachingPackage[] = [
  {
    id: "single-60",
    name: "Single session",
    durationMinutes: 60,
    priceCents: 18000,
    summary: "One hour with Mike on the thing that is actually holding you back.",
    includes: ["60-minute video call", "Technique review on your footage", "Written notes afterwards"],
  },
  {
    id: "deep-dive-90",
    name: "Deep dive",
    durationMinutes: 90,
    priceCents: 25000,
    summary: "A longer session for a full movement screen and a rebuilt training block.",
    includes: ["90-minute video call", "Full movement screen", "Four-week block written for you", "Follow-up message thread"],
    featured: true,
  },
  {
    id: "block-4",
    name: "Four-session block",
    durationMinutes: 60,
    priceCents: 64000,
    summary: "A month of weekly calls with programming adjusted between each one.",
    includes: ["4 × 60-minute calls", "Programming adjusted weekly", "Unlimited footage review", "Priority scheduling"],
  },
];

export function findPackage(id: string) {
  return coachingPackages.find((p) => p.id === id) ?? null;
}

export function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** Mike coaches Tue–Sat mornings, Pacific. */
export const COACHING_SLOTS = ["07:00", "08:00", "09:00", "10:00", "11:00", "13:00", "14:00"];

/** The next `count` bookable days, skipping Sundays and Mondays. */
export function bookableDays(count = 14, from = new Date()): Date[] {
  const days: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);
  while (days.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 1) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function combineDayAndTime(day: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
