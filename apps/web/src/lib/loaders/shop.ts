import "server-only";
import { myOrders, type DB, type Order } from "@ms/api";
import { fixture, MOCK } from "@/lib/mock";
import { stripeConfigured } from "@/lib/stripe";
import { getUser } from "@/lib/supabase/server";
import { isUnfitCover } from "@/lib/covers";

export interface ShopVariant {
  id: string;
  key: string;
  label: string;
  price_cents: number;
  currency: string;
}

export type ShopCategory = "equipment" | "plans" | "coaching" | "retreats" | "digital";
export interface ShopImage {
  src: string;
  alt: string;
  /** contain = never crop (documents, product cut-outs). */
  fit?: "cover" | "contain";
  /** object-position focal point. */
  focal?: string;
}

export interface ShopProduct {
  id: string;
  category: ShopCategory;
  /** Extra images after the cover (shop_products.gallery). */
  gallery: ShopImage[];
  slug: string;
  name: string;
  type: "digital" | "physical";
  tagline: string | null;
  description: string | null;
  bullets: string[];
  image: string | null;
  note: string | null;
  inquiry: { label: string; href: string } | null;
  file_url: string | null;
  program_id: string | null;
  variants: ShopVariant[];
  /** Free download the member can open (has access to its program). */
  unlocked: boolean;
}

export interface ShopData {
  /** site_settings.shop.enabled — off: only admins see the shop (preview). */
  enabled: boolean;
  isAdmin: boolean;
  /** Stripe keys present. */
  payments: boolean;
  products: ShopProduct[];
  /** The member's orders that contain shop items. */
  orders: Order[];
}

type Row = Omit<ShopProduct, "variants" | "unlocked" | "bullets" | "inquiry" | "category" | "gallery"> & {
  category: string | null;
  gallery: unknown;
  bullets: unknown;
  inquiry: unknown;
  shop_variants: (ShopVariant & { position: number; is_active: boolean })[];
};

const CATS: ShopCategory[] = ["equipment", "plans", "coaching", "retreats", "digital"];

/** shop_products.category, or derived for rows without one. */
export function categoryOf(p: { category?: string | null; type: string; file_url: string | null; slug: string }): ShopCategory {
  if (p.category && (CATS as string[]).includes(p.category)) return p.category as ShopCategory;
  if (p.type === "physical") return "equipment";
  if (p.file_url) return "plans";
  if (p.slug.includes("coaching")) return "coaching";
  if (p.slug.includes("retreat")) return "retreats";
  return "digital";
}

const galleryOf = (g: unknown): ShopImage[] =>
  Array.isArray(g) ? (g as ShopImage[]).filter((x) => x && typeof x.src === "string").map((x) => ({ src: x.src, alt: x.alt ?? "", fit: x.fit === "contain" ? "contain" : "cover", focal: x.focal })) : [];

/** Photos of Mike for categories that sell time with him, when a product's own image is unfit. */
const MIKE_BY_CATEGORY: Partial<Record<ShopCategory, ShopImage[]>> = {
  coaching: [
    { src: "/media/summit/mike-coaching.jpg", alt: "Mike Salemi coaching a member through a kettlebell drill", fit: "cover", focal: "26% 20%" },
    { src: "/media/summit/working-in.jpg", alt: "Mike Salemi teaching a Working In session", fit: "cover", focal: "28% 30%" },
    { src: "/media/summit/mike-press.jpg", alt: "Mike Salemi pressing a kettlebell overhead", fit: "cover", focal: "60% 14%" },
  ],
  retreats: [{ src: "/media/summit/summit-group.jpg", alt: "Men of Movement on Mount Shasta", fit: "cover", focal: "50% 55%" }],
};

/**
 * Summit photo rule for the shop: no stock strangers, no lettering, no black-and-white. An unfit cover
 * or gallery image is dropped; coaching and retreat products fall back to real photos of Mike.
 */
function withPhotos<T extends { category: ShopCategory; image: string | null; gallery: ShopImage[] }>(p: T): T {
  const fit = (src: string | null | undefined) => Boolean(src) && (!src!.startsWith("/media/") || !isUnfitCover(src));
  const gallery = p.gallery.filter((g) => fit(g.src));
  const mike = MIKE_BY_CATEGORY[p.category] ?? [];
  const image = fit(p.image) ? p.image : gallery[0]?.src ?? mike[0]?.src ?? p.image;
  const extra = mike.filter((m) => m.src !== image && !gallery.some((g) => g.src === m.src));
  return { ...p, image, gallery: [...gallery, ...(gallery.length < 3 ? extra.slice(0, 3 - gallery.length) : [])] };
}

/** Shop catalog (shop_products + shop_variants), access to included downloads, shop order history. */
export async function loadShop(): Promise<ShopData> {
  if (MOCK) {
    const d = await fixture<ShopData>("shop");
    return { ...d, products: d.products.map((p) => withPhotos({ ...p, category: categoryOf(p), gallery: galleryOf(p.gallery) })) };
  }
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Not signed in");
  const sb = supabase as unknown as DB;
  // shop_* tables are newer than the generated types
  const raw = sb as unknown as { from: (t: string) => { select: (c: string) => { order: (c: string) => PromiseLike<{ data: unknown }> } } };
  const [setting, admin, products, orders] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "shop").maybeSingle().then((r) => (r.data?.value ?? {}) as { enabled?: boolean }),
    sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then((r) => !!r.data),
    raw
      .from("shop_products")
      .select("id, slug, name, type, category, gallery, tagline, description, bullets, image, note, inquiry, file_url, program_id, position, shop_variants(id, key, label, price_cents, currency, position, is_active)")
      .order("position")
      .then((r: { data: unknown }) => (r.data ?? []) as Row[]),
    myOrders(sb).catch(() => [] as Order[]),
  ]);
  const programs = [...new Set(products.map((p) => p.program_id).filter(Boolean) as string[])];
  const access = new Map(
    await Promise.all(programs.map(async (id) => [id, !!(await sb.rpc("can_access", { p_program: id })).data] as const)),
  );
  return {
    enabled: !!setting.enabled,
    isAdmin: admin,
    payments: stripeConfigured(),
    products: products.map(({ shop_variants, ...p }) => withPhotos({
      ...p,
      category: categoryOf(p),
      gallery: galleryOf(p.gallery),
      bullets: Array.isArray(p.bullets) ? (p.bullets as string[]) : [],
      inquiry: (p.inquiry as ShopProduct["inquiry"]) ?? null,
      variants: [...(shop_variants ?? [])].filter((v) => v.is_active).sort((a, b) => a.position - b.position).map(({ position: _p, is_active: _a, ...v }) => v),
      unlocked: !!p.file_url && (!p.program_id || !!access.get(p.program_id)),
    })),
    orders: orders.filter((o) => o.items.some((i) => i.kind === "product")),
  };
}

/** Whether the member can open the shop (switched on, or an admin previewing it). Cheap: two small reads. */
export async function loadShopAccess(): Promise<{ enabled: boolean; isAdmin: boolean }> {
  if (MOCK) {
    const d = await fixture<ShopData>("shop");
    return { enabled: d.enabled, isAdmin: d.isAdmin };
  }
  const { supabase, user } = await getUser();
  if (!user) return { enabled: false, isAdmin: false };
  const sb = supabase as unknown as DB;
  const [enabled, isAdmin] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "shop").maybeSingle().then((r) => !!(r.data?.value as { enabled?: boolean } | null)?.enabled, () => false),
    sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then((r) => !!r.data, () => false),
  ]);
  return { enabled, isAdmin };
}
