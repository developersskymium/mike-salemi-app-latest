/**
 * Where a member stands with a retreat, from the application row and the run dates.
 * The client's three-step sign-up: Apply → Schedule a call → (if approved) Pay; then Booked,
 * Live while the run is on, and After once it has ended. Pure: shared by the retreat page,
 * the hub, the index and Home.
 */

export type RetreatStage =
  | "sales" // no application yet, applications open
  | "closed" // no application, not taking applications (full / past / cancelled)
  | "applied" // step 2 to do: pick a call time
  | "call" // call booked, still ahead
  | "review" // call done, waiting for Mike's decision
  | "pay" // accepted: step 3, pay to confirm
  | "waitlist"
  | "declined"
  | "booked" // paid, before the run
  | "live" // during the run
  | "after"; // run has ended

export type StepState = "done" | "now" | "wait" | "todo";
export interface RetreatStep { key: "apply" | "call" | "pay"; label: string; state: StepState; detail: string }

export interface StageInput {
  runStatus: string;
  startsAt: string;
  endsAt: string | null;
  application: { status: string; call_at?: string | null; call_done_at?: string | null } | null;
}

export function retreatStage(i: StageInput, now = Date.now()): RetreatStage {
  const a = i.application;
  const start = new Date(i.startsAt).getTime();
  const end = i.endsAt ? new Date(i.endsAt).getTime() : start + 86400000;
  if (!a || a.status === "cancelled") return ["open", "waitlist"].includes(i.runStatus) && now < start ? "sales" : "closed";
  switch (a.status) {
    case "booked":
      return now < start ? "booked" : now < end ? "live" : "after";
    case "accepted":
      return "pay";
    case "waitlist":
      return "waitlist";
    case "declined":
      return "declined";
    case "call_booked": {
      const past = a.call_at ? new Date(a.call_at).getTime() + 45 * 60000 < now : false;
      return a.call_done_at || past ? "review" : "call";
    }
    default:
      return a.call_done_at ? "review" : "applied";
  }
}

/** The three steps with their state; `when` formats the call time for the detail line. */
export function retreatSteps(stage: RetreatStage, when?: string | null): RetreatStep[] {
  const s = (apply: StepState, call: StepState, pay: StepState, d: [string, string, string]): RetreatStep[] => [
    { key: "apply", label: "Apply", state: apply, detail: d[0] },
    { key: "call", label: "Schedule a call", state: call, detail: d[1] },
    { key: "pay", label: "If approved, pay", state: pay, detail: d[2] },
  ];
  switch (stage) {
    case "sales":
    case "closed":
      return s("now", "todo", "todo", ["Five minutes, nothing charged", "A short call with Mike’s team", "Confirm your place"]);
    case "applied":
      return s("done", "now", "todo", ["Application received", "Pick a time that suits you", "After the call"]);
    case "call":
      return s("done", "now", "todo", ["Application received", when ? `Booked · ${when}` : "Call booked", "After the call"]);
    case "review":
      return s("done", "done", "wait", ["Application received", "Call done", "Mike is reviewing"]);
    case "pay":
      return s("done", "done", "now", ["Application received", "Call done", "You’re approved: confirm your place"]);
    case "waitlist":
      return s("done", "wait", "todo", ["On the waitlist", "When a place opens", "After the call"]);
    case "declined":
      return s("done", "done", "todo", ["Application received", "Call done", "Not this time"]);
    default:
      return s("done", "done", "done", ["Applied", "Call done", "Place confirmed"]);
  }
}

/** Day of the run (1-based) while live. */
export function runDay(startsAt: string, tz: string, now = Date.now()): number {
  const day = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(t));
  const a = new Date(`${day(new Date(startsAt).getTime())}T00:00:00Z`).getTime();
  const b = new Date(`${day(now)}T00:00:00Z`).getTime();
  return Math.floor((b - a) / 86400000) + 1;
}

export const STAGE_LABEL: Record<RetreatStage, string> = {
  sales: "Applications open",
  closed: "Closed",
  applied: "Applied · pick a call",
  call: "Call booked",
  review: "Awaiting approval",
  pay: "Approved · confirm",
  waitlist: "Waitlist",
  declined: "Not this time",
  booked: "You’re booked",
  live: "Happening now",
  after: "Integration",
};
