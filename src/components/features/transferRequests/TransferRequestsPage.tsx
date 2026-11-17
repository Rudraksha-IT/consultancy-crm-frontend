"use client";

import { useState } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { RowList } from "@/components/ui/RowList";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { TRANSFER_TEXT, TransferBox } from "@/constants/transferRequests";

import { TransferRequestRow } from "./TransferRequestRow";
import { useTransferRequestPage, type TransferRequestPageState } from "./useTransferRequestPage";

/**
 * The boxes a Role sees: what waits for my answer; what I sent (Front Desk never asks); and
 * everyone's, for Admins (spec 44c, 44d).
 */
function boxesFor(role: Role): TransferBox[] {
  return [
    TransferBox.WaitingForMe,
    ...(role === Role.FrontDesk ? [] : [TransferBox.Sent]),
    ...(role === Role.Admin ? [TransferBox.All] : []),
  ];
}

/** Transfer requests: waiting for me, sent by me and everyone's (spec 44c, 44d). */
export function TransferRequestsPage() {
  const { staff } = useCurrentStaff();
  if (staff.role === Role.Teacher) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return <Boxes role={staff.role} />;
}

function Boxes({ role }: { role: Role }) {
  const [box, setBox] = useState<TransferBox>(TransferBox.WaitingForMe);
  const [page, setPage] = useState(1);
  // Bumped after a request is answered or cancelled, so the box loads again.
  const [version, setVersion] = useState(0);
  const state = useTransferRequestPage(box, page, version);
  const waiting = state.status === "loaded" ? state.page.waitingForMeCount : 0;
  const options = boxesFor(role).map((value) => ({
    value,
    label: TRANSFER_TEXT.boxes[value],
    ...(value === TransferBox.WaitingForMe && { count: waiting }),
  }));

  return (
    <div className="grid gap-8">
      <PageHeader title={TRANSFER_TEXT.title} subtitle={TRANSFER_TEXT.intro} />
      <div className="grid gap-4">
        <SegmentedControl
          label={TRANSFER_TEXT.boxesLabel}
          options={options}
          value={box}
          onChange={(chosen) => {
            setBox(chosen);
            setPage(1);
          }}
        />
        <Panel>
          <BoxBody
            state={state}
            box={box}
            onPage={setPage}
            onChanged={() => {
              setVersion((current) => current + 1);
            }}
          />
        </Panel>
      </div>
    </div>
  );
}

type BoxBodyProps = {
  state: TransferRequestPageState;
  box: TransferBox;
  onPage: (page: number) => void;
  onChanged: () => void;
};

function BoxBody({ state, box, onPage, onChanged }: BoxBodyProps) {
  if (state.status === "loading") return <p className="text-ink-2 px-6 py-5">{MESSAGES.loading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{TRANSFER_TEXT.loadFailed}</Banner>;
  const { page } = state;
  if (page.requests.length === 0) return <EmptyState>{TRANSFER_TEXT.empty[box]}</EmptyState>;
  return (
    <>
      <RowList label={TRANSFER_TEXT.boxes[box]}>
        {page.requests.map((request) => (
          <TransferRequestRow key={request.id} request={request} onChanged={onChanged} />
        ))}
      </RowList>
      {page.count > page.pageSize && (
        <Pager
          summary={TRANSFER_TEXT.boxes[box]}
          count={page.count}
          page={page.page}
          pageSize={page.pageSize}
          onPage={onPage}
        />
      )}
    </>
  );
}
