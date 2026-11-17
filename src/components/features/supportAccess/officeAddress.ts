import { ROUTES } from "@/constants/routes";

/** The parts of the page's own address that the office's address keeps. */
type Here = Pick<Location, "protocol" | "port">;

/** Where the browser goes to enter an office: its own address, on the page's scheme and port. */
export function entryUrl(host: string, entryCode: string, here: Here = window.location): string {
  return `${here.protocol}//${withPort(host, here)}${ROUTES.supportEnter}#${entryCode}`;
}

/** The Platform's own page, from inside an office: where "Leave this office" goes. */
export function platformUrl(platformHost: string, here: Here = window.location): string {
  return `${here.protocol}//${withPort(platformHost, here)}${ROUTES.platformHome}`;
}

/** The host with this page's port, when it has one (locally, e.g. ":8080"). */
function withPort(host: string, here: Here): string {
  return here.port === "" || host.includes(":") ? host : `${host}:${here.port}`;
}
