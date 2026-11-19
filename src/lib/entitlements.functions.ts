import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ */
/* Entitlements — what the signed-in person has unlocked                */
/* ------------------------------------------------------------------ */

export const getEntitlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("entitlements")
      .select("id, product_id, kind, status, metadata, granted_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const grantEntitlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      productId: string;
      kind: "course" | "retreat" | "program" | "product";
      metadata?: Record<string, unknown>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("entitlements").upsert(
      {
        user_id: context.userId,
        product_id: data.productId,
        kind: data.kind,
        status: "active",
        metadata: (data.metadata ?? {}) as never,
      },
      { onConflict: "user_id,product_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeEntitlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("entitlements")
      .delete()
      .eq("user_id", context.userId)
      .eq("product_id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Retreat checklist                                                    */
/* ------------------------------------------------------------------ */

export const getRetreatChecklist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("retreat_checklist")
      .select("retreat_id, item_id, done")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setRetreatChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retreatId: string; itemId: string; done: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("retreat_checklist").upsert(
      {
        user_id: context.userId,
        retreat_id: data.retreatId,
        item_id: data.itemId,
        done: data.done,
      },
      { onConflict: "user_id,retreat_id,item_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Shop orders                                                          */
/* ------------------------------------------------------------------ */

export const getOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shop_orders")
      .select("id, product_id, variant, price_cents, status, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string; variant?: string; priceCents: number }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("shop_orders").insert({
      user_id: context.userId,
      product_id: data.productId,
      variant: data.variant ?? null,
      price_cents: data.priceCents,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
