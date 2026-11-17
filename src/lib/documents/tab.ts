/** What opening a file needs from a new browser tab. */
export type BlankTab = {
  opener: unknown;
  location: { replace: (url: string) => void };
  close: () => void;
};

/**
 * Open an empty tab at the click, so popup blockers allow it, to send it to a file's link once
 * that arrives; null when the browser blocked it.
 */
export function openBlankTab(): BlankTab | null {
  return window.open("", "_blank");
}
