import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

/** Public routes anyone can open. Everything else needs a session. */
const PUBLIC_PREFIXES = ["/", "/signin", "/signup", "/auth", "/explore", "/pricing", "/verify", "/legal", "/join", "/api/stripe/webhook", "/api/revenuecat/webhook", "/api/internal", "/api/cron", "/sw.js"]; // /gallery and /graphics-preview are admin-only (Studio › Design)

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)));
}

/** Refreshes the Supabase session cookie on every request and gates member routes. */
export async function updateSession(request: NextRequest) {
  // Local preview mode (no network to Supabase in the build sandbox): skip auth entirely.
  if (process.env.NODE_ENV === "development" && process.env.MOCK_DATA === "1") return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (!signedIn && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return response;
}
