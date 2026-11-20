import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Calendar subscribe link (spec 12 Plan #7): /cal/<token>.ics where the token is the member id plus an
 * HMAC signature. Anyone holding the link can read that member's schedule titles only — nothing else.
 * Secret: CALENDAR_FEED_SECRET, falling back to the service-role key (server only, never sent to clients).
 */
function secret() {
  const s = process.env.CALENDAR_FEED_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NODE_ENV === "development" ? "dev-calendar-feed" : "");
  if (!s) throw new Error("Calendar feed secret is not set");
  return s;
}

const sign = (userId: string) => createHmac("sha256", secret()).update(`cal-feed:v1:${userId}`).digest("base64url").slice(0, 32);

export function feedToken(userId: string) {
  return `${Buffer.from(userId).toString("base64url")}.${sign(userId)}`;
}

/** The member id for a valid token, else null. */
export function verifyFeedToken(token: string): string | null {
  const [a, b] = token.replace(/\.ics$/, "").split(".");
  if (!a || !b) return null;
  const id = Buffer.from(a, "base64url").toString("utf8");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const want = Buffer.from(sign(id));
  const got = Buffer.from(b);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}
