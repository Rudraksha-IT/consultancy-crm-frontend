"use client";

import { useId, useState, type SubmitEvent } from "react";

import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { useToast } from "@/components/ui/useToast";
import {
  CHANNEL_LABELS,
  COMMUNICATION_TEXT as TEXT,
  Channel,
  defaultChannel,
} from "@/constants/communication";
import { sendMessage, type Message } from "@/lib/api";

import { MessageFields } from "./MessageFields";

/** The Student a message goes to, as their profile shows them. */
export type MessageRecipient = { id: number; name: string; phone: string; email: string };

type SendMessageDialogProps = {
  student: MessageRecipient;
  onClose: () => void;
  /** It was sent or failed; either way it is now in the Student's messages. */
  onSent: (message: Message) => void;
};

/**
 * Send one email or SMS to one Student (spec 89), and say whether it went (spec 91). Starts on
 * Email, or on SMS (saying why) when the Student has no email address (issue 72).
 */
export function SendMessageDialog({ student, onClose, onSent }: SendMessageDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const { isSaving, fieldErrors, failure, save } = useFormSave(() => TEXT.couldntSend);
  const startsOn = defaultChannel(student.email);
  const [channel, setChannel] = useState<Channel>(startsOn);
  const [text, setText] = useState<string>(TEXT.greeting);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void save(async () => {
      const message = await sendMessage(student.id, { channel, body: text.trim() });
      showToast(
        message.status === "sent"
          ? TEXT.wasSent(CHANNEL_LABELS[message.channel])
          : TEXT.sendFailed(message.error),
      );
      onSent(message);
    });
  }

  return (
    <SaveDialog
      title={TEXT.messageTo(student.name)}
      formId={formId}
      saveLabel={TEXT.send}
      saveIcon="send"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
      keysHint="send"
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-5">
        <MessageFields
          channel={channel}
          onChannel={setChannel}
          text={text}
          onText={setText}
          fieldErrors={fieldErrors}
        >
          {startsOn === Channel.Sms && <p className="text-small text-ink-3">{TEXT.smsChosen}</p>}
          <p className="text-secondary text-ink-2">{recipientLine(student, channel)}</p>
        </MessageFields>
      </form>
    </SaveDialog>
  );
}

/** Where it will go: the mobile number, the email address, or that there is none. */
function recipientLine(student: MessageRecipient, channel: Channel): string {
  if (channel === Channel.Sms) return TEXT.sendsTo(student.phone);
  return student.email === "" ? TEXT.noEmailAddress : TEXT.sendsTo(student.email);
}
