import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";
import { AuthShell } from "@/components/discover/public/AuthShell";
import { SignInForm } from "@/components/discover/public/AuthForms";
import photo from "@/components/discover/img/press.jpg";

export const metadata: Metadata = { title: "Sign in" };

const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/today");

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const n = safe(next);
  if (!MOCK && (await getUser()).user) redirect(n);
  return (
    <AuthShell
      photo={photo}
      alt="Mike pressing a kettlebell overhead"
      title="Welcome back"
      lede="Pick up where you left off."
      footer={<>New here? <Link href={`/signup${n !== "/today" ? `?next=${encodeURIComponent(n)}` : ""}`} className="dsc-link">Create an account</Link></>}
    >
      <SignInForm next={n} />
    </AuthShell>
  );
}
