"use client";

import clsx from "clsx";
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
 * Emails, newest first (issue 04; row redrawn in UI revamp ticket 13). The Student's name leads the
 * row. On computers "Email · when · By whom" sits small beside it, on the same line; on a phone it
 * is under the name, without who sent it. Then the subject line (a past SMS shows its words), cut
 * to two lines on a phone, the files it carried and why it failed; the status is on the right.
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
        <div
          data-row-top
          className="max-phone:block flex min-w-0 flex-wrap items-baseline gap-x-3.5 gap-y-0.5"
        >
          {showsStudent ? <StudentLink student={message.student} /> : <span>{channel}</span>}
          <p data-details className={detailsClasses(showsStudent)}>
            {showsStudent && (
              <>
                <span>{channel}</span>
                <Dot />
              </>
            )}
            <span>{dates.dateTime(message.sentAt)}</span>
            <span className="max-phone:hidden">
              <Dot />
              {TEXT.sentBy(message.sentBy.name)}
            </span>
          </p>
        </div>
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

/** Small and muted beside the name on computers; the line under the name on a phone. */
const DETAILS =
  "text-small text-ink-3 max-phone:text-secondary max-phone:text-ink-2 max-phone:truncate min-w-0 font-normal";

/**
 * On a phone the line is pulled up close under the Student's name (ticket 25): the name is 44
 * tall to tap, which leaves 10 of empty room under its words.
 */
const CLOSE_UNDER_NAME = "max-phone:-mt-2";

function detailsClasses(isUnderName: boolean): string {
  return clsx(DETAILS, isUnderName && CLOSE_UNDER_NAME);
}

/** The dot between two details: drawn, never read out. */
function Dot() {
  return <span aria-hidden="true"> · </span>;
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
  "text-body text-ink max-phone:text-secondary max-phone:line-clamp-2 max-w-prose break-words";

/** An email's subject line in bold; a past SMS's words. */
function MessageWords({ message }: { message: Message }) {
  if (message.channel === "email") {
    // The Student's name leads; the subject under it is lighter (owner, 2026-11-25).
    return <p className={`${WORDS} font-medium`}>{message.subject}</p>;
  }
  return <p className={`${WORDS} whitespace-pre-line`}>{message.body}</p>;
}
