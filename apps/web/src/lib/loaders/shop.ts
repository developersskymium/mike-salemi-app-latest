import "server-only";
import { myOrders, type DB, type Order } from "@ms/api";
import { fixture, MOCK } from "@/lib/mock";
import { stripeConfigured } from "@/lib/stripe";
import { getUser } from "@/lib/supabase/server";

export interface ShopVariant {
  id: string;
  key: string;
  label: string;
  price_cents: number;
  currency: string;
}

export interface ShopProduct {
  id: string;
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

type Row = Omit<ShopProduct, "variants" | "unlocked" | "bullets" | "inquiry"> & {
  bullets: unknown;
  inquiry: unknown;
  shop_variants: (ShopVariant & { position: number; is_active: boolean })[];
};

/** Shop catalog (shop_products + shop_variants), access to included downloads, shop order history. */
export async function loadShop(): Promise<ShopData> {
  if (MOCK) return fixture<ShopData>("shop");
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
      .select("id, slug, name, type, tagline, description, bullets, image, note, inquiry, file_url, program_id, position, shop_variants(id, key, label, price_cents, currency, position, is_active)")
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
    products: products.map(({ shop_variants, ...p }) => ({
      ...p,
      bullets: Array.isArray(p.bullets) ? (p.bullets as string[]) : [],
      inquiry: (p.inquiry as ShopProduct["inquiry"]) ?? null,
      variants: [...(shop_variants ?? [])].filter((v) => v.is_active).sort((a, b) => a.position - b.position).map(({ position: _p, is_active: _a, ...v }) => v),
      unlocked: !!p.file_url && (!p.program_id || !!access.get(p.program_id)),
    })),
    orders: orders.filter((o) => o.items.some((i) => i.kind === "product")),
  };
}
