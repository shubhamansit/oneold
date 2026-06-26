import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessRoute,
  DAYWISE_DISTANCE_ROUTE,
  getLoginRedirectForEmail,
} from "@/lib/authUsers";

function getEmailFromToken(token?: string) {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const jsonPayload = atob(normalizedPayload);
    const parsed = JSON.parse(jsonPayload);

    return typeof parsed.email === "string" ? parsed.email.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get("isAuthenticated");
  const pathname = request.nextUrl.pathname;

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const email = getEmailFromToken(isAuthenticated.value);
  if (!canAccessRoute(email, pathname)) {
    const redirectPath = email ? getLoginRedirectForEmail(email) : "/";

    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/jobsummary/:path*",
    "/jobdetailssummary/:path*",
    "/worksummary/:path*",
    "/swippersummary/:path*",
    "/summary/:path*",
    "/daywisedistance/:path*",
    "/jobdetails/:path*",
  ],
};
