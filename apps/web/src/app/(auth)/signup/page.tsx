import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MOCK } from "@/lib/mock";
import { createClient, getUser } from "@/lib/supabase/server";
import { logReferralVisit } from "@ms/api";
import { AuthShell } from "@/components/discover/public/AuthShell";
import { SignUpForm } from "@/components/discover/public/AuthForms";
import { PHOTOS } from "@/components/discover/public/photos";

export const metadata: Metadata = { title: "Create your account" };

const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/today");

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; ref?: string; plan?: string }> }) {
  const sp = await searchParams;
  const ref = sp.ref && /^[A-Za-z0-9_-]{2,32}$/.test(sp.ref) ? sp.ref : null;
  const plan = sp.plan && /^[a-z]{2,16}$/.test(sp.plan) ? sp.plan : null;
  const next = safe(sp.next ?? (plan && plan !== "free" ? `/you/billing?plan=${plan}` : undefined));
  if (!MOCK && (await getUser()).user) redirect(next);
  // Count the referral link visit (anonymous; the server function de-duplicates and ignores unknown codes).
  if (!MOCK && ref) await logReferralVisit(await createClient(), ref).catch(() => undefined);
  return (
    <AuthShell
      photo={PHOTOS.coaching}
      mode="signup"
      next={next}
      title="Create your account"
      lede="Free tools and starter series today. Upgrade any time."
      footer={<>Already a member? <Link href={`/signin${next !== "/today" ? `?next=${encodeURIComponent(next)}` : ""}`}>Sign in</Link></>}
    >
      <SignUpForm next={next} refCode={ref} plan={plan} />
    </AuthShell>
  );
}
