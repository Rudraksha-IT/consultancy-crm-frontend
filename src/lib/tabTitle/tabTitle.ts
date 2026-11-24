import { NAV_ENTRIES } from "@/constants/navigation";
import type { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { OTHER_PAGE_NAMES, PLATFORM_PAGE_NAMES, TAB_TITLE } from "@/constants/tabTitle";

/** Every page name by where it starts: the sidebar's (as this Role sees it), then the others. */
function pageNames(role: Role | null): [string, string][] {
  const sidebar = NAV_ENTRIES.filter((entry) => entry.href !== ROUTES.home).map(
    (entry): [string, string] => [
      entry.href,
      (role === null ? undefined : entry.labelFor?.[role]) ?? entry.label,
    ],
  );
  return [...sidebar, ...Object.entries(OTHER_PAGE_NAMES)];
}

function startsAt(path: string, start: string): boolean {
  return path === start || path.startsWith(`${start}/`);
}

/**
 * The browser tab's title on an office's address (first live fixes, ticket 08): "<page> |
 * <office>", Home too (list tidy-ups 07); the office alone on a page it doesn't know. A record's page is named by its
 * section ("Students"), never by the Student or person, so no name is kept in browser history.
 * Before anyone logs in (the login pages) there is no Role.
 */
export function tabTitle(path: string, office: string, role: Role | null): string {
  if (path === ROUTES.home) return TAB_TITLE.page(TAB_TITLE.homeName, office);
  const found = pageNames(role)
    .filter(([start]) => startsAt(path, start))
    .sort(([a], [b]) => b.length - a.length)[0];
  return found === undefined ? office : TAB_TITLE.page(found[1], office);
}

/**
 * The browser tab's title on the Platform (list tidy-ups 08): "<page> | <product name>", e.g.
 * "Consultancies | Rudraksha CRM"; the product's name alone on a page it doesn't know.
 */
export function platformTabTitle(path: string, product: string): string {
  const found = Object.entries(PLATFORM_PAGE_NAMES)
    .filter(([start]) => startsAt(path, start))
    .sort(([a], [b]) => b.length - a.length)[0];
  if (found === undefined) return product;
  const isKnown = found[0] !== ROUTES.platformHome || isConsultancyPage(path);
  return isKnown ? TAB_TITLE.page(found[1], product) : product;
}

/** The Consultancies tab: the Platform's home and the pages under /platform/consultancies. */
function isConsultancyPage(path: string): boolean {
  return path === ROUTES.platformHome || startsAt(path, `${ROUTES.platformHome}/consultancies`);
}
