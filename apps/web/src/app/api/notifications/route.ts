import { MOCK } from "@/lib/mock";
import { getUser } from "@/lib/supabase/server";

/**
 * The member's unseen push / in-app notifications (last 12 hours). Read by the service worker when a
 * push wakes it, and by the in-app reminder host. POST { ids, opened } marks them seen / opened.
 */
export async function GET() {
  if (MOCK) return Response.json({ items: [] });
  const { supabase, user } = await getUser();
  if (!user) return Response.json({ items: [] }, { status: 401 });
  const { data } = await supabase.rpc("pending_notifications" as never);
  const items = ((data ?? []) as { id: string; kind: string; channel: string; title: string; body: string | null; url: string | null; created_at: string }[]).map(
    (e) => ({ id: e.id, kind: e.kind, channel: e.channel, title: e.title, body: e.body, url: e.url ?? "/today", created_at: e.created_at }),
  );
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (MOCK) return Response.json({ ok: true });
  const { supabase, user } = await getUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { ids?: unknown; opened?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 20) : [];
  if (!ids.length) return Response.json({ ok: true, n: 0 });
  const { data, error } = await supabase.rpc("ack_notifications" as never, { p_ids: ids, p_opened: body.opened === true } as never);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });
  return Response.json({ ok: true, n: data });
}
