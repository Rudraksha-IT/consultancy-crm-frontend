"use client";

import { useId, type ReactNode } from "react";

import { Banner } from "@/components/ui/Banner";
import { SegmentedChoice } from "@/components/ui/SegmentedChoice";
import { TextAreaField } from "@/components/ui/TextAreaField";
import {
  CHANNEL_LABELS,
  CHANNELS,
  COMMUNICATION_TEXT as TEXT,
  Channel,
  SMS_PART_LENGTH,
} from "@/constants/communication";

const CHANNEL_OPTIONS = CHANNELS.map((value) => ({ value, label: CHANNEL_LABELS[value] }));
const MESSAGE_ROWS = 5;

type MessageFieldsProps = {
  channel: Channel;
  onChannel: (channel: Channel) => void;
  /** The text as typed, for its length. */
  text: string;
  onText: (text: string) => void;
  fieldErrors: Partial<Record<string, string[]>>;
  /** A line under the channel, e.g. where it goes. */
  children?: ReactNode;
};

/** The Email/SMS choice and the message box, starting "Namaste, " with its length under it. */
export function MessageFields(props: MessageFieldsProps) {
  const { channel, onChannel, text, onText, fieldErrors, children } = props;
  const channelName = useId();
  return (
    <>
      <SegmentedChoice
        label={TEXT.channel}
        name={channelName}
        options={CHANNEL_OPTIONS}
        value={channel}
        onChange={onChannel}
      />
      {children}
      {fieldErrors.channel !== undefined && (
        <Banner tone="problem">{fieldErrors.channel.join(" ")}</Banner>
      )}
      <TextAreaField
        label={TEXT.message}
        name="body"
        rows={MESSAGE_ROWS}
        defaultValue={TEXT.greeting}
        hint={lengthHint(channel, text.length)}
        errors={fieldErrors.body}
        onChange={onText}
      />
    </>
  );
}

/** "9 characters, 1 SMS" for an SMS; just the characters for an email. */
export function lengthHint(channel: Channel, characters: number): string {
  if (channel === Channel.Email) return TEXT.emailLength(characters);
  return TEXT.smsLength(characters, Math.max(1, Math.ceil(characters / SMS_PART_LENGTH)));
}
