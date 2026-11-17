import "server-only";

import { isIP } from "node:net";

/**
 * Whether `value` is exactly one IPv4 or IPv6 address, with nothing around it: no port, no list,
 * no range and no IPv6 zone (`%eth0`), which never comes from Cloudflare.
 */
export function isIpAddress(value: string): boolean {
  return isIP(value) !== 0 && !value.includes("%");
}
