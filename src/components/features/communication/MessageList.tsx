"use client";

import Link from "next/link";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Chip } from "@/components/ui/Chip";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { CHANNEL_LABELS, COMMUNICATION_TEXT as TEXT } from "@/constants/communication";
import { ROUTES } from "@/constants/routes";
import type { Message } from "@/lib/api";

type MessageListProps = {
  label: string;
  messages: readonly Message[];
  /** On the Messages page each row names its Student, linked to their page. */
  showsStudent: boolean;
};

/**
 * Messages, newest first: what was sent, when, by whom, and whether it went (spec 91). On a phone
 * a row is the name and status, the channel and time, and the message cut to two lines.
 */
export function MessageList({ label, messages, showsStudent }: MessageListProps) {
  return (
    <RowList label={label}>
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} showsStudent={showsStudent} />
      ))}
    </RowList>
  );
}

function MessageRow({ message, showsStudent }: { message: Message; showsStudent: boolean }) {
  const dates = useDates();
  const channel = CHANNEL_LABELS[message.channel];
  return (
    <RowItem
      title={
        showsStudent ? (
          <Link
            href={ROUTES.student(message.student.id)}
            className="text-accent min-h-control inline-flex items-center hover:underline"
          >
            {message.student.name}
          </Link>
        ) : (
          channel
        )
      }
      meta={
        <>
          {showsStudent && <span>{channel}</span>}
          <span>{dates.dateTime(message.sentAt)}</span>
          <span className="max-phone:hidden">{TEXT.sentBy(message.sentBy.name)}</span>
        </>
      }
      keepsRightBesideOnPhone
      right={
        message.status === "sent" ? (
          <Chip tone="good">{TEXT.sent}</Chip>
        ) : (
          <Chip tone="bad">{TEXT.failed}</Chip>
        )
      }
    >
      <p className="text-body text-ink max-phone:text-secondary max-phone:line-clamp-2 mt-2 max-w-prose break-words whitespace-pre-line">
        {message.body}
      </p>
      {message.error !== "" && <p className="text-secondary text-bad mt-1">{message.error}</p>}
    </RowItem>
  );
}
