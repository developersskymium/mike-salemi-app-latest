import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Mock checkout. No real payment provider is connected yet — this records the
 * order against the signed-in person and unlocks whatever they bought so the
 * whole purchase journey can be walked end to end.
 */
export const payAndUnlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      productId: string;
      kind: "course" | "retreat" | "program" | "product" | "coaching";
      name: string;
      variant?: string;
      priceCents: number;
      metadata?: Record<string, unknown>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const reference = `KBL-${Date.now().toString(36).toUpperCase()}`;

    const { error: orderError } = await context.supabase.from("shop_orders").insert({
      user_id: context.userId,
      product_id: data.productId,
      variant: data.variant ?? data.name,
      price_cents: data.priceCents,
      status: "paid",
    });
    if (orderError) throw new Error(orderError.message);

    // Anything that isn't a physical/digital shop item unlocks access.
    if (data.kind !== "product") {
      const { error } = await context.supabase.from("entitlements").upsert(
        {
          user_id: context.userId,
          product_id: data.productId,
          kind: data.kind === "coaching" ? "program" : data.kind,
          status: "active",
          metadata: { ...(data.metadata ?? {}), reference, price_cents: data.priceCents } as never,
        },
        { onConflict: "user_id,product_id" },
      );
      if (error) throw new Error(error.message);
    }

    return { ok: true, reference };
  });
