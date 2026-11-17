"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { holdUnsavedChanges } from "@/lib/unsavedChanges";

/** Where the person was going when asked: a page of the app, or back in the browser. */
type Leaving = { kind: "link"; href: string } | { kind: "back" } | null;

type LeaveGuard = {
  /** Whether the "Leave without saving?" question is showing. */
  isAsking: boolean;
  /** Go to `href`, asking first while there are unsaved changes. */
  goTo: (href: string) => void;
  /** Stay on the page. */
  stay: () => void;
  /** Leave as asked, dropping the changes. */
  leave: () => void;
  /** Go to `href` without asking, e.g. after saving. */
  leaveFor: (href: string) => void;
};

/**
 * Ask before leaving a page with unsaved changes (issue 81): the page's own Cancel, any link in
 * the app, the browser's Back button, and closing or reloading the tab (the browser asks then).
 * Back keeps working: while there are changes one extra history entry stands in front of the page,
 * so Back first asks, and leaving goes back past it. While there are changes the app knows it
 * (`hasUnsavedChanges`), so gestures such as swiping between pages stay off.
 */
export function useLeaveGuard(isDirty: boolean): LeaveGuard {
  const router = useRouter();
  const [leaving, setLeaving] = useState<Leaving>(null);
  const mayLeave = useRef(false);

  useEffect(() => {
    if (!isDirty) return undefined;
    function warn(event: BeforeUnloadEvent): void {
      if (!mayLeave.current) event.preventDefault();
    }
    function catchLink(event: MouseEvent): void {
      const href = leavingHref(event);
      if (href === null || mayLeave.current) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaving({ kind: "link", href });
    }
    function catchBack(): void {
      if (mayLeave.current) return;
      window.history.pushState(window.history.state, "", window.location.href);
      setLeaving({ kind: "back" });
    }
    const releaseUnsaved = holdUnsavedChanges();
    window.history.pushState(window.history.state, "", window.location.href);
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", catchLink, true);
    window.addEventListener("popstate", catchBack);
    return () => {
      releaseUnsaved();
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", catchLink, true);
      window.removeEventListener("popstate", catchBack);
    };
  }, [isDirty]);

  function leaveFor(href: string): void {
    mayLeave.current = true;
    router.push(href);
  }

  return {
    isAsking: leaving !== null,
    goTo: (href) => {
      if (isDirty) setLeaving({ kind: "link", href });
      else leaveFor(href);
    },
    stay: () => {
      setLeaving(null);
    },
    leave: () => {
      if (leaving?.kind === "link") leaveFor(leaving.href);
      if (leaving?.kind === "back") {
        mayLeave.current = true;
        // Past the extra entry pushed when asking, and the one in front of the page.
        window.history.go(-2);
      }
      setLeaving(null);
    },
    leaveFor,
  };
}

/** The app address a plain click on a link would open, or null for one that stays or opens apart. */
function leavingHref(event: MouseEvent): string | null {
  if (!isPlainClick(event)) return null;
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  return link instanceof HTMLAnchorElement && opensHere(link) ? otherPageOf(link) : null;
}

/** A left click with no key held, that nothing else has handled. */
function isPlainClick(event: MouseEvent): boolean {
  const withKey = [event.metaKey, event.ctrlKey, event.shiftKey, event.altKey].some(Boolean);
  return !event.defaultPrevented && event.button === 0 && !withKey;
}

/** A link that opens in this tab, not a download. */
function opensHere(link: HTMLAnchorElement): boolean {
  return link.target !== "_blank" && !link.hasAttribute("download");
}

/** The link's address in this app when it goes to another page; null otherwise. */
function otherPageOf(link: HTMLAnchorElement): string | null {
  const url = new URL(link.href);
  const here = window.location;
  if (url.origin !== here.origin) return null;
  const isSamePage = url.pathname === here.pathname && url.search === here.search;
  return isSamePage ? null : `${url.pathname}${url.search}${url.hash}`;
}
