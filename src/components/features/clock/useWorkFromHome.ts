"use client";

import { useEffect, useState } from "react";

import type { WorkFromHomeDates } from "@/lib/api";

type Loaded<T> = { status: "loading" } | { status: "loaded"; data: T } | { status: "failed" };

/**
 * Load someone's Work From Home dates once (again when `load` changes), and keep them up to date
 * as they change here: a changed set replaces its row, a new one goes to the top.
 */
export function useWorkFromHome<T extends { dates: WorkFromHomeDates[] }>(load: () => Promise<T>) {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    load().then(
      (data) => {
        if (!isCancelled) setState({ status: "loaded", data });
      },
      () => {
        if (!isCancelled) setState({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [load]);

  function changed(dates: WorkFromHomeDates): void {
    setState((current) => {
      if (current.status !== "loaded") return current;
      const others = current.data.dates.filter((one) => one.id !== dates.id);
      const isNew = others.length === current.data.dates.length;
      const list = isNew
        ? [dates, ...others]
        : current.data.dates.map((one) => (one.id === dates.id ? dates : one));
      return { status: "loaded", data: { ...current.data, dates: list } };
    });
  }

  return { state, changed };
}
