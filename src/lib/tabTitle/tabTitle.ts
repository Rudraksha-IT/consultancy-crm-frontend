import { NAV_ENTRIES } from "@/constants/navigation";
import type { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { OTHER_PAGE_NAMES, TAB_TITLE } from "@/constants/tabTitle";

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
 * The browser tab's title on an office's address (first live fixes, ticket 08): on Home
 * "<office> - <product>" (the product's saved name, ticket 15); elsewhere "<page> | <office>". A record's page is named by its
 * section ("Students"), never by the Student or person, so no name is kept in browser history.
 * Before anyone logs in (the login pages) there is no Role.
 */
export function tabTitle(path: string, office: string, role: Role | null, product: string): string {
  const found = pageNames(role)
    .filter(([start]) => startsAt(path, start))
    .sort(([a], [b]) => b.length - a.length)[0];
  return found === undefined ? TAB_TITLE.home(office, product) : TAB_TITLE.page(found[1], office);
}
