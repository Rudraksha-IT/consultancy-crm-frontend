import "server-only";

import { HTTP_STATUS } from "@/constants/api";
import { BACKEND_HEADERS } from "@/constants/backend";
import { getServerConfig } from "@/lib/config";

/**
 * One of Django's public answers on the Platform's address (the product's logo and name), or
 * null when it fails or takes longer than `timeoutMs`. Asked by this server, never the browser.
 */
export async function askPlatform(
  path: string,
  protocol: string,
  timeoutMs: number,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    const config = getServerConfig();
    const answer = await fetch(`${config.backendOrigin}${path}`, {
      headers: {
        [BACKEND_HEADERS.forwardedHost]: `${config.platformSubdomain}.${config.productDomain}`,
        [BACKEND_HEADERS.forwardedProto]: protocol,
        [BACKEND_HEADERS.internalToken]: config.internalApiToken,
        [BACKEND_HEADERS.correlationId]: crypto.randomUUID(),
      },
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    return answer.status === HTTP_STATUS.ok ? answer : null;
  } catch {
    // silent: the caller shows its default instead, and the next page asks again
    return null;
  } finally {
    clearTimeout(timer);
  }
}
