"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/useToast";
import { STATUS_TEXT } from "@/constants/consultancyStatus";
import {
  changeConsultancyStatus,
  InvalidFieldsError,
  type ConsultancyOverview,
  type StatusChange,
  type StatusChangeField,
} from "@/lib/api";

export type StatusFieldErrors = Partial<Record<StatusChangeField, string[]>>;

export type ChangeStatusState = {
  isSaving: boolean;
  fieldErrors: StatusFieldErrors;
  /** Why the change as a whole was refused, or a general failure. */
  error: string | null;
  save: (change: StatusChange) => Promise<void>;
};

/** Save a Status change; on success say so and hand back the updated Consultancy. */
export function useChangeStatus(
  consultancy: ConsultancyOverview,
  onSaved: (updated: ConsultancyOverview) => void,
): ChangeStatusState {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<StatusFieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  async function save(change: StatusChange): Promise<void> {
    setIsSaving(true);
    setFieldErrors({});
    setError(null);
    try {
      const updated = await changeConsultancyStatus(consultancy.id, change);
      showToast(STATUS_TEXT.statusSaved(updated.name));
      onSaved(updated);
    } catch (caught) {
      if (caught instanceof InvalidFieldsError) {
        const { detail, ...fields } = caught.fieldErrors;
        setFieldErrors(fields);
        setError(detail?.join(" ") ?? null);
      } else {
        setError(STATUS_TEXT.saveStatusFailed);
      }
      setIsSaving(false);
    }
  }

  return { isSaving, fieldErrors, error, save };
}
