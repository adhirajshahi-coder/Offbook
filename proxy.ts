import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ATTR_COOKIE, ATTR_MAX_AGE, attributionFromSearch } from "@/lib/attribution";
import {
  isSupabaseConfigured,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/env";

// Signed-in areas. Proxy only does the optimistic "are you signed in" check
// and refreshes the session cookie; real authorization happens in each
// layout (lib/auth.ts) and in Postgres RLS.
const PROTECTED = ["/parent", "/play", "/hq"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const attribution = request.cookies.has(ATTR_COOKIE) ? null : attributionFromSearch(request.nextUrl.searchParams);
  // First touch only: never overwrite an existing attribution cookie.
  const withAttribution = (res: NextResponse) => {
    if (attribution) res.cookies.set(ATTR_COOKIE, JSON.stringify(attribution), { maxAge: ATTR_MAX_AGE, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return res;
  };

  if (!isSupabaseConfigured()) return withAttribution(response);

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!signedIn && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return withAttribution(NextResponse.redirect(url));
  }

  return withAttribution(response);
}

export const config = {
  matcher: [
    // Skip every /_next/ path: static files, images and the dev HMR socket
    // (running the session refresh on the socket breaks live reload).
    "/((?!_next/|icon.svg|brand/|icons/|runtimes/|workspaces/|sw.js|manifest.webmanifest|offline|api/health|api/razorpay|api/mux|api/cron|api/errors|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
