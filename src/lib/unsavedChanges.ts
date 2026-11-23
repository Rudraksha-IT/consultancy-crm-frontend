/**
 * Whether any page has changes not yet saved. A page that guards its changes holds this while it
 * has some (`useLeaveGuard`), so other parts of the app, such as swiping between pages (issue 90)
 * or the Admin's office-network dialog (first live fixes, ticket 03), can stay out of the way.
 */

let holders = 0;
const listeners = new Set<() => void>();

function tellListeners(): void {
  for (const listener of listeners) listener();
}

/** Holds "unsaved changes" until the returned function is called (once). */
export function holdUnsavedChanges(): () => void {
  holders += 1;
  tellListeners();
  let isHeld = true;
  return () => {
    if (!isHeld) return;
    isHeld = false;
    holders -= 1;
    tellListeners();
  };
}

export function hasUnsavedChanges(): boolean {
  return holders > 0;
}

/** Calls `listener` whenever a page holds or releases; returns the way to stop. */
export function subscribeUnsavedChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
