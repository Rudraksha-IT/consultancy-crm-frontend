const PREFIX = "tab-title:";

/** Where a page's tab title is remembered, in this office address's own browser storage. */
export function savedTitleKey(pathname: string): string {
  return `${PREFIX}${pathname}`;
}

/**
 * Puts back the title this page had last time, and keeps it over the product name the server
 * sends, until the app sets its own (list tidy-ups 30). Pages it doesn't know keep the server's
 * title; no storage (a private window), no harm. Self-contained: it runs as the page's first
 * script, from its own text.
 */
export function keepSavedTitle(prefix: string): () => void {
  const keep = () => {
    // Storage can be refused at any time (a private window, blocked site data): never throw.
    try {
      const saved = localStorage.getItem(prefix + location.pathname);
      if (saved !== null && document.title !== saved) document.title = saved;
    } catch {
      // The product name shows for a moment.
    }
  };
  keep();
  const watcher = new MutationObserver(keep);
  watcher.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  // The page never stops it; tests do.
  return () => {
    watcher.disconnect();
  };
}

/** keepSavedTitle as a script for the page's <head>, run before anything is drawn. */
export const KEEP_TITLE_SCRIPT = `(${keepSavedTitle.toString()})(${JSON.stringify(PREFIX)});`;
