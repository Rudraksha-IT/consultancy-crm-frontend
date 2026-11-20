"use client";

import { useState } from "react";

import type { Course, University } from "@/lib/api";

export type PickerField = "university" | "course" | "intake";

type Picked = Record<PickerField, string>;

export type ApplicationPicker = {
  picked: Picked;
  university: University | undefined;
  course: Course | undefined;
  intake: string | undefined;
  /** Picking a University starts the Course and Intake again; picking a Course, the Intake. */
  pick: (field: PickerField, value: string) => void;
  /** The fields with nothing picked yet. */
  missing: () => PickerField[];
};

const PICKER_FIELDS: readonly PickerField[] = ["university", "course", "intake"];

export const NOTHING = "";
const NOTHING_PICKED: Picked = { university: NOTHING, course: NOTHING, intake: NOTHING };
const STARTED_AGAIN: Record<PickerField, Partial<Picked>> = {
  university: { course: NOTHING, intake: NOTHING },
  course: { intake: NOTHING },
  intake: {},
};

/** University, then one of its Courses, then one of that Course's Intakes. */
export function useApplicationPicker(universities: readonly University[]): ApplicationPicker {
  const [picked, setPicked] = useState<Picked>(NOTHING_PICKED);
  const university = universities.find((found) => found.id === picked.university);
  const course = university?.courses.find((found) => found.id === picked.course);
  const intake = course?.intakes.find((month) => month === picked.intake);
  const found: Record<PickerField, unknown> = { university, course, intake };

  return {
    picked,
    university,
    course,
    intake,
    pick: (field, value) => {
      setPicked({ ...picked, ...STARTED_AGAIN[field], [field]: value });
    },
    missing: () => PICKER_FIELDS.filter((field) => found[field] === undefined),
  };
}
