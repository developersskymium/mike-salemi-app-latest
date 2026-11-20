import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static files, images and the media folders.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|media/|kbl/|fonts/|img/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|pdf|woff2?)$).*)"],
};
