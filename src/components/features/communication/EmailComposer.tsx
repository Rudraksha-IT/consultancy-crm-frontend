"use client";

import clsx from "clsx";
import { useId, useRef, useState, type SubmitEvent } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SubmitKeysHint, SubmitKeysScope } from "@/components/ui/SubmitKeys";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import {
  COMMUNICATION_TEXT as TEXT,
  SUBJECT_MAX_LENGTH,
  plainEmailText,
} from "@/constants/communication";
import { LABELS } from "@/constants/messages";
import { Stage } from "@/constants/stages";
import { refsOf, type Attachable, type BulkResult, type ReadyMadeTarget } from "@/lib/api";

import { AttachmentsArea } from "./AttachmentsArea";
import { PaneToggle, SendingFinished, ToRow } from "./ComposerParts";
import { composerWording, type ComposerWording } from "./composerWording";
import { ContactEmailBanner } from "./ContactEmailBanner";
import { EmailPreview } from "./EmailPreview";
import { ReadyMadeRow } from "./ReadyMadeRow";
import type { EmailRecipient } from "./recipients";
import { useAttachments, type Attachments } from "./useAttachments";
import { useComposerText, type ComposerText, type StartWith } from "./useComposerText";
import { useEmailSend, type EmailSend } from "./useEmailSend";

type EmailComposerProps = {
  /** One Student, or the Students chosen for one email to many. */
  recipients: readonly EmailRecipient[];
  /** Each of many Students gets their own copy, starting "Dear Student,". */
  isBulk: boolean;
  onClose: () => void;
  /** It was sent (or failed and recorded); the lists showing emails can load again. */
  onSent?: () => void;
  /** Go back to choosing the Students (many), keeping who is chosen. */
  onChange?: () => void;
  /** The ready-made email (and record) to open on, e.g. Payment received from a receipt. */
  startWith?: StartWith | undefined;
};

/**
 * Write an email (issues 04, 09, 12): who it's to, the ready-made email it starts from (and the
 * record it is about), a subject line, the message and the files attached, beside a live preview
 * of what the Student receives. Near full screen; at narrow widths Write and Preview take turns.
 * One Student's email is confirmed in a toast; many show Sending finished.
 */
export function EmailComposer(props: EmailComposerProps) {
  const [result, setResult] = useState<BulkResult | null>(null);
  if (result !== null) return <SendingFinished result={result} onClose={props.onClose} />;
  return (
    <Composer
      {...props}
      onBulkSent={(sent) => {
        setResult(sent);
        props.onSent?.();
      }}
    />
  );
}

type ComposerProps = EmailComposerProps & { onBulkSent: (result: BulkResult) => void };

function Composer({
  recipients,
  isBulk,
  onClose,
  onSent,
  onChange,
  onBulkSent,
  startWith,
}: ComposerProps) {
  const formId = useId();
  const { staff, consultancy } = useCurrentStaff();
  const only = isBulk ? null : (recipients[0] ?? null);
  const wording = composerWording(only, recipients, consultancy.name);
  const sending = useEmailSend({ only, recipients, onSent, onBulkSent });
  const target: ReadyMadeTarget = only === null ? "many" : { studentId: only.id };
  const attachments = useAttachments(target, filesOf(startWith));
  const draft = useComposerText({
    target,
    startWith: startFor(startWith, recipients),
    firstBody: plainEmailText(wording.greetingName, staff.name, consultancy.name),
    onSuggested: attachments.suggest,
  });
  const missingAddress = addressMissingFor(only);
  const canSend = isSendable(consultancy.hasContactEmail, missingAddress, recipients, attachments);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canSend) return;
    const email = draft.checked(event.currentTarget);
    if (email !== null) sending.send({ ...email, attachments: refsOf(attachments.files) });
  }

  return (
    <SubmitKeysScope>
      <Dialog
        isOpen
        isFull
        hasSmallText
        title={wording.title}
        onClose={onClose}
        headerAside={<PaneToggle pane={draft.pane} onPane={draft.setPane} />}
        footer={
          <ComposerFooter
            formId={formId}
            wording={wording}
            isSaving={sending.isSaving}
            canSend={canSend}
            onClose={onClose}
          />
        }
      >
        <div className="grid h-full min-h-0">
          <form
            id={formId}
            noValidate
            onSubmit={handleSubmit}
            className={clsx(
              "phone:px-8 flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4",
              draft.pane === "preview" && "hidden",
            )}
          >
            <ContactEmailBanner />
            <ToRow recipients={recipients} isBulk={isBulk} onChange={onChange} />
            <Problems missingAddress={missingAddress} students={sending.fieldErrors.students} />
            <ReadyMadeRow text={draft} />
            <ComposerFields draft={draft} sending={sending} hint={wording.hint} />
            <AttachmentsArea
              attachments={attachments}
              isBulk={isBulk}
              errors={sending.fieldErrors.attachments}
            />
          </form>
          <EmailPreview
            subject={draft.subject}
            body={draft.body}
            files={attachments.files}
            toLine={wording.toLine}
            whose={wording.whose}
            isHiddenWhenNarrow={draft.pane === "write"}
          />
        </div>
      </Dialog>
    </SubmitKeysScope>
  );
}

