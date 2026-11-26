"use client";

import type { RecordId } from "@/lib/recordId";
import { useEffect, useRef } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Avatar } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { Loading } from "@/components/ui/Loading";
import { INBOX_TEXT } from "@/constants/inbox";
import type { InboxMessage, InboxPerson, InboxThread } from "@/lib/api";

import { ComposeForm } from "./ComposeForm";
import { useThread } from "./useInboxData";

type ConversationPaneProps = {
  personId: RecordId;
  /** The newest message the check knows of: when it changes, the conversation loads again. */
  latest: RecordId | null;
  onBack: () => void;
  /** Called after the conversation was read (opening marks it read) or written in. */
  onChanged: () => void;
};

/** One conversation: who it is with, the messages oldest first, and the box to write in. */
export function ConversationPane({ personId, latest, onBack, onChanged }: ConversationPaneProps) {
  const [state, replace] = useThread(personId, String(latest), onChanged);

  if (state.status === "loading") return <Loading />;
  if (state.status !== "loaded") {
    return (
      <Unavailable
        message={state.status === "notFound" ? INBOX_TEXT.notFound : INBOX_TEXT.conversationFailed}
        onBack={onBack}
      />
    );
  }
  return (
    <OpenThread
      thread={state.thread}
      onBack={onBack}
      onSent={(message) => {
        replace({ ...state.thread, messages: [...state.thread.messages, message] });
        onChanged();
      }}
    />
  );
}

function Unavailable({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="grid content-start">
      <BackButton onBack={onBack} />
      <Banner tone="problem">{message}</Banner>
    </div>
  );
}

type OpenThreadProps = {
  thread: InboxThread;
  onBack: () => void;
  onSent: (message: InboxMessage) => void;
};

function OpenThread({ thread, onBack, onSent }: OpenThreadProps) {
  return (
    <div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto]">
      <ThreadHead person={thread.person} onBack={onBack} />
      <Messages thread={thread} />
      {thread.canWrite ? (
        <ComposeForm person={thread.person} onSent={onSent} />
      ) : (
        <PanelFoot>{INBOX_TEXT.hasLeftFoot(thread.person.name)}</PanelFoot>
      )}
    </div>
  );
}

/** Shown beside the list until a conversation is picked. */
export function NoConversationOpen() {
  return (
    <div className="grid place-items-center">
      <EmptyState>{INBOX_TEXT.pickConversation}</EmptyState>
    </div>
  );
}

/** Back to the list: only needed at 1024px and below, where the list is hidden. */
function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <span className="wide:hidden px-3 pt-3">
      <IconButton icon="left" label={INBOX_TEXT.backToConversations} onClick={onBack} />
    </span>
  );
}

function ThreadHead({ person, onBack }: { person: InboxPerson; onBack: () => void }) {
  return (
    <div className="border-rule flex min-w-0 items-center gap-3 border-b px-5 py-3.5">
      <span className="wide:hidden -ml-2">
        <IconButton icon="left" label={INBOX_TEXT.backToConversations} onClick={onBack} />
      </span>
      <Avatar name={person.name} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{person.name}</p>
        {person.jobTitle !== "" && (
          <p className="text-small text-ink-2 truncate">{person.jobTitle}</p>
        )}
      </div>
    </div>
  );
}

/** How close to the end of the messages still counts as "at the newest". */
const AT_NEWEST_PX = 8;

/**
 * The messages, oldest first, scrolled to the newest whenever one arrives. They scroll inside
 * the Inbox's sheet; when the room for them changes (the window is resized) the newest stays in
 * view, unless the person has scrolled up to read older ones.
 */
function Messages({ thread }: { thread: InboxThread }) {
  const ref = useRef<HTMLDivElement>(null);
  const isAtNewest = useRef(true);
  const count = thread.messages.length;

  useEffect(() => {
    const box = ref.current;
    if (box !== null) box.scrollTop = box.scrollHeight;
    isAtNewest.current = true;
  }, [count]);

  useEffect(() => {
    const box = ref.current;
    if (box === null || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      if (isAtNewest.current) box.scrollTop = box.scrollHeight;
    });
    observer.observe(box);
    return () => {
      observer.disconnect();
    };
  }, []);

  function handleScroll(): void {
    const box = ref.current;
    if (box === null) return;
    isAtNewest.current = box.scrollHeight - box.scrollTop - box.clientHeight <= AT_NEWEST_PX;
  }

  return (
    <div
      ref={ref}
      role="log"
      onScroll={handleScroll}
      aria-label={`Conversation with ${thread.person.name}`}
      className="grid min-h-0 content-start gap-3 overflow-y-auto overscroll-contain p-5"
    >
      {thread.hasMore && (
        <p className="text-small text-ink-2 text-center">{INBOX_TEXT.olderLeftOut}</p>
      )}
      {count === 0 ? (
        <p className="text-ink-2 text-center">
          {INBOX_TEXT.sayHello(firstName(thread.person.name))}
        </p>
      ) : (
        thread.messages.map((message) => (
          <Bubble key={message.id} message={message} name={thread.person.name} />
        ))
      )}
    </div>
  );
}

function Bubble({ message, name }: { message: InboxMessage; name: string }) {
  const dates = useDates();
  return (
    <article
      className={
        message.fromMe
          ? "bg-tint rounded-panel tablet:max-w-3/4 max-w-11/12 justify-self-end px-3.5 py-2.5"
          : "bg-fill rounded-panel tablet:max-w-3/4 max-w-11/12 justify-self-start px-3.5 py-2.5"
      }
    >
      {/* Who wrote it, for screen readers; the side of the panel says it on screen. */}
      <span className="sr-only">{message.fromMe ? INBOX_TEXT.you : `${name}: `}</span>
      <p className="wrap-anywhere whitespace-pre-wrap">{message.text}</p>
      <span className="text-small text-ink-2 mt-1 block">{dates.dateTime(message.sentAt)}</span>
    </article>
  );
}

/** The first word of a name, e.g. "Nabin" for "Nabin Adhikari". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
