import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge guard for protected routes (PRD §11/§13). The client-side session is
 * mirrored into a non-sensitive cookie (`role.expiresAt`, no token), so an
 * unauthenticated request is redirected before any protected UI renders.
 * Client-side guards still validate the full session (defence in depth).
 */
const SESSION_COOKIE = "ss_session";
const PROTECTED = ["/checkout", "/account", "/admin"];
/** Open to guests (PRD §4.3: guest cart and session wishlist), but not to admins. */
const GUEST_SHOPPING = ["/cart", "/wishlist"];

const under = (pathname: string, prefixes: string[]) => prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const [role, exp] = raw ? decodeURIComponent(raw).split(".") : [];
  const valid = !!role && Number(exp) > Date.now();

  if (under(pathname, GUEST_SHOPPING)) {
    if (valid && role === "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  if (!under(pathname, PROTECTED)) return NextResponse.next();

  if (!valid) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}${raw ? "&reason=expired" : ""}`;
    return NextResponse.redirect(url);
  }
  if (under(pathname, ["/checkout", "/account"]) && role === "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/forbidden";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/cart/:path*", "/wishlist/:path*", "/checkout/:path*", "/account/:path*", "/admin/:path*"],
};
