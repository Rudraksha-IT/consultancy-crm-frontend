"use client";

import { useState, type SubmitEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useSubmitKeys } from "@/components/ui/useSubmitKeys";
import { HTTP_STATUS } from "@/constants/api";
import { INBOX_MESSAGE_MAX_LENGTH, INBOX_TEXT } from "@/constants/inbox";
import {
  ApiRequestError,
  DetailAnswerSchema,
  InvalidFieldsError,
  sendInboxMessage,
  type InboxMessage,
  type InboxPerson,
} from "@/lib/api";

type ComposeFormProps = {
  person: InboxPerson;
  onSent: (message: InboxMessage) => void;
};

/**
 * The box to write in: plain text up to 2,000 characters. Enter sends, Shift + Enter makes a
 * new line, and typing in another language never sends (design system, Keyboard).
 */
export function ComposeForm({ person, onSent }: ComposeFormProps) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[] | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const handleKeyDown = useSubmitKeys({ mode: "enter" });

  async function send(): Promise<void> {
    const trimmed = text.trim();
    if (trimmed === "" || isSending) return;
    setIsSending(true);
    setErrors(undefined);
    try {
      const message = await sendInboxMessage(person.id, trimmed);
      setText("");
      onSent(message);
    } catch (error) {
      setErrors([sendFailure(error)]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void send();
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="border-rule grid gap-3 border-t px-5 py-3.5"
    >
      <Field
        label={INBOX_TEXT.messageTo(person.name)}
        isLabelHidden
        hint={`${INBOX_TEXT.characters(text.length)}. ${INBOX_TEXT.keysHint}`}
        errors={errors}
      >
        {({ className, ...control }) => (
          <textarea
            {...control}
            name="text"
            rows={2}
            maxLength={INBOX_MESSAGE_MAX_LENGTH}
            placeholder={INBOX_TEXT.placeholder}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            onKeyDown={handleKeyDown}
            className={`${className} resize-y py-3`}
          />
        )}
      </Field>
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          icon="send"
          isLoading={isSending}
          loadingLabel={INBOX_TEXT.sending}
        >
          {INBOX_TEXT.send}
        </Button>
      </div>
    </form>
  );
}

/** What to say when sending failed: the refused text's reason, a refusal's reason, or retry. */
function sendFailure(error: unknown): string {
  return refusedText(error) ?? refusalReason(error) ?? INBOX_TEXT.sendFailed;
}

/** The server's reason for refusing the text, e.g. "Write a message.". */
function refusedText(error: unknown): string | null {
  if (!(error instanceof InvalidFieldsError)) return null;
  const fieldErrors: Partial<Record<string, string[]>> = error.fieldErrors;
  return fieldErrors.text?.[0] ?? null;
}

/** A refusal's short reason, e.g. that the person has left or the office is read-only. */
function refusalReason(error: unknown): string | null {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.forbidden) return null;
  const refused = DetailAnswerSchema.safeParse(error.body);
  return refused.success ? refused.data.detail : null;
}
