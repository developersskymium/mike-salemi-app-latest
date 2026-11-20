import "server-only";
import { createPrivateKey, sign } from "node:crypto";

/**
 * Web push without a dependency: a VAPID-signed, payload-less push. The service worker
 * (public/sw.js) wakes up, fetches the member's pending notifications from /api/notifications
 * and shows them. Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (base64url), VAPID_SUBJECT (mailto:).
 */

export interface WebPushSubscription {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
}

export type PushResult = { status: "sent" } | { status: "gone" } | { status: "not_configured"; error: string } | { status: "failed"; error: string };

export const PUSH_NOT_CONFIGURED = "Push isn't set up yet (VAPID keys are not set).";

export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function vapidJwt(audience: string) {
  const pub = fromB64url(process.env.VAPID_PUBLIC_KEY!);
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)), d: process.env.VAPID_PRIVATE_KEY! },
    format: "jwk",
  });
  const header = b64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(
    Buffer.from(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: process.env.VAPID_SUBJECT || "mailto:support@mikesalemi.com" })),
  );
  const sig = sign("sha256", Buffer.from(`${header}.${claims}`), { key, dsaEncoding: "ieee-p1363" });
  return `${header}.${claims}.${b64url(sig)}`;
}

/** Wake one subscription. "gone" means the browser dropped it: remove the token. */
export async function sendPush(sub: WebPushSubscription): Promise<PushResult> {
  if (!pushConfigured()) return { status: "not_configured", error: PUSH_NOT_CONFIGURED };
  try {
    const u = new URL(sub.endpoint);
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        TTL: "3600",
        Urgency: "normal",
        "Content-Length": "0",
        Authorization: `vapid t=${vapidJwt(`${u.protocol}//${u.host}`)}, k=${process.env.VAPID_PUBLIC_KEY}`,
      },
    });
    if (res.status === 404 || res.status === 410) return { status: "gone" };
    if (!res.ok) return { status: "failed", error: `Push service ${res.status}` };
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "Network error" };
  }
}
