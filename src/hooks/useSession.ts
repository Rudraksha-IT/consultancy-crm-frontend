"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { HTTP_STATUS } from "@/constants/api";
import { ApiRequestError, NotLoggedInError, onLoginEnded } from "@/lib/api";
import { loginAddress } from "@/lib/loginReturn";

import { useReloadWhenRestored } from "./useReloadWhenRestored";

export type SessionState<T> =
  { status: "loading" } | { status: "loaded"; value: T } | { status: "failed" };

/** The page the person is on, to come back to once logged in again (ticket 14). */
function currentPage(): string {
  return `${window.location.pathname}${window.location.search}`;
}

/**
 * Not logged in: the login page, saying so if this browser's login has ended, and bringing the
 * person back to this page afterwards (ticket 14). Nobody's account at this address at all (404,
 * e.g. no office here): the login page, which explains (issue 66).
 */
function loginPageFor(error: unknown, loginPath: string): string | null {
  if (error instanceof NotLoggedInError) {
    return loginAddress(loginPath, { next: currentPage(), hasLoginEnded: error.hasLoginEnded });
  }
  const isNoAccount = error instanceof ApiRequestError && error.status === HTTP_STATUS.notFound;
  return isNoAccount ? loginPath : null;
}

/**
 * Load whoever is logged in with `load`; send visitors who aren't logged in to `loginPath`.
 * A page brought back by the back button is checked again, so it never outlives a logout. While
 * the page is open, a call answered "not logged in" (the login ended in the middle of work) opens
 * the login page too, once, with a full page load so nothing of the session stays in the page.
 * `load` must be stable (a module-level function), as it is an effect dependency.
 */
export function useSession<T>(load: () => Promise<T>, loginPath: string): SessionState<T> {
  useReloadWhenRestored();
  const router = useRouter();
  const [state, setState] = useState<SessionState<T>>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    async function run(): Promise<void> {
      try {
        const value = await load();
        if (!isCancelled) setState({ status: "loaded", value });
      } catch (error) {
        if (isCancelled) return;
        const page = loginPageFor(error, loginPath);
        if (page !== null) router.replace(page);
        else setState({ status: "failed" });
      }
    }
    void run();
    return () => {
      isCancelled = true;
    };
  }, [load, loginPath, router]);

  useEffect(() => {
    let isLeaving = false;
    return onLoginEnded((hasLoginEnded) => {
      if (isLeaving) return;
      isLeaving = true;
      window.location.assign(loginAddress(loginPath, { next: currentPage(), hasLoginEnded }));
    });
  }, [loginPath]);

  return state;
}
