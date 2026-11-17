import "server-only";

import { CLIENT_ADDRESS_HEADER } from "@/constants/backend";
import type { ClientAddressSource } from "@/lib/config";
import { isIpAddress } from "@/lib/ip-address";

/**
 * The address the browser called from, as Cloudflare sets it in `CF-Connecting-IP` (ADR 0004), if
 * it is a valid IPv4 or IPv6 address; otherwise null. Never logged and never stored.
 */
export function readClientAddress(headers: Headers): string | null {
  const value = headers.get(CLIENT_ADDRESS_HEADER)?.trim() ?? "";
  return isIpAddress(value) ? value : null;
}

/**
 * The address this server tells Django the call came from (`X-Client-IP`, ADR 0004): Cloudflare's,
 * or locally (no Cloudflare) the configured `DEV_CLIENT_IP`. Never anything the browser chose.
 */
export function clientAddressFor(headers: Headers, source: ClientAddressSource): string | null {
  return source.source === "local" ? source.address : readClientAddress(headers);
}
