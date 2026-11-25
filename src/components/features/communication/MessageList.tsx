"use client";

import Link from "next/link";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { CHANNEL_LABELS, COMMUNICATION_TEXT as TEXT } from "@/constants/communication";
import { ROUTES } from "@/constants/routes";
import type { Message } from "@/lib/api";

type MessageListProps = {
  label: string;
  messages: readonly Message[];
  /** On the Email page each row names its Student, linked to their page. */
  showsStudent: boolean;
};

/**
 * Emails, newest first: the subject line (a past SMS shows its words), when, by whom, and whether
 * it went (issue 04). On a phone a row is the name and status, the kind and time, and the subject
 * line cut to two lines.
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
      title={showsStudent ? <StudentLink student={message.student} /> : channel}
      meta={
        <>
          {showsStudent && <span>{channel}</span>}
          <span>{dates.dateTime(message.sentAt)}</span>
          <span className="max-phone:hidden">{TEXT.sentBy(message.sentBy.name)}</span>
        </>
      }
      keepsRightBesideOnPhone
      right={<StatusChip message={message} />}
    >
      <MessageWords message={message} />
      {message.attachments.length > 0 && (
        <p className="text-small text-ink-2 mt-1 flex min-w-0 items-start gap-1.5 break-words">
          <Icon name="clip" size="sm" />
          <span className="min-w-0">{TEXT.attachmentsOf(message.attachments.join(", "))}</span>
        </p>
      )}
      {message.error !== "" && <p className="text-secondary text-bad mt-1">{message.error}</p>}
    </RowItem>
  );
}

function StudentLink({ student }: { student: Message["student"] }) {
  return (
    <Link
      href={ROUTES.student(student.id)}
      className="text-email-name text-ink hover:text-accent min-h-control inline-flex items-center hover:underline"
    >
      {student.name}
    </Link>
  );
}

function StatusChip({ message }: { message: Message }) {
  return message.status === "sent" ? (
    <Chip tone="good">{TEXT.sent}</Chip>
  ) : (
    <Chip tone="bad">{TEXT.failed}</Chip>
  );
}

const WORDS =
  "text-body text-ink max-phone:text-secondary max-phone:line-clamp-2 mt-2 max-w-prose break-words";

/** An email's subject line in bold; a past SMS's words. */
function MessageWords({ message }: { message: Message }) {
  if (message.channel === "email") {
    // The Student's name leads; the subject under it is lighter (owner, 2026-11-25).
    return <p className={`${WORDS} font-medium`}>{message.subject}</p>;
  }
  return <p className={`${WORDS} whitespace-pre-line`}>{message.body}</p>;
}
