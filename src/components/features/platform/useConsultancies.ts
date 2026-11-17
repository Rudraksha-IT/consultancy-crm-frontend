"use client";

import { useEffect, useState } from "react";

import { SETUP_POLL_MS, SetupState } from "@/constants/consultancyStatus";
import { fetchConsultancies, type ConsultancyOverview } from "@/lib/api";

export type ConsultancyListState =
  | { status: "loading" }
  | { status: "loaded"; consultancies: ConsultancyOverview[] }
  | { status: "failed" };

export type ConsultanciesState = {
  list: ConsultancyListState;
  /** Show a Consultancy as the API returned it after a change. */
  replace: (updated: ConsultancyOverview) => void;
};

/**
 * Load every Consultancy, and show one as it is after a change. While any office is being set
 * up, the list is loaded again every few seconds until none is (issue 60).
 */
export function useConsultancies(): ConsultanciesState {
  const [list, setList] = useState<ConsultancyListState>({ status: "loading" });
  const [checks, setChecks] = useState(0);
  const isSettingUp =
    list.status === "loaded" &&
    list.consultancies.some((item) => item.setupState === SetupState.SettingUp);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const consultancies = await fetchConsultancies();
        if (!isCancelled) setList({ status: "loaded", consultancies });
      } catch {
        if (!isCancelled) setList({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSettingUp) return undefined;
    let isCancelled = false;
    const timer = setTimeout(() => {
      void fetchConsultancies()
        .then((consultancies) => {
          if (!isCancelled) setList({ status: "loaded", consultancies });
        })
        .catch(() => {
          // A missed check keeps what is shown; the next one tries again.
        })
        .finally(() => {
          if (!isCancelled) setChecks((count) => count + 1);
        });
    }, SETUP_POLL_MS);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isSettingUp, checks]);

  return {
    list,
    replace: (updated) => {
      setList((current) => replaceConsultancy(current, updated));
    },
  };
}

function replaceConsultancy(
  list: ConsultancyListState,
  updated: ConsultancyOverview,
): ConsultancyListState {
  if (list.status !== "loaded") return list;
  return {
    status: "loaded",
    consultancies: list.consultancies.map((item) => (item.id === updated.id ? updated : item)),
  };
}
