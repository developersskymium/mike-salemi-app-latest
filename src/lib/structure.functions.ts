import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getStructure = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("program_structure")
      .select("key, data, updated_at")
      .eq("key", "program")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const saveStructure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { data: unknown }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("program_structure").upsert(
      {
        key: "program",
        data: data.data as never,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
