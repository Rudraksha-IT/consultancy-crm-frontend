"use client";

import type { RecordId } from "@/lib/recordId";
import { useEffect, useEffectEvent, useState } from "react";

import { HTTP_STATUS } from "@/constants/api";
import {
  ApiRequestError,
  fetchAttendanceDay,
  fetchBatch,
  fetchBatches,
  fetchBatchTeachers,
  fetchEnrolledStudents,
  fetchStudentClasses,
  type AttendanceDay,
  type BatchPage,
  type BatchTeacher,
  type BatchWithStudents,
  type EnrolledStudentPage,
  type StudentClass,
} from "@/lib/api";

/** Something loaded from the API: still loading, there, not there, or failed. */
export type Loaded<T> =
  | { status: "loading" }
  | { status: "loaded"; data: T }
  /** The API said there's no such thing (404), e.g. another Teacher's class. */
  | { status: "missing" }
  | { status: "failed" };

/**
 * Load with `load` now and whenever `key` changes (bump a version in it after a change). An answer
 * that arrives after a newer request is dropped.
 */
function useLoaded<T>(load: () => Promise<T>, key: string): Loaded<T> {
  const [state, setState] = useState<{ key: string; loaded: Loaded<T> }>({
    key,
    loaded: { status: "loading" },
  });

  const loadNow = useEffectEvent(load);

  useEffect(() => {
    let isCancelled = false;
    async function run(): Promise<void> {
      try {
        const data = await loadNow();
        if (!isCancelled) setState({ key, loaded: { status: "loaded", data } });
      } catch (error) {
        if (!isCancelled) setState({ key, loaded: { status: failedStatus(error) } });
      }
    }
    void run();
    return () => {
      isCancelled = true;
    };
    // `key` names everything `load` depends on.
  }, [key]);

  return state.loaded;
}

function failedStatus(error: unknown): "missing" | "failed" {
  return error instanceof ApiRequestError && error.status === HTTP_STATUS.notFound
    ? "missing"
    : "failed";
}

/** One page of the classes I can see. */
export function useBatchPage(page: number, version: number): Loaded<BatchPage> {
  return useLoaded(() => fetchBatches(page), `${String(page)}:${String(version)}`);
}

/** One class with its Students. */
export function useBatch(id: RecordId, version: number): Loaded<BatchWithStudents> {
  return useLoaded(() => fetchBatch(id), `${id}:${String(version)}`);
}

/** One page of the Students in classes. */
export function useEnrolledStudents(page: number, version: number): Loaded<EnrolledStudentPage> {
  return useLoaded(() => fetchEnrolledStudents(page), `${String(page)}:${String(version)}`);
}

/** Who can teach a class. */
export function useBatchTeachers(): Loaded<BatchTeacher[]> {
  return useLoaded(fetchBatchTeachers, "teachers");
}

/** One class day's marks; `day` is AD, "YYYY-MM-DD". */
export function useAttendanceDay(
  id: RecordId,
  day: string,
  version: number,
): Loaded<AttendanceDay> {
  return useLoaded(() => fetchAttendanceDay(id, day), `${id}:${day}:${String(version)}`);
}

/** The classes a Student is in, with their Attendance; none, without asking, when not enabled. */
export function useStudentClasses(studentId: RecordId, isEnabled: boolean): Loaded<StudentClass[]> {
  return useLoaded(
    () => (isEnabled ? fetchStudentClasses(studentId) : Promise.resolve([])),
    `${studentId}:${String(isEnabled)}`,
  );
}
