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
import { Loading } from "@/components/ui/Loading";
import { COMMUNICATION_TEXT as TEXT } from "@/constants/communication";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { fetchMessages } from "@/lib/api";

import { canMessageStudents } from "./canMessage";
import { ContactEmailBanner } from "./ContactEmailBanner";
import { EmailFlow } from "./EmailFlow";
import { MessageList } from "./MessageList";
import { useMessagePage } from "./useMessagePage";

/**
 * Email (route /messages): every email sent to Students, newest first, sent or failed, with past
 * SMS still readable; Email a Student and Email many Students (issue 04). For Admins, Counsellors
 * and Front Desk while the Communication Module is on.
 */
export function MessagesPage() {
  if (!canMessageStudents(useCurrentStaff())) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return <Emails />;
}

function Emails() {
  const { consultancy } = useCurrentStaff();
  const [writing, setWriting] = useState<"one" | "many" | null>(null);
  const [version, setVersion] = useState(0);
  const contact = consultancy.officeDetails.contactEmail;
  return (
    <div className="grid gap-8">
      <PageHeader
        title={TEXT.emailPage}
        subtitle={TEXT.emailIntro(contact === "" ? null : contact)}
        actions={
          <>
            <Button
              icon="message"
              onClick={() => {
                setWriting("one");
              }}
            >
              {TEXT.emailAStudent}
            </Button>
            <Button
              variant="primary"
              icon="send"
              onClick={() => {
                setWriting("many");
              }}
            >
              {TEXT.emailManyStudents}
            </Button>
          </>
        }
      />
      <ContactEmailBanner />
      <AllEmails key={version} />
      {writing !== null && (
        <EmailFlow
          mode={writing}
          onClose={() => {
            setWriting(null);
          }}
          onSent={() => {
            setVersion((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}

function AllEmails() {
  const [page, setPage] = useState(1);
  const state = useMessagePage(fetchMessages, page);

  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") return <Banner tone="problem">{TEXT.listFailed}</Banner>;
  const { rows, count, pageSize } = state.page;
  return (
    <Panel>
      {rows.length === 0 ? (
        <EmptyState>{TEXT.noneSent}</EmptyState>
      ) : (
        <>
          <MessageList label={TEXT.emailPage} messages={rows} showsStudent />
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
