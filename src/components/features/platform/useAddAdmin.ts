"use client";

import { useState } from "react";

import { ADMIN_TEXT } from "@/constants/consultancyStatus";
import {
  addConsultancyAdmin,
  InvalidFieldsError,
  type NewOfficeAdmin,
  type OfficeAdminField,
} from "@/lib/api";
import type { RecordId } from "@/lib/recordId";

export type AdminFieldErrors = Partial<Record<OfficeAdminField, string[]>>;

export type AddAdminState = {
  isSending: boolean;
  fieldErrors: AdminFieldErrors;
  /** Why the office can't take an Admin, or a general failure. */
  error: string | null;
  send: (admin: NewOfficeAdmin) => Promise<void>;
};

/** Invite an Admin into one office (issue 64); `onAdded` gets their name once invited. */
export function useAddAdmin(officeId: RecordId, onAdded: (name: string) => void): AddAdminState {
  const [isSending, setIsSending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AdminFieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  async function send(admin: NewOfficeAdmin): Promise<void> {
    const missing = missingFields(admin);
    setError(null);
    setFieldErrors(missing);
    if (Object.keys(missing).length > 0) return;
    setIsSending(true);
    try {
      const invited = await addConsultancyAdmin(officeId, admin);
      onAdded(invited.name);
    } catch (caught) {
      explain(caught);
      setIsSending(false);
    }
  }

  function explain(caught: unknown): void {
    if (!(caught instanceof InvalidFieldsError)) {
      setError(ADMIN_TEXT.sendFailed);
      return;
    }
    const { detail, ...fields } = caught.fieldErrors;
    setFieldErrors(onlyFields(fields));
    setError(detail?.join(" ") ?? null);
  }

  return { isSending, fieldErrors, error, send };
}

/** The dialog's own fields from a refusal, leaving anything else out. */
function onlyFields(errors: Partial<Record<string, string[]>>): AdminFieldErrors {
  const found: AdminFieldErrors = {};
  if (errors.name !== undefined) found.name = errors.name;
  if (errors.email !== undefined) found.email = errors.email;
  return found;
}

/** Both fields are needed; the server checks everything again. */
function missingFields(admin: NewOfficeAdmin): AdminFieldErrors {
  const missing: AdminFieldErrors = {};
  if (admin.name.trim() === "") missing.name = [ADMIN_TEXT.enterName];
  if (admin.email.trim() === "") missing.email = [ADMIN_TEXT.enterEmail];
  return missing;
}
