"use client";

import { useId, useState, type SubmitEvent } from "react";

import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FigureTile } from "@/components/ui/FigureTile";
import { COMMUNICATION_TEXT as TEXT, Channel, defaultChannel } from "@/constants/communication";
import { sendBulkMessage, type BulkRecipients, type BulkResult } from "@/lib/api";

import { MessageFields } from "./MessageFields";
import { useBulkCount, type BulkCountState } from "./useBulkCount";

type BulkMessageDialogProps = {
  recipients: BulkRecipients;
  title: string;
  /** Who it goes to, in words, e.g. "From the current Student list filters." */
  subtitle: string;
  onClose: () => void;
  /** It was sent to everyone, each sent or failed; they are now in the Email & SMS list. */
  onSent?: (result: BulkResult) => void;
};

/**
 * One email or SMS to many Students (spec 90): write it, send it one by one, then see how many
 * were sent and which failed, with why (spec 91).
 */
export function BulkMessageDialog({ onSent, onClose, ...compose }: BulkMessageDialogProps) {
  const [result, setResult] = useState<BulkResult | null>(null);
  if (result !== null) return <SendingFinished result={result} onClose={onClose} />;
  return (
    <ComposeDialog
      {...compose}
      onClose={onClose}
      onSent={(sent) => {
        setResult(sent);
        onSent?.(sent);
      }}
    />
  );
}

type ComposeDialogProps = Omit<BulkMessageDialogProps, "onSent"> & {
  onSent: (result: BulkResult) => void;
};

function ComposeDialog({ recipients, title, subtitle, onClose, onSent }: ComposeDialogProps) {
  const formId = useId();
  const count = useBulkCount(recipients);
  const { isSaving, fieldErrors, failure, save } = useFormSave(() => TEXT.couldntSend);
  const [channel, setChannel] = useState<Channel>(() => defaultChannel());
  const [text, setText] = useState<string>(TEXT.greeting);
  const problem = countProblem(count);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (problem !== null || count.status !== "loaded") return;
    void save(async () => {
      onSent(await sendBulkMessage(recipients, { channel, body: text.trim() }));
    });
  }

  return (
    <SaveDialog
      title={title}
      formId={formId}
      saveLabel={TEXT.sendToCount(count.status === "loaded" ? count.count.count : 0)}
      saveIcon="send"
      isSaving={isSaving}
      isSaveDisabled={count.status !== "loaded" || problem !== null}
      failure={failure}
      onClose={onClose}
      keysHint="send"
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-5">
        <p className="text-secondary text-ink-2">{subtitle}</p>
        {problem !== null && <Banner tone="warning">{problem}</Banner>}
        {fieldErrors.recipients !== undefined && (
          <Banner tone="problem">{fieldErrors.recipients.join(" ")}</Banner>
        )}
        <MessageFields
          channel={channel}
          onChannel={setChannel}
          text={text}
          onText={setText}
          fieldErrors={fieldErrors}
        />
        <p className="text-small text-ink-3">{TEXT.oneByOne}</p>
      </form>
    </SaveDialog>
  );
}

/** Why it can't be sent to these Students yet, or null when it can. */
function countProblem(state: BulkCountState): string | null {
  if (state.status === "failed") return TEXT.countFailed;
  if (state.status === "loading") return null;
  const { count, max } = state.count;
  if (count === 0) return TEXT.nobodyToSendTo;
  return count > max ? TEXT.tooManyStudents(max) : null;
}

function SendingFinished({ result, onClose }: { result: BulkResult; onClose: () => void }) {
  return (
    <Dialog
      isOpen
      title={TEXT.sendingFinished}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          {TEXT.done}
        </Button>
      }
    >
      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-4">
          <FigureTile label={TEXT.sent} value={<span className="text-good">{result.sent}</span>} />
          <FigureTile
            label={TEXT.failed}
            value={<span className="text-bad">{result.failed}</span>}
          />
        </div>
        {result.failedMessages.length > 0 && (
          <ul aria-label={TEXT.failed} className="grid list-disc gap-2 pl-5">
            {result.failedMessages.map((message) => (
              <li key={message.id}>{TEXT.failedLine(message.student.name, message.error)}</li>
            ))}
          </ul>
        )}
        <p className="text-small text-ink-3">{TEXT.oneFailureNeverStops}</p>
      </div>
    </Dialog>
  );
}
