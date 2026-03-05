import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 1) Разрешаем логин и api/login
  if (pathname === "/login" || pathname.startsWith("/api/login")) {
    return NextResponse.next();
  }

  // 2) Разрешаем статику
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  const cookieName = process.env.ESL_LOGIN_COOKIE || "esl_auth";
  const expected = process.env.ESL_LOGIN_TOKEN || "";

  const got = req.cookies.get(cookieName)?.value || "";

  // если env пустые — всегда закрываем (чтобы не было "дырки")
  const ok = expected.length > 0 && got === expected;

  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ВАЖНО: матчим всё, кроме статики
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};