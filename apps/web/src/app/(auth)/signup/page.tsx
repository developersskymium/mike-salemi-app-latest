import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logReferralVisit } from "@ms/api";
import { MOCK } from "@/lib/mock";
import { createClient, getUser } from "@/lib/supabase/server";
import { googleEnabled, isApplicationPath } from "@/lib/auth/providers";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { SignUp } from "@/components/auth/AuthForms";
import { Icon } from "@/components/ui";
import { photo } from "@/lib/photos";
import "@/components/ui/form/form.css";

export const metadata: Metadata = { title: "Create your account" };

const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

/** First name of the member whose referral code this is ("Daniel invited you"), or null. */
async function inviter(ref: string | null): Promise<string | null> {
  if (!ref) return null;
  if (MOCK) return "Daniel";
  const sb = (await createClient()) as unknown as { rpc: (f: string, a: Record<string, unknown>) => PromiseLike<{ data: unknown }> };
  const { data } = await sb.rpc("referral_inviter", { p_code: ref });
  return typeof data === "string" && data ? data : null;
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; ref?: string; plan?: string }> }) {
  const sp = await searchParams;
  const ref = sp.ref && /^[A-Za-z0-9_-]{2,32}$/.test(sp.ref) ? sp.ref : null;
  const plan = sp.plan && /^[a-z]{2,16}$/.test(sp.plan) ? sp.plan : null;
  const asked = safe(sp.next) ?? (plan && plan !== "free" ? `/you/billing?plan=${plan}` : null);
  // Retreat / coaching arrivals land in their application; everyone else goes through the 4-screen onboarding first.
  const next = asked && isApplicationPath(asked) ? asked : `/onboarding${asked ? `?next=${encodeURIComponent(asked)}` : ""}`;
  if (!MOCK && (await getUser()).user) redirect(asked ?? "/today");
  if (!MOCK && ref) await logReferralVisit(await createClient(), ref).catch(() => undefined);
  const [google, who] = await Promise.all([googleEnabled(), inviter(ref)]);
  const application = asked ? isApplicationPath(asked) : false;
  const q = asked ? `?next=${encodeURIComponent(asked)}` : "";
  return (
    <AuthSplit
      photo={photo("coaching")}
      quote="Train with me — one honest day at a time."
      footer={<>Already a member? <Link href={`/signin${q}`}>Sign in</Link></>}
    >
      <div className="au-head">
        <h1>{application ? "First, your account" : "Start free with Mike"}</h1>
        <p>{application ? "Then you're straight into your application. Takes 20 seconds." : "Free series and tools today. Upgrade any time."}</p>
      </div>
      {ref && (
        <div className="au-invite" role="note">
          <Icon name="gift" size="sm" />
          <span>{who ? <><b>{who}</b> invited you</> : "You were invited"} — your first month is on us.</span>
        </div>
      )}
      <SignUp next={next} google={google} refCode={ref} />
      <div className="au-trust">
        <span><Icon name="check" size="xs" /> No card needed</span>
        <span><Icon name="lock" size="xs" /> Private to you</span>
      </div>
    </AuthSplit>
  );
}
