import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import { googleEnabled } from "@/lib/auth/providers";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { SignIn } from "@/components/auth/AuthForms";
import { Icon } from "@/components/ui";
import { surfacePhoto } from "@/lib/photos";
import "@/components/ui/form/form.css";

export const metadata: Metadata = { title: "Sign in" };

const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/today");

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const n = safe(next);
  if (!MOCK && (await getUser()).user) redirect(n);
  const google = await googleEnabled();
  const q = n !== "/today" ? `?next=${encodeURIComponent(n)}` : "";
  return (
    <AuthSplit
      photo={surfacePhoto("authHero")}
      quote="Strong, mobile and calm — one day at a time."
      footer={<>New here? <Link href={`/signup${q}`}>Create a free account</Link></>}
    >
      <div className="au-head">
        <h1>Welcome back</h1>
        <p>We&apos;ll email you a one-tap link. No password needed.</p>
      </div>
      {error === "link" && <p className="au-msg" role="alert" data-tone="error"><Icon name="info" size="xs" /> That link has expired. Send yourself a new one.</p>}
      <SignIn next={n} google={google} />
    </AuthSplit>
  );
}
