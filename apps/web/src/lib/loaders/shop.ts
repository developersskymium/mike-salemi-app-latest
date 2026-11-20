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
  /** Price for Pro/Max members (null = same as list). */
  member_price_cents: number | null;
  /** Kettlebell weight in kg (bells, pairs, bell bundles). */
  weight_kg: number | null;
}

export type ShopCategory = "bundles" | "equipment" | "plans" | "coaching" | "retreats" | "digital";
export type ShopNeed = "start" | "level-up" | "recover" | "wear";
export interface BundlePart { for?: string; slug: string; key: string; qty: number }
export interface MikePhoto { src: string; alt: string; focal?: string; caption?: string }

/** A shop order with its fulfilment (tracking) fields. */
export interface ShopOrder extends Order {
  shipping_cents?: number;
  fulfillment?: "processing" | "shipped" | "delivered" | null;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
}
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
  need: ShopNeed | null;
  /** "Used in" links into programs. */
  used_in: { label: string; href: string }[];
  /** Mike using it (product page). */
  mike_photo: MikePhoto | null;
  /** Bundle contents (bundles only). */
  bundle: BundlePart[];
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
  orders: ShopOrder[];
  /** Pro/Max member: member prices apply. */
  member: boolean;
  shipping: { free_cents: number; flat_cents: number };
  /** product id → rating summary. */
  ratings: Record<string, { average: number; count: number }>;
  /** Bought a kettlebell (unlocks "First 3 sessions with your new bell"). */
  ownsBell: boolean;
}

type Row = Omit<ShopProduct, "variants" | "unlocked" | "bullets" | "inquiry" | "category" | "gallery" | "need" | "used_in" | "mike_photo" | "bundle"> & {
  category: string | null;
  gallery: unknown;
  need: string | null;
  used_in: unknown;
  mike_photo: unknown;
  bundle: unknown;
  bullets: unknown;
  inquiry: unknown;
  shop_variants: (ShopVariant & { position: number; is_active: boolean })[];
};

const CATS: ShopCategory[] = ["bundles", "equipment", "plans", "coaching", "retreats", "digital"];

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
    // (mock: member pricing, ratings, tracking and the bell unlock come from the fixture)
  }
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Not signed in");
  const sb = supabase as unknown as DB;
  // shop_* tables are newer than the generated types
  const raw = sb as unknown as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: boolean) => { order: (c: string) => PromiseLike<{ data: unknown }> } } } };
  const rpc = sb.rpc.bind(sb) as unknown as (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  const [setting, admin, products, orders, member, ratings, ownsBell, tracking] = await Promise.all([
    sb.from("site_settings").select("value").eq("key", "shop").maybeSingle().then((r) => (r.data?.value ?? {}) as { enabled?: boolean; free_shipping_cents?: number; shipping_cents?: number }),
    sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then((r) => !!r.data),
    raw
      .from("shop_products")
      .select("id, slug, name, type, category, gallery, tagline, description, bullets, image, note, inquiry, file_url, program_id, position, need, used_in, mike_photo, bundle, shop_variants(id, key, label, price_cents, member_price_cents, weight_kg, currency, position, is_active)")
      // Admins can read unpublished rows (admin_all); the shop shows only published products.
      .eq("is_active", true)
      .order("position")
      .then((r: { data: unknown }) => (r.data ?? []) as Row[]),
    myOrders(sb).catch(() => [] as Order[]),
    rpc("shop_is_member").then((r) => r.data === true, () => false),
    rpc("shop_ratings").then((r) => (r.data ?? []) as { product_id: string; average: number; count: number }[], () => []),
    rpc("owns_shop_kettlebell").then((r) => r.data === true, () => false),
    loadTracking(sb),
  ]);
  const programs = [...new Set(products.map((p) => p.program_id).filter(Boolean) as string[])];
  const access = new Map(
    await Promise.all(programs.map(async (id) => [id, !!(await sb.rpc("can_access", { p_program: id })).data] as const)),
  );
  return {
    enabled: !!setting.enabled,
    isAdmin: admin,
    payments: stripeConfigured(),
    member,
    shipping: { free_cents: setting.free_shipping_cents ?? 0, flat_cents: setting.shipping_cents ?? 0 },
    ratings: Object.fromEntries(ratings.map((r) => [r.product_id, { average: Number(r.average), count: r.count }])),
    ownsBell,
    products: products.map(({ shop_variants, ...p }) => withPhotos({
      ...p,
      category: categoryOf(p),
      need: (["start", "level-up", "recover", "wear"] as string[]).includes(p.need ?? "") ? (p.need as ShopNeed) : null,
      used_in: Array.isArray(p.used_in) ? (p.used_in as ShopProduct["used_in"]) : [],
      mike_photo: (p.mike_photo as MikePhoto | null) ?? null,
      bundle: Array.isArray(p.bundle) ? (p.bundle as BundlePart[]) : [],
      gallery: galleryOf(p.gallery),
      bullets: Array.isArray(p.bullets) ? (p.bullets as string[]) : [],
      inquiry: (p.inquiry as ShopProduct["inquiry"]) ?? null,
      variants: [...(shop_variants ?? [])].filter((v) => v.is_active).sort((a, b) => a.position - b.position).map(({ position: _p, is_active: _a, ...v }) => ({ ...v, weight_kg: v.weight_kg == null ? null : Number(v.weight_kg) })),
      unlocked: !!p.file_url && (!p.program_id || !!access.get(p.program_id)),
    })),
    orders: orders.filter((o) => o.items.some((i) => i.kind === "product")).map((o) => ({ ...o, ...tracking.get(o.id) })),
  };
}

