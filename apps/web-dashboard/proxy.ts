import { NextRequest, NextResponse } from "next/server";

const sessionCookieName = "iot_management_session";
const protectedRoutes = [
  "/alerts",
  "/buildings",
  "/dashboard",
  "/meters",
  "/reports",
  "/settings",
  "/units",
];

export function proxy(request: NextRequest) {
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (request.nextUrl.pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/alerts/:path*",
    "/buildings/:path*",
    "/dashboard/:path*",
    "/login",
    "/meters/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/units/:path*",
  ],
};
