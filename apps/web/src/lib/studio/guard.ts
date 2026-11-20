import "server-only";
import { requireAdmin } from "@/lib/supabase/admin";
import { MOCK, MOCK_USER } from "@/lib/mock";

/** Admin guard for every studio page and action. In local mock preview it returns a fake admin instead of blocking. */
export async function studioAdmin(): Promise<{ id: string; email: string }> {
  if (MOCK) return { id: MOCK_USER.id, email: MOCK_USER.email };
  const { user } = await requireAdmin();
  return { id: user.id, email: user.email ?? "" };
}
