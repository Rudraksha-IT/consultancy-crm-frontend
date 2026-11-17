/**
 * Whether any page has changes not yet saved. A page that guards its changes holds this while it
 * has some (`useLeaveGuard`), so other parts of the app, such as swiping between pages (issue 90),
 * can stay out of the way.
 */

let holders = 0;

/** Holds "unsaved changes" until the returned function is called (once). */
export function holdUnsavedChanges(): () => void {
  holders += 1;
  let isHeld = true;
  return () => {
    if (!isHeld) return;
    isHeld = false;
    holders -= 1;
  };
}

export function hasUnsavedChanges(): boolean {
  return holders > 0;
}
