import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/shop/ProductView";
import { loadShop } from "@/lib/loaders/shop";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await loadShop();
  return { title: d.products.find((p) => p.slug === slug)?.name ?? "Shop" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, d] = await Promise.all([params, loadShop()]);
  const p = d.products.find((x) => x.slug === slug);
  if (!p || (!d.enabled && !d.isAdmin)) notFound();
  return <ProductView p={p} d={d} />;
}
