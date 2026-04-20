import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/src/i18n/routing";
import { createMiddlewareClient } from "@/src/utils/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

function pathnameWithoutLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (
    first &&
    routing.locales.includes(first as (typeof routing.locales)[number])
  ) {
    return segments.length === 1 ? "/" : `/${segments.slice(1).join("/")}`;
  }
  return pathname;
}

function localeFromPathname(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0];
  if (
    first &&
    routing.locales.includes(first as (typeof routing.locales)[number])
  ) {
    return first;
  }
  return routing.defaultLocale;
}

export async function proxy(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const { supabase, response } = createMiddlewareClient(request, intlResponse);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const barePath = pathnameWithoutLocale(pathname);
  const locale = localeFromPathname(pathname);

  const isPublic =
    barePath === "/login" || barePath.startsWith("/login/");

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl, { 
      headers: response.headers 
    });
  }

  if (user && barePath === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = `/${locale}`;
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl, { 
      headers: response.headers 
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
