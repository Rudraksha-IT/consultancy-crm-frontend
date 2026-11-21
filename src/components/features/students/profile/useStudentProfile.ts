"use client";

import type { RecordId } from "@/lib/recordId";
import { useEffect, useState } from "react";

import { HTTP_STATUS } from "@/constants/api";
import { ApiRequestError, fetchStudentProfile, type StudentProfile } from "@/lib/api";

export type StudentProfileState =
  | { status: "loading" }
  | { status: "loaded"; profile: StudentProfile }
  | { status: "notFound" }
  | { status: "failed" };

type StudentProfileHook = {
  state: StudentProfileState;
  /** Show the profile as the API returned it after a change. */
  replace: (profile: StudentProfile) => void;
  /** Change the loaded profile in place, e.g. after adding a test score. */
  update: (change: (profile: StudentProfile) => StudentProfile) => void;
  /** Load the profile again in the background, e.g. after a Document was linked; a failure
   * keeps what is shown. */
  refresh: () => Promise<void>;
};

/** Load one Student's profile. An answer that arrives after the page has gone is dropped. */
export function useStudentProfile(studentId: RecordId): StudentProfileHook {
  const [state, setState] = useState<StudentProfileState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const profile = await fetchStudentProfile(studentId);
        if (!isCancelled) setState({ status: "loaded", profile });
      } catch (error) {
        if (!isCancelled) setState(failedState(error));
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [studentId]);

  return {
    state,
    replace: (profile) => {
      setState({ status: "loaded", profile });
    },
    refresh: async () => {
      try {
        const profile = await fetchStudentProfile(studentId);
        setState({ status: "loaded", profile });
      } catch {
        // What is shown stays; the next visit loads it again.
      }
    },
    update: (change) => {
      setState((current) =>
        current.status === "loaded"
          ? { status: "loaded", profile: change(current.profile) }
          : current,
      );
    },
  };
}

function failedState(error: unknown): StudentProfileState {
  const isMissing = error instanceof ApiRequestError && error.status === HTTP_STATUS.notFound;
  return { status: isMissing ? "notFound" : "failed" };
}
