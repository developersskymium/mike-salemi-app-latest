import type { DB, Tables } from "./client";

export type Tool = Tables<"tools">;
export type ToolResult = Tables<"tool_results">;

/** Published tools (Kettlebell Selector, Stretch Test, Readiness Check, Kettlebell Roadmap), in order. */
export async function listTools(sb: DB): Promise<Tool[]> {
  const { data, error } = await sb.from("tools").select("*").eq("status", "published").order("position");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getTool(sb: DB, toolId: string): Promise<Tool | null> {
  const { data, error } = await sb.from("tools").select("*").eq("id", toolId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Stores the member's own result (RLS allows inserting only rows for yourself). */
export async function saveToolResult(
  sb: DB,
  userId: string,
  toolId: string,
  answers: Record<string, unknown>,
  result: Record<string, unknown>,
): Promise<ToolResult> {
  const { data, error } = await sb
    .from("tool_results")
    .insert({ user_id: userId, tool_id: toolId, answers: answers as never, result: result as never })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** The member's results, newest first; filter by tool when given. */
export async function myToolResults(sb: DB, userId: string, toolId?: string, limit = 50): Promise<ToolResult[]> {
  let q = sb.from("tool_results").select("*").eq("user_id", userId);
  if (toolId) q = q.eq("tool_id", toolId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
