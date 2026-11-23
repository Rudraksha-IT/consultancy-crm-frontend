import "server-only";

import { z } from "zod";

import { HTTP_STATUS } from "@/constants/api";
import { BACKEND_HEADERS, RELAYED_RESPONSE_HEADERS } from "@/constants/backend";
import { LOGO_FILE_TYPES } from "@/constants/logo";
import { TAB_ICON } from "@/constants/tabIcon";
import { APP_LOGO_URL } from "@/lib/brand/appLogo";
import { getServerConfig } from "@/lib/config";

const ALLOWED_TYPES: readonly string[] = LOGO_FILE_TYPES;
const BrandSchema = z.object({
  logo: z.object({ url: z.string().regex(TAB_ICON.logoUrlPattern) }).nullable(),
});

/**
 * `GET /tab-icon` on every address (first live fixes, ticket 05): sends the tab to the product
 * logo's current version, or to the app's own logo (ticket 07) when none is in use or Django
 * can't say.
 */
export async function answerTabIcon(request: Request): Promise<Response> {
  const answer = await askPlatform(request, TAB_ICON.brandBackendPath);
  const version = answer === null ? null : await logoVersion(answer);
  if (version === null) return appLogo();
  return sendTo(TAB_ICON.versionPath(version));
}

/**
 * `GET /tab-icon/<version>`: that version of the product logo, only as one of the image types an
 * upload may be, kept for a year. An old version or a failure shows the app's own logo.
 */
export async function answerTabIconVersion(request: Request, version: string): Promise<Response> {
  if (!TAB_ICON.versionPattern.test(version)) return appLogo();
  const answer = await askPlatform(request, TAB_ICON.logoBackendPath(version));
  const logo = answer === null ? null : await readLogo(answer);
  if (logo === null) return appLogo();
  return new Response(logo.bytes, {
    headers: {
      ...RELAYED_RESPONSE_HEADERS,
      "content-type": logo.type,
      "cache-control": TAB_ICON.versionCache,
    },
  });
}

/** Django's answer on the Platform's address, or null when it fails or takes over 3 seconds. */
async function askPlatform(request: Request, path: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, TAB_ICON.timeoutMs);
  try {
    const config = getServerConfig();
    const answer = await fetch(`${config.backendOrigin}${path}`, {
      headers: {
        [BACKEND_HEADERS.forwardedHost]: `${config.platformSubdomain}.${config.productDomain}`,
        [BACKEND_HEADERS.forwardedProto]: new URL(request.url).protocol.replace(":", ""),
        [BACKEND_HEADERS.internalToken]: config.internalApiToken,
        [BACKEND_HEADERS.correlationId]: crypto.randomUUID(),
      },
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    return answer.status === HTTP_STATUS.ok ? answer : null;
  } catch {
    // silent: the app's own logo shows instead, and the next page asks again
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function logoVersion(answer: Response): Promise<string | null> {
  try {
    const brand = BrandSchema.parse(await answer.json());
    return brand.logo?.url.match(TAB_ICON.logoUrlPattern)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function readLogo(answer: Response): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  const type = imageType(answer);
  if (type === null) return null;
  try {
    const bytes = await answer.arrayBuffer();
    return bytes.byteLength <= TAB_ICON.maxBytes ? { bytes, type } : null;
  } catch {
    return null;
  }
}

/** The answer's type without its parameters, if it is one a logo upload may be. */
function imageType(answer: Response): string | null {
  const [type = ""] = (answer.headers.get("content-type") ?? "").split(";");
  const trimmed = type.trim();
  return ALLOWED_TYPES.includes(trimmed) ? trimmed : null;
}

/** The app's own logo, at the address the build gives it (ticket 07). */
function appLogo(): Response {
  return sendTo(APP_LOGO_URL);
}

/** Send the tab elsewhere; asked again within 5 minutes, so a change shows soon. */
function sendTo(location: string): Response {
  return new Response(null, {
    status: HTTP_STATUS.temporaryRedirect,
    headers: { location, "cache-control": TAB_ICON.lookupCache },
  });
}

/** Only GET is answered; anything else is 405. */
export function onlyGet(): Response {
  return Response.json(
    { detail: "Method not allowed." },
    {
      status: HTTP_STATUS.methodNotAllowed,
      headers: { "cache-control": "no-store", allow: "GET" },
    },
  );
}