/**
 * It can go once the office has a contact email, every Student chosen has an address and the
 * files fit in one email.
 */
function isSendable(
  hasContactEmail: boolean,
  missingAddress: string | null,
  recipients: readonly EmailRecipient[],
  attachments: Attachments,
): boolean {
  const hasSomeone = missingAddress === null && recipients.length > 0;
  return hasContactEmail && hasSomeone && !attachments.isOver;
}

/** The files the email opens with, if any. */
function filesOf(startWith: StartWith | undefined): readonly Attachable[] {
  return startWith?.files ?? [];
}

/** The one Student's name when they have no email address, else null. */
/** The email asked for; else, for Lost Students, Checking in (list tidy-ups 34). */
function startFor(
  startWith: StartWith | undefined,
  recipients: readonly EmailRecipient[],
): StartWith | undefined {
  if (startWith !== undefined) return startWith;
  const isAllLost =
    recipients.length > 0 && recipients.every((recipient) => recipient.stage === Stage.Lost);
  return isAllLost ? { kind: "checking_in" } : undefined;
}

function addressMissingFor(only: EmailRecipient | null): string | null {
  return only !== null && only.email === "" ? only.name : null;
}

type ComposerFieldsProps = { draft: ComposerText; sending: EmailSend; hint: string };

/** The subject line and the message, with what the server refused and why sending failed. */
function ComposerFields({ draft, sending, hint }: ComposerFieldsProps) {
  const { fieldErrors, failure } = sending;
  const startAgainRow = useRef<HTMLDivElement>(null);
  return (
    <>
      <TextField
        label={TEXT.subject}
        name="subject"
        placeholder={TEXT.subjectPlaceholder}
        value={draft.subject}
        onChange={(value) => {
          draft.setSubject(value.slice(0, SUBJECT_MAX_LENGTH));
        }}
        errors={draft.subjectError === null ? fieldErrors.subject : [draft.subjectError]}
      />
      {/* The message fills the spare height, so the files sit at the bottom (list tidy-ups 33). */}
      <div
        data-message-fills=""
        className="flex min-h-48 flex-1 flex-col *:flex-1 *:grid-rows-[auto_minmax(0,1fr)] *:content-stretch [&_textarea]:h-full [&_textarea]:resize-none"
      >
        <TextAreaField
          label={TEXT.message}
          name="body"
          rows={8}
          placeholder={TEXT.messagePlaceholder}
          value={draft.body}
          onChange={draft.setBody}
          hint={hint}
          errors={fieldErrors.body}
        />
      </div>
      {draft.isEdited && (
        <div ref={startAgainRow} className="-mt-3 flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            icon="restore"
            onClick={() => {
              draft.startAgain();
              // The button goes once the text is back: focus moves to the message (rule 8).
              focusField(startAgainRow.current?.closest("form") ?? null, "body");
            }}
          >
            {TEXT.startAgain}
          </Button>
        </div>
      )}
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
    </>
  );
}

function focusField(form: HTMLFormElement | null, name: string): void {
  const field = form?.elements.namedItem(name);
  if (field instanceof HTMLElement) field.focus();
}

type ProblemsProps = {
  /** The name of the one Student, when they have no email address. */
  missingAddress: string | null;
  /** Why the server refused who it goes to, e.g. a Lost Student. */
  students: string[] | undefined;
};

function Problems({ missingAddress, students }: ProblemsProps) {
  return (
    <>
      {missingAddress !== null && (
        <Banner tone="warning">{TEXT.noEmailAddress(missingAddress)}</Banner>
      )}
      {students !== undefined && <Banner tone="problem">{students.join(" ")}</Banner>}
    </>
  );
}

type ComposerFooterProps = {
  formId: string;
  wording: ComposerWording;
  isSaving: boolean;
  canSend: boolean;
  onClose: () => void;
};

/** Who it is sent as (or how many get a copy), the keys hint, Cancel and Send. */
function ComposerFooter({ formId, wording, isSaving, canSend, onClose }: ComposerFooterProps) {
  return (
    <>
      <p className="text-secondary text-ink-2 max-phone:hidden mr-auto self-center">
        {wording.footerLine}
      </p>
      <SubmitKeysHint action="send" />
      <Button onClick={onClose}>{LABELS.cancel}</Button>
      <Button
        type="submit"
        form={formId}
        variant="primary"
        icon="send"
        isLoading={isSaving}
        isDisabled={!canSend}
        loadingLabel={TEXT.sending}
      >
        {wording.sendLabel}
      </Button>
    </>
  );
}
