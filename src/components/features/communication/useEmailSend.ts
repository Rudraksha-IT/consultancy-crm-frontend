"use client";

import type { RecordId } from "@/lib/recordId";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { useToast } from "@/components/ui/useToast";
import { COMMUNICATION_TEXT as TEXT } from "@/constants/communication";
import {
  FilesNotFetchedError,
  NoContactEmailError,
  sendBulkEmail,
  sendEmail,
  type BulkResult,
  type Message,
  type NewEmail,
} from "@/lib/api";

import type { EmailRecipient } from "./recipients";

export type EmailSend = {
  isSaving: boolean;
  fieldErrors: Partial<Record<string, string[]>>;
  failure: string | null;
  send: (email: NewEmail) => void;
};

type EmailSendOptions = {
  /** One Student, or null for each of `recipients`. */
  only: EmailRecipient | null;
  recipients: readonly EmailRecipient[];
  onSent: (() => void) | undefined;
  onBulkSent: (result: BulkResult) => void;
};

/** Send to one Student (confirmed in a toast) or to many (handing over how it went). */
export function useEmailSend({
  only,
  recipients,
  onSent,
  onBulkSent,
}: EmailSendOptions): EmailSend {
  const { showToast } = useToast();
  const { isSaving, fieldErrors, failure, save } = useFormSave(describeFailure);

  function send(email: NewEmail): void {
    void save(async () => {
      if (only === null) {
        onBulkSent(await sendBulkEmail(idsOf(recipients), email));
        return;
      }
      showToast(toastFor(only, await sendEmail(only.id, email)));
      onSent?.();
    });
  }

  return { isSaving, fieldErrors, failure, send };
}

function idsOf(recipients: readonly EmailRecipient[]): RecordId[] {
  return recipients.map((recipient) => recipient.id);
}

function toastFor(student: EmailRecipient, message: Message): string {
  return message.status === "sent"
    ? TEXT.emailSentTo(student.name)
    : TEXT.sendFailed(message.error);
}

function describeFailure(error: unknown): string {
  if (error instanceof NoContactEmailError) return TEXT.noContactStaff;
  return error instanceof FilesNotFetchedError ? TEXT.filesNotFetched : TEXT.couldntSend;
}
