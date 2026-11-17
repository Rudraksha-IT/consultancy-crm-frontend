"use client";

import { useEffect, useState } from "react";

import { fetchMyDetails, type MyDetails } from "@/lib/api";

export type MyDetailsState =
  { status: "loading" } | { status: "loaded"; details: MyDetails } | { status: "failed" };

/** My details and choices, loaded once for the Settings page; `show` puts a saved version in. */
export function useMyDetails(): { state: MyDetailsState; show: (details: MyDetails) => void } {
  const [state, setState] = useState<MyDetailsState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    fetchMyDetails().then(
      (details) => {
        if (!isCancelled) setState({ status: "loaded", details });
      },
      () => {
        if (!isCancelled) setState({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    state,
    show: (details) => {
      setState({ status: "loaded", details });
    },
  };
}
