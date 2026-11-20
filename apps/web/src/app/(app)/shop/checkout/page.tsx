import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Checkout } from "@/components/shop/Checkout";
import { loadShop } from "@/lib/loaders/shop";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Checkout" };

export default async function Page() {
  const [d, { user }] = await Promise.all([loadShop(), getUser()]);
  if (!d.enabled && !d.isAdmin) notFound();
  const meta = (user?.user_metadata ?? {}) as { full_name?: string };
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
  return <Checkout d={{ ...d, payments: d.payments && !!pk }} email={user?.email ?? ""} name={meta.full_name ?? ""} publishableKey={pk} />;
}
