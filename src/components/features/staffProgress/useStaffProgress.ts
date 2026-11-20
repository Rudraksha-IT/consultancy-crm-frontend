"use client";

import type { RecordId } from "@/lib/recordId";
import { useEffect, useEffectEvent, useState } from "react";

import { HTTP_STATUS } from "@/constants/api";
import {
  ApiRequestError,
  fetchStaffProgress,
  InvalidFieldsError,
  type DateRange,
  type StaffProgress,
} from "@/lib/api";

/** A Progress answer: loading, there, dates refused, nobody there, not allowed, or failed. */
export type ProgressState =
  | { status: "loading" }
  | { status: "loaded"; data: StaffProgress }
  | { status: "refused"; fieldErrors: Partial<Record<string, string[]>> }
  | { status: "missing" }
  | { status: "forbidden" }
  | { status: "failed" };

type Answer = { key: string; state: ProgressState; staff: StaffProgress["staff"] | null };

/**
 * Load a Staff member's Progress for the dates, again when they change. The person last loaded is
 * kept while a new period loads or is refused, so the page header stays put.
 */
export function useStaffProgress(
  staffId: RecordId,
  range: DateRange,
): { state: ProgressState; staff: StaffProgress["staff"] | null } {
  const key = `${staffId}:${range.from}:${range.to}`;
  const [answer, setAnswer] = useState<Answer>({
    key: "",
    state: { status: "loading" },
    staff: null,
  });

  const load = useEffectEvent(() => fetchStaffProgress(staffId, range));

  useEffect(() => {
    let isCancelled = false;
    load().then(
      (data) => {
        if (!isCancelled) setAnswer({ key, state: { status: "loaded", data }, staff: data.staff });
      },
      (error: unknown) => {
        if (isCancelled) return;
        setAnswer((before) => ({ key, state: stateOf(error), staff: before.staff }));
      },
    );
    return () => {
      isCancelled = true;
    };
    // `key` names everything the request depends on.
  }, [key]);

  return {
    state: answer.key === key ? answer.state : { status: "loading" },
    staff: answer.staff,
  };
}

const STATUS_STATES: Partial<Record<number, ProgressState>> = {
  [HTTP_STATUS.notFound]: { status: "missing" },
  [HTTP_STATUS.forbidden]: { status: "forbidden" },
};

function stateOf(error: unknown): ProgressState {
  if (error instanceof InvalidFieldsError) {
    return { status: "refused", fieldErrors: error.fieldErrors };
  }
  return STATUS_STATES[statusOf(error)] ?? { status: "failed" };
}

/** The HTTP status the API answered with; 0 when there was none. */
function statusOf(error: unknown): number {
  return error instanceof ApiRequestError ? (error.status ?? 0) : 0;
}
