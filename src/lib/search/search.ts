import { ROUTES } from "@/constants/routes";

/** The parts of a key press the search's shortcut looks at. */
export type ShortcutKeys = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">;

/** Whether the key press is Ctrl K, ⌘ K or a plain "/" (issue 49). */
export function isSearchShortcut(keys: ShortcutKeys): boolean {
  const isCombo = (keys.ctrlKey || keys.metaKey) && keys.key.toLowerCase() === "k";
  return isCombo || isPlainSlash(keys);
}

function isPlainSlash(keys: ShortcutKeys): boolean {
  return keys.key === "/" && !(keys.ctrlKey || keys.metaKey || keys.altKey);
}

/**
 * Which result an arrow key moves to from `at` (-1 is the search box): down stops at the last,
 * up from the first goes back to the box (-1).
 */
export function nextResultIndex(count: number, at: number, key: "ArrowDown" | "ArrowUp"): number {
  return key === "ArrowDown" ? Math.min(count - 1, at + 1) : Math.max(-1, at - 1);
}

/** The Student list with this search, for "See all … Students" and Enter in the box. */
export function studentListHref(text: string): string {
  return `${ROUTES.students}?${new URLSearchParams({ q: text }).toString()}`;
}
