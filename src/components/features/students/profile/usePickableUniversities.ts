"use client";

import { useEffect, useState } from "react";

import { fetchPickableUniversities, type University } from "@/lib/api";

export type PickableUniversities =
  { status: "loading" } | { status: "loaded"; universities: University[] } | { status: "failed" };

/** The active Universities that have a Course with an Intake: all an Application can pick. */
export function usePickableUniversities(): PickableUniversities {
  const [state, setState] = useState<PickableUniversities>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchPickableUniversities();
        if (!isCancelled) setState({ status: "loaded", universities: pickable(found) });
      } catch {
        if (!isCancelled) setState({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  return state;
}

function pickable(universities: University[]): University[] {
  return universities
    .map((university) => ({
      ...university,
      courses: university.courses.filter((course) => course.intakes.length > 0),
    }))
    .filter((university) => university.courses.length > 0);
}
