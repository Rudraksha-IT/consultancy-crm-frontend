"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import {
  createConsultancy,
  InvalidFieldsError,
  type NewConsultancy,
  type NewConsultancyField,
} from "@/lib/api";

export type FieldErrors = Partial<Record<NewConsultancyField, string[]>>;

export type CreateConsultancyState = {
  isSubmitting: boolean;
  fieldErrors: FieldErrors;
  error: string | null;
  submit: (consultancy: NewConsultancy) => Promise<void>;
};

/** Create a Consultancy and return to the list; keep field errors or a general error on failure. */
export function useCreateConsultancy(): CreateConsultancyState {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  async function submit(consultancy: NewConsultancy): Promise<void> {
    setIsSubmitting(true);
    setFieldErrors({});
    setError(null);
    try {
      await createConsultancy(consultancy);
      router.push(ROUTES.platformHome);
    } catch (caught) {
      if (caught instanceof InvalidFieldsError) setFieldErrors(caught.fieldErrors);
      else setError(MESSAGES.createConsultancyFailed);
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, fieldErrors, error, submit };
}
