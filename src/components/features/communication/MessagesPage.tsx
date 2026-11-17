"use client";

import { useState } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { COMMUNICATION_TEXT as TEXT } from "@/constants/communication";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { fetchMessages } from "@/lib/api";

import { MessageList } from "./MessageList";
import { NewBulkMessageDialog } from "./NewBulkMessageDialog";
import { useMessagePage } from "./useMessagePage";

/**
 * Email & SMS (route /messages): every email and SMS sent to Students, newest first, sent or failed (spec 91), and New
 * Send email or SMS to many Students (spec 90). For Admins, counsellors and Front Desk while the
 * Communication Module is on.
 */
export function MessagesPage() {
  const { staff, modules } = useCurrentStaff();
  if (staff.role === Role.Teacher || !modules.includes(Module.Communication)) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return <Messages />;
}

function Messages() {
  const [isWriting, setIsWriting] = useState(false);
  const [version, setVersion] = useState(0);
  const newMessage = (
    <Button
      variant="primary"
      icon="send"
      onClick={() => {
        setIsWriting(true);
      }}
    >
      {TEXT.sendEmailOrSms}
    </Button>
  );
  return (
    <div className="grid gap-8">
      <PageHeader
        title={TEXT.emailAndSmsPage}
        subtitle={TEXT.emailAndSmsIntro}
        actions={newMessage}
      />
      <AllMessages key={version} />
      {isWriting && (
        <NewBulkMessageDialog
          onClose={() => {
            setIsWriting(false);
          }}
          onSent={() => {
            setVersion((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}

function AllMessages() {
  const [page, setPage] = useState(1);
  const state = useMessagePage(fetchMessages, page);

  if (state.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{TEXT.listFailed}</Banner>;
  const { rows, count, pageSize } = state.page;
  return (
    <Panel>
      {rows.length === 0 ? (
        <EmptyState>{TEXT.noneSent}</EmptyState>
      ) : (
        <>
          <MessageList label={TEXT.emailAndSmsPage} messages={rows} showsStudent />
          <Pager
            summary={TEXT.sentCount(count)}
            count={count}
            page={state.page.page}
            pageSize={pageSize}
            onPage={setPage}
          />
        </>
      )}
    </Panel>
  );
}
