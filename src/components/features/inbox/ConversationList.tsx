"use client";

import type { RecordId } from "@/lib/recordId";
import clsx from "clsx";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Avatar } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { INBOX_TEXT } from "@/constants/inbox";
import { MESSAGES } from "@/constants/messages";
import type { InboxConversation } from "@/lib/api";
import { localDayIso, localTime, todayIso } from "@/lib/dates";

import type { ConversationsState } from "./useInboxData";

type ConversationListProps = {
  state: ConversationsState;
  openId: RecordId | null;
  onOpen: (personId: RecordId) => void;
};

/** My conversations, newest first: who, the start of the last message, when, and if unread. */
export function ConversationList({ state, openId, onOpen }: ConversationListProps) {
  if (state.status === "loading") return <p className="text-ink-2 px-6 py-5">{MESSAGES.loading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{INBOX_TEXT.loadFailed}</Banner>;
  if (state.conversations.length === 0)
    return <EmptyState>{INBOX_TEXT.noConversations}</EmptyState>;
  return (
    <ul
      aria-label={INBOX_TEXT.conversationsLabel}
      className="wide:max-h-conversations-list wide:overflow-y-auto"
    >
      {state.conversations.map((conversation) => (
        <li key={conversation.person.id} className="border-rule border-b">
          <ConversationRow
            conversation={conversation}
            isOpen={conversation.person.id === openId}
            onOpen={onOpen}
          />
        </li>
      ))}
    </ul>
  );
}

type ConversationRowProps = {
  conversation: InboxConversation;
  isOpen: boolean;
  onOpen: (personId: RecordId) => void;
};

function ConversationRow({ conversation, isOpen, onOpen }: ConversationRowProps) {
  const { person, last, unread } = conversation;
  return (
    <button
      type="button"
      aria-current={isOpen ? "true" : undefined}
      onClick={() => {
        onOpen(person.id);
      }}
      className={clsx(
        "hover:bg-fill relative grid min-h-18 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left",
        isOpen &&
          "bg-fill before:w-active-line before:bg-accent before:absolute before:inset-y-0 before:left-0",
      )}
    >
      <Avatar name={person.name} />
      <span className="grid min-w-0">
        <PersonName name={person.name} hasLeft={person.hasLeft} />
        <LastLine text={last.text} isFromMe={last.fromMe} isUnread={unread} />
      </span>
      <span className="text-small text-ink-2 grid justify-items-end gap-1.5">
        <WhenSent moment={last.sentAt} />
        {unread && <UnreadMark />}
      </span>
    </button>
  );
}

function PersonName({ name, hasLeft }: { name: string; hasLeft: boolean }) {
  return (
    <span className="font-semibold">
      {name}
      {hasLeft && <span className="text-ink-2 font-normal"> {INBOX_TEXT.hasLeft}</span>}
    </span>
  );
}

/** The start of the last message; "You: " when I wrote it; bold while unread. */
function LastLine(props: { text: string; isFromMe: boolean; isUnread: boolean }) {
  return (
    <span
      className={clsx(
        "text-secondary truncate",
        props.isUnread ? "text-ink font-semibold" : "text-ink-2",
      )}
    >
      {props.isFromMe && INBOX_TEXT.you}
      {props.text}
    </span>
  );
}

/** A dot with the word, so the colour never stands alone. */
function UnreadMark() {
  return (
    <span className="text-accent flex items-center gap-1.5 font-semibold">
      <span aria-hidden="true" className="bg-accent rounded-pill size-dot" />
      {INBOX_TEXT.unread}
    </span>
  );
}

/** Today's messages show their time; older ones their day, in the office's calendar. */
function WhenSent({ moment }: { moment: string }) {
  const dates = useDates();
  const day = localDayIso(moment);
  if (day === null) return null;
  return <span>{day === todayIso() ? localTime(moment) : dates.date(day)}</span>;
}