type Tracking = Pick<ShopOrder, "shipping_cents" | "fulfillment" | "tracking_carrier" | "tracking_number" | "tracking_url" | "shipped_at" | "delivered_at">;

/** Fulfilment fields for the member's orders (0029 columns; RLS lets members read their own orders). */
async function loadTracking(sb: DB): Promise<Map<string, Tracking>> {
  const raw = sb as unknown as { from: (t: string) => { select: (c: string) => PromiseLike<{ data: unknown }> } };
  try {
    const { data } = await raw.from("orders").select("id, shipping_cents, fulfillment, tracking_carrier, tracking_number, tracking_url, shipped_at, delivered_at");
    return new Map(((data ?? []) as (Tracking & { id: string })[]).map(({ id, ...t }) => [id, t]));
  } catch {
    return new Map();
  }
}

/** Shop orders + the member's own ratings, for the Orders section of You. */
export async function loadMyShopOrders(): Promise<{ orders: ShopOrder[]; products: ShopProduct[]; myRatings: Record<string, number>; ownsBell: boolean }> {
  if (MOCK) {
    const d = await fixture<ShopData & { myRatings?: Record<string, number> }>("shop");
    return { orders: d.orders, products: d.products, myRatings: d.myRatings ?? {}, ownsBell: d.ownsBell };
  }
  const d = await loadShop();
  const { supabase, user } = await getUser();
  const raw = supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => PromiseLike<{ data: unknown }> } } };
  const mine = user ? ((await raw.from("shop_reviews").select("product_id, rating").eq("user_id", user.id)).data ?? []) as { product_id: string; rating: number }[] : [];
  return { orders: d.orders, products: d.products, myRatings: Object.fromEntries(mine.map((r) => [r.product_id, r.rating])), ownsBell: d.ownsBell };
}

/** Kettlebell Selector config (the published tool) for the shop's built-in selector. */
export async function loadSelectorConfig(): Promise<Record<string, unknown> | null> {
  if (MOCK) return fixture<{ tool: { config: Record<string, unknown> } }>("discover-tool-kettlebell-selector").then((t) => t.tool.config, () => null);
  const { supabase } = await getUser();
  const sb = supabase as unknown as DB;
  const { data } = await sb.from("tools").select("config").eq("id", "kettlebell-selector").eq("status", "published").maybeSingle();
  return (data?.config as Record<string, unknown> | null) ?? null;
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
