"use client";

import { useEffect, useState } from "react";

import { HTTP_STATUS } from "@/constants/api";
import { ApiRequestError, fetchCurrentConsultancy, type Consultancy } from "@/lib/api";

/** `missing`: no office at this address (or it was Terminated); `failed`: couldn't ask. */
export type CurrentConsultancyState =
  | { status: "loading" }
  | { status: "loaded"; consultancy: Consultancy }
  | { status: "missing" }
  | { status: "failed" };

/** Fetch, from the browser, the Consultancy that owns this subdomain. */
export function useCurrentConsultancy(): CurrentConsultancyState {
  const [state, setState] = useState<CurrentConsultancyState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const consultancy = await fetchCurrentConsultancy();
        if (!isCancelled) setState({ status: "loaded", consultancy });
      } catch (error) {
        if (!isCancelled) setState({ status: isNotFound(error) ? "missing" : "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  return state;
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === HTTP_STATUS.notFound;
}
