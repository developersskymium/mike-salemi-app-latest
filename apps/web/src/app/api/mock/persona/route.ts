import { type NextRequest, NextResponse } from "next/server";
import { MOCK } from "@/lib/mock";

/** Local preview only (MOCK_DATA=1): /api/mock/persona?as=free|pro|max|owner|collector|admin&next=/programs */
export async function GET(request: NextRequest) {
  if (!MOCK) return new NextResponse("Not found", { status: 404 });
  const as = (request.nextUrl.searchParams.get("as") ?? "pro").replace(/[^a-z]/g, "").slice(0, 20);
  const next = request.nextUrl.searchParams.get("next") ?? "/programs";
  const res = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/programs", request.nextUrl.origin));
  res.cookies.set("ms_persona", as, { path: "/", sameSite: "lax" });
  return res;
}
