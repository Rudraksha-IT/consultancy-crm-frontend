import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/constants/routes";
import { routeForCentralLogin, routeForPlatformHost } from "@/lib/centralLogin";
import { getServerConfig } from "@/lib/config";

/** `path` on the host the browser used (Next.js builds `nextUrl` from the request's Host). */
function onThisHost(request: NextRequest, path: string): URL {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  return url;
}

/**
 * Runs before every page (not `/api` or Next.js's own files). The Central login's address
 * (`login.<product-domain>`, issue 44) shows its one screen at every path; an office's address
 * sends that screen's path to its own login page.
 */
export function proxy(request: NextRequest): NextResponse {
  let config;
  try {
    config = getServerConfig();
  } catch {
    // Startup already refuses a bad environment (src/instrumentation.ts).
    return NextResponse.next();
  }
  const host = request.headers.get("host");
  const routing = routeForCentralLogin(host, request.nextUrl.pathname, {
    productDomain: config.productDomain,
    centralLoginSubdomain: config.centralLoginSubdomain,
  });
  if (routing === "show") return NextResponse.rewrite(onThisHost(request, ROUTES.centralLogin));
  if (routing === "toLogin") return NextResponse.redirect(onThisHost(request, ROUTES.login));
  const platform = routeForPlatformHost(host, request.nextUrl.pathname, {
    productDomain: config.productDomain,
    platformSubdomain: config.platformSubdomain,
  });
  if (platform === "toPlatform") {
    return NextResponse.redirect(onThisHost(request, ROUTES.platformHome));
  }
  return NextResponse.next();
}

export const config = {
  // `/healthz` (ticket 14) answers the same on every host, for Docker's healthcheck.
  matcher: ["/((?!api/|_next/|favicon.ico|healthz$).*)"],
};
