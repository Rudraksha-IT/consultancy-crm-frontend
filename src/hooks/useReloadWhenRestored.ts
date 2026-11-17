"use client";

import { useEffect } from "react";

function reloadPage(): void {
  window.location.reload();
}

/**
 * Reload the page when the browser restores it from its back-forward cache. After logout the
 * back button would otherwise show the logged-in screen as it was; reloading runs the session
 * check again, which sends a visitor who isn't logged in to the login page.
 * `reload` must be stable (a module-level function), as it is an effect dependency.
 */
export function useReloadWhenRestored(reload: () => void = reloadPage): void {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent): void {
      if (event.persisted) reload();
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [reload]);
}
