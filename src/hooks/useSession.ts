"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { HTTP_STATUS } from "@/constants/api";
import { ApiRequestError, NotLoggedInError } from "@/lib/api";

import { useReloadWhenRestored } from "./useReloadWhenRestored";

export type SessionState<T> =
  { status: "loading" } | { status: "loaded"; value: T } | { status: "failed" };

/**
 * Not logged in, or nobody's account at this address at all (404, e.g. no office here): the
 * login page is where either is explained (issue 66).
 */
function belongsAtTheLogin(error: unknown): boolean {
  if (error instanceof NotLoggedInError) return true;
  return error instanceof ApiRequestError && error.status === HTTP_STATUS.notFound;
}

/**
 * Load whoever is logged in with `load`; send visitors who aren't logged in to `loginPath`.
 * A page brought back by the back button is checked again, so it never outlives a logout.
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
        if (belongsAtTheLogin(error)) router.replace(loginPath);
        else setState({ status: "failed" });
      }
    }
    void run();
    return () => {
      isCancelled = true;
    };
  }, [load, loginPath, router]);

  return state;
}
