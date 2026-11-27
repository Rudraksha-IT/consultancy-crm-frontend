"use client";

import type { RecordId } from "@/lib/recordId";
import clsx from "clsx";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Avatar } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { INBOX_TEXT } from "@/constants/inbox";
import type { InboxConversation } from "@/lib/api";
import { localDayIso, localTime, todayIso } from "@/lib/dates";

import type { ConversationsState } from "./useInboxData";

type ConversationListProps = {
  state: ConversationsState;
  openId: RecordId | null;
  onOpen: (personId: RecordId) => void;
};

/**
 * My conversations, newest first: who, the start of the last message under the name, when, and
 * for an unread one bold words and a dot (owner, 2026-11-27; the last message was left out in UI
 * revamp 14). The list scrolls inside the Inbox's sheet.
 */
export function ConversationList({ state, openId, onOpen }: ConversationListProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") {
    return (
      <div className="px-gutter py-5">
        <Banner tone="problem">{INBOX_TEXT.loadFailed}</Banner>
      </div>
    );
  }
  if (state.conversations.length === 0)
    return <EmptyState>{INBOX_TEXT.noConversations}</EmptyState>;
  return (
    <ul aria-label={INBOX_TEXT.conversationsLabel}>
      {state.conversations.map((conversation) => (
        <li key={conversation.person.id} data-row="" className="border-rule border-b">
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
        "hover:bg-fill px-gutter relative grid min-h-17 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left",
        isOpen &&
          "bg-fill before:w-active-line before:bg-accent before:absolute before:inset-y-0 before:left-0",
      )}
    >
      <Avatar name={person.name} size="sm" />
      <span className="grid min-w-0 gap-0.5">
        <PersonName name={person.name} hasLeft={person.hasLeft} isUnread={unread} />
        <LastMessage last={last} isUnread={unread} />
      </span>
      <span className="text-small text-ink-3 grid justify-items-end gap-1.5 self-start pt-0.5">
        <WhenSent moment={last.sentAt} />
        {unread && <UnreadMark />}
      </span>
    </button>
  );
}

type PersonNameProps = { name: string; hasLeft: boolean; isUnread: boolean };

/** The name, in bold while something from them is unread. */
function PersonName({ name, hasLeft, isUnread }: PersonNameProps) {
  return (
    <span
      title={name}
      className={clsx("text-ink min-w-0 truncate", isUnread ? "font-semibold" : "font-medium")}
    >
      {name}
      {hasLeft && <span className="text-ink-2 font-normal"> {INBOX_TEXT.hasLeft}</span>}
    </span>
  );
}

type LastMessageProps = { last: InboxConversation["last"]; isUnread: boolean };

/**
 * The start of the last message, on one line under the name: mine starts with "You: ". Plain
 * text, with its line breaks drawn as spaces. Full ink while it is unread.
 */
function LastMessage({ last, isUnread }: LastMessageProps) {
  const words = last.text.replace(/\s+/g, " ").trim();
  return (
    <span
      className={clsx(
        "text-small min-w-0 truncate",
        isUnread ? "text-ink font-medium" : "text-ink-2",
      )}
    >
      {last.fromMe ? `${INBOX_TEXT.you}${words}` : words}
    </span>
  );
}

/** A dot, with its word for screen readers, so the colour never stands alone. */
function UnreadMark() {
  return (
    <span className="flex items-center">
      <span aria-hidden="true" className="bg-accent rounded-pill size-unread-dot" />
      <span className="sr-only">{INBOX_TEXT.unread}</span>
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
