import { ROUTES } from "@/constants/routes";

export type CentralLoginHosts = { productDomain: string; centralLoginSubdomain: string };

/**
 * What a page request should become (issue 44):
 * - `show`: the Central login's address shows its screen, whatever the path;
 * - `toLogin`: an office's address has no Central login screen, so it goes to its own login;
 * - `pass`: anything else is served as usual.
 */
export type CentralLoginRouting = "show" | "toLogin" | "pass";

export function routeForCentralLogin(
  host: string | null,
  pathname: string,
  hosts: CentralLoginHosts,
): CentralLoginRouting {
  const isCentral = hostName(host) === `${hosts.centralLoginSubdomain}.${hosts.productDomain}`;
  const isScreen = pathname === ROUTES.centralLogin;
  if (isCentral) return isScreen ? "pass" : "show";
  return isScreen ? "toLogin" : "pass";
}

export type PlatformHosts = { productDomain: string; platformSubdomain: string };

/**
 * The Platform's address (`<platformSubdomain>.<productDomain>`) serves only its own pages under
 * `/platform`; anything else there, such as `/`, goes to the Platform (`toPlatform`), which opens
 * its login when nobody is logged in. Office pages there would ask for an office that isn't one.
 */
export function routeForPlatformHost(
  host: string | null,
  pathname: string,
  hosts: PlatformHosts,
): "toPlatform" | "pass" {
  const isPlatform = hostName(host) === `${hosts.platformSubdomain}.${hosts.productDomain}`;
  const isPlatformPage =
    pathname === ROUTES.platformHome || pathname.startsWith(`${ROUTES.platformHome}/`);
  return isPlatform && !isPlatformPage ? "toPlatform" : "pass";
}

/** The host without its port, lowercased. */
function hostName(host: string | null): string {
  return (host ?? "").toLowerCase().replace(/:[0-9]{1,5}$/, "");
}
