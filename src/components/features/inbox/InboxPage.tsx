"use client";

import clsx from "clsx";
import { useCallback, useState } from "react";

import { useInboxCheck } from "@/components/features/shell/inboxCheck";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePhoneWidth } from "@/components/ui/usePhoneWidth";
import { Panel } from "@/components/ui/Panel";
import { INBOX_TEXT } from "@/constants/inbox";

import { ConversationList } from "./ConversationList";
import { ConversationPane, NoConversationOpen } from "./ConversationPane";
import { NewMessageDialog } from "./NewMessageDialog";
import { useConversations } from "./useInboxData";

type InboxPageProps = {
  /** The person whose conversation is open, or null for none. */
  openId: number | null;
  onOpen: (personId: number | null) => void;
};

/**
 * The Inbox (spec 128-130): my conversations, newest first, beside the open one. Above 1024px
 * both show; at 1024 and below the list or the open conversation fills the panel. A Platform
 * Admin in Support Access only learns that conversations are private.
 */
export function InboxPage({ openId, onOpen }: InboxPageProps) {
  const { supportAccess } = useCurrentStaff();
  if (supportAccess !== null) {
    return <PageHeader title={INBOX_TEXT.title} subtitle={INBOX_TEXT.platformAdmin} />;
  }
  return <Inbox openId={openId} onOpen={onOpen} />;
}

function Inbox({ openId, onOpen }: InboxPageProps) {
  const { latest, refresh } = useInboxCheck();
  // Bumped after a conversation was read or written in, so the list shows it.
  const [listBump, setListBump] = useState(0);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const conversations = useConversations(`${String(latest)}-${String(listBump)}`);
  const isOpen = openId !== null;

  const afterChange = useCallback(() => {
    refresh();
    setListBump((current) => current + 1);
  }, [refresh]);

  return (
    <div className="grid gap-6">
      <InboxHeader
        isConversationOpen={isOpen}
        onNew={() => {
          setIsNewOpen(true);
        }}
      />
      <Panel>
        <div className="min-h-inbox wide:grid-cols-[minmax(0,var(--spacing-conversations))_minmax(0,1fr)] grid">
          <div className={clsx("wide:border-r border-rule min-w-0", isOpen && "max-wide:hidden")}>
            <ConversationList state={conversations} openId={openId} onOpen={onOpen} />
          </div>
          <div className={clsx("grid min-w-0", !isOpen && "max-wide:hidden")}>
            {openId === null ? (
              <NoConversationOpen />
            ) : (
              <ConversationPane
                key={openId}
                personId={openId}
                latest={latest}
                onBack={() => {
                  onOpen(null);
                }}
                onChanged={afterChange}
              />
            )}
          </div>
        </div>
      </Panel>
      <p className="text-small text-ink-2">{INBOX_TEXT.footnote}</p>
      <NewMessageDialog
        isOpen={isNewOpen}
        onClose={() => {
          setIsNewOpen(false);
        }}
        onChosen={(personId) => {
          setIsNewOpen(false);
          onOpen(personId);
        }}
      />
    </div>
  );
}

type InboxHeaderProps = { isConversationOpen: boolean; onNew: () => void };

/**
 * The title, the line under it and "New message". On a phone an open conversation is the whole
 * page, so all three give way to it (the title stays for screen readers); they come back on the
 * list.
 */
function InboxHeader({ isConversationOpen, onNew }: InboxHeaderProps) {
  const isPhone = usePhoneWidth();
  if (isConversationOpen && isPhone) return <h1 className="sr-only">{INBOX_TEXT.title}</h1>;
  return (
    <PageHeader
      title={INBOX_TEXT.title}
      subtitle={INBOX_TEXT.intro}
      actions={
        <Button variant="primary" icon="plus" onClick={onNew}>
          {INBOX_TEXT.newMessage}
        </Button>
      }
    />
  );
}
