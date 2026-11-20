import { describe, expect, it } from "vitest";
import { ALWAYS_SEND, EMAIL_GROUPS, EMAIL_KINDS, sampleEmail } from "./catalog";
import { coachingReminderDue, decide, type Candidate } from "./reminders";
import { renderEmail } from "./templates";

describe("every catalogued email renders", () => {
  for (const k of EMAIL_KINDS) {
    it(k.id, () => {
      const r = renderEmail(sampleEmail(k.id, "Daniel Test"));
      expect(r.subject.length).toBeGreaterThan(5);
      expect(r.html).toContain("<!doctype html>");
      expect(r.html).not.toMatch(/undefined|NaN|\[object Object\]/);
      expect(r.text).not.toMatch(/undefined|NaN|\[object Object\]/);
      expect(EMAIL_GROUPS).toContain(k.group);
    });
  }

  it("ids are unique and transactional kinds are catalogued", () => {
    const ids = EMAIL_KINDS.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const k of ALWAYS_SEND) expect(ids).toContain(k);
  });

  it("retreat waitlist and minimal billing data render", () => {
    const w = renderEmail({ kind: "retreat_application_update", retreatName: "Mount Shasta", status: "waitlist" });
    expect(w.subject).toContain("waitlist");
    const r = renderEmail({ kind: "payment_receipt", itemName: "Level I", amount: "$49.00", paidOn: "Friday, November 21, 2026" });
    expect(r.html).not.toMatch(/undefined/);
    const s = renderEmail({ kind: "order_shipped", reference: "KL-1", items: [] });
    expect(s.text).toContain("View your order");
  });
});

const base = (over: Partial<Candidate> = {}): Candidate => ({
  user_id: "u1",
  email: "a@b.com",
  first_name: "Dan",
  tz: "UTC",
  local_date: "2026-11-21",
  local_time: "07:10",
  local_dow: 6,
  prefs: {
    has_row: true, email_enabled: true, push_enabled: false, in_app_enabled: true, reminders_enabled: true, frequency: "every_day",
    reminder_time: "07:00", reminder_days: [], reminder_times: {}, quiet_start: null, quiet_end: null, streak_nudge: true, weekly_recap: true,
    snoozed_until: null, skip_date: null,
  },
  today_items: [],
  has_active_plan: true,
  enrollment: { program_name: "Level I", program_slug: "level-1" },
  streak: 0,
  last_active: "2026-11-05",
  week: { days: 0, lessons: 0, minutes: 0, badges: [] },
  next_up: null,
  push_count: 0,
  last_win_back: null,
  ...over,
});
const now = new Date("2026-11-21T07:10:00Z");

describe("win-back", () => {
  it("goes out after 14 quiet days at reminder time", () => {
    const d = decide(base(), now).find((x) => x.kind === "win_back");
    expect(d?.channels).toEqual(["email"]);
    expect(d?.email).toMatchObject({ kind: "win_back", daysAway: 16, programName: "Level I" });
  });
  it("respects recent win-backs, nudge switch, email switch and quiet hours", () => {
    const has = (c: Candidate) => decide(c, now).some((x) => x.kind === "win_back");
    expect(has(base({ last_win_back: "2026-11-01T07:00:00Z" }))).toBe(false);
    expect(has(base({ last_win_back: "2026-10-10T07:00:00Z" }))).toBe(true);
    expect(has(base({ prefs: { ...base().prefs, streak_nudge: false } }))).toBe(false);
    expect(has(base({ prefs: { ...base().prefs, email_enabled: false } }))).toBe(false);
    expect(has(base({ prefs: { ...base().prefs, quiet_start: "06:00", quiet_end: "09:00" } }))).toBe(false);
    expect(has(base({ last_active: "2026-11-15" }))).toBe(false);
    expect(has(base({ local_time: "15:00" }))).toBe(false);
  });
});

describe("coaching reminder", () => {
  const b = { starts_at: "2026-11-22T06:00:00Z", created_at: "2026-11-10T00:00:00Z", status: "booked" };
  it("sends within 24h of the call", () => expect(coachingReminderDue(b, null, 420, now)).toBe(true));
  it("not too early, not for fresh or cancelled bookings, not in quiet hours", () => {
    expect(coachingReminderDue({ ...b, starts_at: "2026-11-23T06:00:00Z" }, null, 420, now)).toBe(false);
    expect(coachingReminderDue({ ...b, created_at: "2026-11-21T07:00:00Z" }, null, 420, now)).toBe(false);
    expect(coachingReminderDue({ ...b, status: "cancelled" }, null, 420, now)).toBe(false);
    expect(coachingReminderDue(b, { email_enabled: true, quiet_start: "21:00", quiet_end: "08:00" }, 420, now)).toBe(false);
    expect(coachingReminderDue(b, { email_enabled: false, quiet_start: null, quiet_end: null }, 420, now)).toBe(false);
  });
});
