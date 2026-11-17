"use client";

import { useState } from "react";

import { InvalidFieldsError } from "@/lib/api";

import { saveFailure } from "./saveErrors";

type FormSave = {
  isSaving: boolean;
  /** Messages for each refused field, by the form's field names. */
  fieldErrors: Partial<Record<string, string[]>>;
  /** Why the save failed, when it wasn't about the fields. */
  failure: string | null;
  /** Run the save; refused fields and other failures are kept to show. */
  save: (task: () => Promise<void>) => Promise<void>;
};

/**
 * The saving state of a form: busy, refused fields, or another failure. `describeFailure` says
 * what went wrong when it wasn't about the fields (by default, for a Student form).
 */
export function useFormSave(describeFailure: (error: unknown) => string = saveFailure): FormSave {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string[]>>>({});
  const [failure, setFailure] = useState<string | null>(null);

  async function save(task: () => Promise<void>): Promise<void> {
    setIsSaving(true);
    setFieldErrors({});
    setFailure(null);
    try {
      await task();
    } catch (error) {
      if (error instanceof InvalidFieldsError) setFieldErrors(error.fieldErrors);
      else setFailure(describeFailure(error));
      setIsSaving(false);
    }
  }

  return { isSaving, fieldErrors, failure, save };
}
