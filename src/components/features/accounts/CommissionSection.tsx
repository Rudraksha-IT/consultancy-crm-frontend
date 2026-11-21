"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";

import { useLoaded, type Loaded } from "@/components/features/home/useLoaded";
import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { Section } from "@/components/ui/Section";
import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/useToast";
import {
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUSES,
  COMMISSION_TEXT,
  CommissionStatus,
} from "@/constants/commission";
import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import {
  changeCommissionStatus,
  fetchCommission,
  type Commission,
  type CommissionPage,
} from "@/lib/api";
import { formatIntake } from "@/lib/dates";
import { formatNpr } from "@/lib/money";

import { AddCommissionDialog } from "./AddCommissionDialog";

const HEAD = "text-small text-ink-2 bg-fill px-6 py-3 text-left font-semibold";
const CELL = "px-6 py-4 align-middle max-tablet:p-0";

const STATUS_OPTIONS = COMMISSION_STATUSES.map((status) => ({
  value: status,
  label: COMMISSION_STATUS_LABELS[status],
}));

/**
 * Accounts -> Commission (spec 76d): what Universities owe by status, then each Student's
 * Commission with a status picker. Marking it Received records the day it arrived.
 */
export function CommissionSection() {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { showToast } = useToast();
  const load = useCallback(() => fetchCommission(page), [page]);
  const state = useLoaded(load, version);
  const reload = () => {
    setVersion((current) => current + 1);
  };

  async function changeStatus(commission: Commission, status: CommissionStatus): Promise<void> {
    setFailure(null);
    try {
      await changeCommissionStatus(commission.id, status);
      showToast(COMMISSION_TEXT.marked(COMMISSION_STATUS_LABELS[status]));
      reload();
    } catch {
      setFailure(COMMISSION_TEXT.statusFailed);
    }
  }

  const addButton = (
    <Button
      icon="plus"
      onClick={() => {
        setIsAdding(true);
      }}
    >
      {COMMISSION_TEXT.addCommission}
    </Button>
  );

  return (
    <section aria-label={COMMISSION_TEXT.commission} className="grid gap-8">
      <h2 className="text-section-title">{COMMISSION_TEXT.commission}</h2>
      <CommissionBody
        state={state}
        failure={failure}
        addButton={addButton}
        onPage={setPage}
        onStatus={(commission, status) => void changeStatus(commission, status)}
      />
      {isAdding && (
        <AddCommissionDialog
          onClose={() => {
            setIsAdding(false);
          }}
          onAdded={() => {
            setIsAdding(false);
            setPage(1);
            reload();
            showToast(COMMISSION_TEXT.added);
          }}
        />
      )}
    </section>
  );
}

type CommissionBodyProps = {
  state: Loaded<CommissionPage>;
  failure: string | null;
  addButton: ReactNode;
  onPage: (page: number) => void;
  onStatus: (commission: Commission, status: CommissionStatus) => void;
};

function CommissionBody({ state, failure, addButton, onPage, onStatus }: CommissionBodyProps) {
  if (state.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (state.status === "failed") {
    return <Banner tone="problem">{COMMISSION_TEXT.listFailed}</Banner>;
  }
  const { data } = state;
  return (
    <>
      <Tiles page={data} />
      <Section title={COMMISSION_TEXT.byStudent} aside={addButton}>
        {failure !== null && <Banner tone="problem">{failure}</Banner>}
        <Panel>
          <CommissionTable page={data} emptyAction={addButton} onStatus={onStatus} />
          <Pager
            summary={COMMISSION_TEXT.count(data.count)}
            count={data.count}
            page={data.page}
            pageSize={data.pageSize}
            onPage={onPage}
          />
          <PanelFoot>{COMMISSION_TEXT.footnote}</PanelFoot>
        </Panel>
      </Section>
    </>
  );
}

function Tiles({ page }: { page: CommissionPage }) {
  const { totals } = page;
  return (
    <TileGrid>
      <FigureTile
        label={COMMISSION_STATUS_LABELS[CommissionStatus.WaitingForEnrolment]}
        value={formatNpr(totals.waitingForEnrolment)}
        footnote={COMMISSION_TEXT.waitingFootnote}
      />
      <FigureTile
        label={COMMISSION_STATUS_LABELS[CommissionStatus.ClaimSent]}
        value={formatNpr(totals.claimSent)}
        footnote={COMMISSION_TEXT.claimFootnote}
        tone="warn"
      />
      <FigureTile
        label={COMMISSION_STATUS_LABELS[CommissionStatus.Received]}
        value={formatNpr(totals.received)}
        footnote={COMMISSION_TEXT.receivedFootnote}
        tone="good"
      />
    </TileGrid>
  );
}

type CommissionTableProps = {
  page: CommissionPage;
  emptyAction: ReactNode;
  onStatus: (commission: Commission, status: CommissionStatus) => void;
};

/** Student (with the Intake), University, amount and a status picker per Commission. */
function CommissionTable({ page, emptyAction, onStatus }: CommissionTableProps) {
  if (page.rows.length === 0) {
    return <EmptyState action={emptyAction}>{COMMISSION_TEXT.noneYet}</EmptyState>;
  }
  return (
    <table className="text-body w-full border-collapse">
      <thead className="max-tablet:sr-only">
        <tr>
          <th scope="col" className={HEAD}>
            {COMMISSION_TEXT.student}
          </th>
          <th scope="col" className={HEAD}>
            {COMMISSION_TEXT.university}
          </th>
          <th scope="col" className={`${HEAD} tablet:text-right`}>
            {COMMISSION_TEXT.amount}
          </th>
          <th scope="col" className={HEAD}>
            {COMMISSION_TEXT.status}
          </th>
        </tr>
      </thead>
      <tbody className="divide-rule divide-y">
        {page.rows.map((commission) => (
          <CommissionRow key={commission.id} commission={commission} onStatus={onStatus} />
        ))}
      </tbody>
    </table>
  );
}

type CommissionRowProps = Pick<CommissionTableProps, "onStatus"> & { commission: Commission };

function CommissionRow({ commission, onStatus }: CommissionRowProps) {
  const dates = useDates();
  return (
    <tr className="hover:bg-fill max-tablet:grid max-tablet:gap-2 max-tablet:p-5">
      <td className={CELL}>
        <Link
          href={ROUTES.student(commission.student.id)}
          className="text-ink hover:text-accent min-h-control inline-flex items-center font-semibold break-words underline-offset-4 hover:underline"
        >
          {commission.student.name}
        </Link>
        <span className="text-small text-ink-2 block">
          {COMMISSION_TEXT.intake(formatIntake(commission.intake))}
        </span>
      </td>
      <td className={`${CELL} break-words`}>{commission.university.name}</td>
      <td className={`${CELL} tablet:text-right font-semibold whitespace-nowrap tabular-nums`}>
        {formatNpr(commission.amount)}
      </td>
      <td className={`${CELL} tablet:min-w-56`}>
        <SelectField
          label={COMMISSION_TEXT.statusFor(commission.student.name)}
          isLabelHidden
          name={`status-${commission.id}`}
          options={STATUS_OPTIONS}
          value={commission.status}
          onChange={(value) => {
            const status = COMMISSION_STATUSES.find((known) => known === value);
            if (status !== undefined && status !== commission.status) onStatus(commission, status);
          }}
        />
        {commission.receivedOn !== null && (
          <span className="text-small text-good mt-1 block">
            {COMMISSION_TEXT.receivedOn(dates.date(commission.receivedOn))}
          </span>
        )}
      </td>
    </tr>
  );
}
