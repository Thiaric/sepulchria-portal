import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasEnvVars } from "../utils";

const PUBLIC_ROUTES = [
  "/",
  "/homepage",
  "/codex",
  "/rules",
  "/terms",
  "/privacy",
  "/community-rules",
  "/safety",
  "/age-policy",
  "/cookies",
  "/auth",
  "/api/auth",
  "/api/registration-applications",
  "/api/registration-invitations",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline.html",
  "/icons/pwa",
];

const SANCTION_ACCESS_ROUTES = [
  "/sanctions",
  "/support",
  "/terms",
  "/privacy",
  "/community-rules",
  "/safety",
  "/age-policy",
  "/cookies",
  "/auth",
  "/api/sanctions",
  "/api/support",
];

function isSanctionAccessRoute(
  pathname: string,
) {
  return SANCTION_ACCESS_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(
        `${route}/`,
      ),
  );
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }

    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";

    return NextResponse.redirect(url);
  }

  if (
    user &&
    !isSanctionAccessRoute(
      pathname,
    )
  ) {
    const {
      data: enforcement,
      error: enforcementError,
    } = await supabase.rpc(
      "get_current_sanction_enforcement",
      {
        p_capability: "portal",
      },
    );

    if (!enforcementError) {
      const row =
        Array.isArray(
          enforcement,
        )
          ? enforcement[0] ?? null
          : enforcement;

      if (
        row?.blocked === true
      ) {
        const url =
          request.nextUrl.clone();

        url.pathname =
          "/sanctions";

        url.searchParams.set(
          "restricted",
          "1",
        );

        return NextResponse.redirect(
          url,
        );
      }
    }
  }

  return supabaseResponse;
}
