import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/discover/public/AuthShell";
import { ResetForm } from "@/components/discover/public/AuthForms";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import photo from "@/components/discover/img/getup.jpg";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const { user } = await getUser();
  // A recovery link signs the member in; then they choose a new password here. (Preview mode is always "signed in".)
  const signedIn = Boolean(user) && (!MOCK || mode === "update");
  return (
    <AuthShell
      photo={photo}
      alt="Mike in a Turkish get-up"
      title={signedIn ? "Choose a new password" : "Reset your password"}
      lede={signedIn ? undefined : "We'll email you a link to set a new one."}
      footer={<Link href="/signin" className="dsc-link">Back to sign in</Link>}
    >
      <ResetForm signedIn={signedIn} />
    </AuthShell>
  );
}
