"use client";

/**
 * Navigate with a full page load. Used when the session starts or ends: Next keeps visited routes
 * alive in hidden `<Activity>` boundaries, so a client-side navigation would leave the previous
 * session's screens (or the typed password) in the DOM.
 */
export function useFullPageNavigation(): (path: string) => void {
  return (path) => {
    window.location.assign(path);
  };
}
