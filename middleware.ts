import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  // Gate is opt-in. If APP_PASSPHRASE isn't set, do nothing.
  if (!process.env.APP_PASSPHRASE) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Always-allow paths: login page, auth API, static assets, Next internals.
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const ok = await verifySession(cookie);
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
