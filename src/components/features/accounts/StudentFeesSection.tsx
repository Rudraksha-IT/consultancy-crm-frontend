"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { FeeDialog } from "@/components/features/fees/FeeDialog";
import { BalanceTiles } from "@/components/features/fees/StudentFees";
import { useLoaded, type Loaded } from "@/components/features/home/useLoaded";
import { PaymentFlow } from "@/components/features/students/profile/ProfileHeader";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { DataCell, DataRow, DataTable } from "@/components/ui/DataTable";
import { OneLine } from "@/components/ui/OneLine";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { useToast } from "@/components/ui/useToast";
import { Loading } from "@/components/ui/Loading";
import { FEE_TEXT } from "@/constants/fees";
import { FEES_BY_TYPE_TEXT } from "@/constants/feesByType";
import { PAYMENT_TEXT } from "@/constants/payments";
import { ROUTES } from "@/constants/routes";
import {
  describeFeeType,
  fetchOwingStudents,
  fetchStudentFees,
  type OwingPage,
  type OwingStudent,
} from "@/lib/api";
import { formatNpr, paidShare } from "@/lib/money";

type Student = OwingStudent["student"];
type Open = { kind: "details" | "add" | "payment"; student: Student } | null;

const HEAD = "text-small text-ink-2 bg-fill px-6 py-3 text-left font-semibold";
const CELL = "px-6 py-4 align-middle max-tablet:p-0";

/**
 * Accounts -> Student fees (spec 76b): what everyone with Fees agreed, has paid and still owes,
 * then each Student who still owes, most first. Details shows one Student's Fees, with Add a fee
 * and Take a payment.
 */
export function StudentFeesSection() {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState<Open>(null);
  const load = useCallback(() => fetchOwingStudents(page), [page]);
  const state = useLoaded(load, version);

  return (
    <section aria-label={FEE_TEXT.studentFees} className="grid gap-8">
      <div className="min-h-control flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-section-title">{FEE_TEXT.studentFees}</h2>
        <Link href={ROUTES.feesByType} className="min-h-control inline-flex items-center">
          {FEES_BY_TYPE_TEXT.byFeeType}
        </Link>
      </div>
      <OwingBody
        state={state}
        onPage={setPage}
        onDetails={(student) => {
          setOpen({ kind: "details", student });
        }}
      />
      <OwingDialog
        open={open}
        onOpen={setOpen}
        onChanged={() => {
          setVersion((current) => current + 1);
        }}
      />
    </section>
  );
}

type OwingBodyProps = {
  state: Loaded<OwingPage>;
  onPage: (page: number) => void;
  onDetails: (student: Student) => void;
};

function OwingBody({ state, onPage, onDetails }: OwingBodyProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") return <Banner tone="problem">{FEE_TEXT.owingFailed}</Banner>;
  const page = state.data;
  return (
    <>
      <Tiles page={page} />
      <Panel>
        <OwingList page={page} onDetails={onDetails} />
        <Pager
          summary={FEE_TEXT.oweMoney(page.count)}
          count={page.count}
          page={page.page}
          pageSize={page.pageSize}
          onPage={onPage}
        />
      </Panel>
    </>
  );
}

type OwingDialogProps = {
  open: Open;
  onOpen: (open: Open) => void;
  /** A Fee was added or a Payment taken: the list and totals load again. */
  onChanged: () => void;
};

/** One Student's fee details, then adding a Fee or taking a payment from there. */
function OwingDialog({ open, onOpen, onChanged }: OwingDialogProps) {
  const { showToast } = useToast();
  if (open === null) return null;
  const close = () => {
    onOpen(null);
  };
  const { student } = open;
  if (open.kind === "payment") {
    return <PaymentFlow profile={student} onClose={close} onRecorded={onChanged} />;
  }
  if (open.kind === "add") {
    return (
      <FeeDialog
        student={student}
        fee={null}
        onClose={close}
        onSaved={(_, toast) => {
          showToast(toast);
          close();
          onChanged();
        }}
      />
    );
  }
  return (
    <FeeDetailsDialog
      student={student}
      onClose={close}
      onAdd={() => {
        onOpen({ kind: "add", student });
      }}
      onPayment={() => {
        onOpen({ kind: "payment", student });
      }}
    />
  );
}

function Tiles({ page }: { page: OwingPage }) {
  const { totals } = page;
  return (
    <TileGrid>
      <FigureTile
        label={FEE_TEXT.agreedFees}
        value={formatNpr(totals.agreed)}
        footnote={FEE_TEXT.studentsCount(totals.students)}
      />
      <FigureTile label={FEE_TEXT.collected} value={formatNpr(totals.collected)} tone="good" />
      <FigureTile
        label={FEE_TEXT.stillToCollect}
        value={formatNpr(totals.stillToCollect)}
        footnote={FEE_TEXT.oweMoney(totals.owing)}
        {...(totals.stillToCollect > 0 && { tone: "warn" as const })}
      />
    </TileGrid>
  );
}

type OwingListProps = { page: OwingPage; onDetails: (student: Student) => void };

/**
 * Each Student who owes: a paid-so-far bar, agreed, paid and still to pay, and Details. On a phone
 * a row is the name, the bar under it, still to pay and Details.
 */
function OwingList({ page, onDetails }: OwingListProps) {
  if (page.rows.length === 0) return <EmptyState>{FEE_TEXT.everyonePaid}</EmptyState>;
  return (
    <DataTable phone="list" stacksBelowTablet>
      <thead className="max-tablet:sr-only">
        <tr>
          <th scope="col" className={HEAD}>
            {FEE_TEXT.student}
          </th>
          <th scope="col" className={`${HEAD} tablet:text-right`}>
            {FEE_TEXT.agreed}
          </th>
          <th scope="col" className={`${HEAD} tablet:text-right`}>
            {FEE_TEXT.paid}
          </th>
          <th scope="col" className={`${HEAD} tablet:text-right`}>
            {FEE_TEXT.stillToPay}
          </th>
          <th scope="col" className={HEAD}>
            <span className="sr-only">{FEE_TEXT.details}</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-rule divide-y">
        {page.rows.map((row) => (
          <DataRow
            key={row.student.id}
            className="hover:bg-fill max-tablet:grid max-tablet:gap-2 max-tablet:p-5"
          >
            <DataCell part="title" shrinks className={CELL}>
              <Link
                href={ROUTES.student(row.student.id)}
                className="text-ink hover:text-accent min-h-control inline-flex max-w-full items-center font-semibold underline-offset-4 hover:underline"
              >
                <OneLine>{row.student.name}</OneLine>
              </Link>
              <ProgressBar
                label={FEE_TEXT.paidShareOf(row.student.name)}
                value={paidShare(row.fees, row.paid)}
              />
            </DataCell>
            <Amount label={FEE_TEXT.agreed} amount={row.fees} />
            <Amount label={FEE_TEXT.paid} amount={row.paid} />
            <DataCell
              part="fact"
              className={`${CELL} tablet:text-right text-warn font-semibold tabular-nums`}
            >
              <span className="tablet:sr-only text-ink-2 font-normal" data-cell-label="">
                {FEE_TEXT.stillToPay}{" "}
              </span>
              {formatNpr(row.stillToPay)}
            </DataCell>
            <DataCell part="action" className={`${CELL} tablet:text-right`}>
              <Button
                onClick={() => {
                  onDetails(row.student);
                }}
              >
                <span aria-hidden="true">{FEE_TEXT.details}</span>
                <span className="sr-only">{FEE_TEXT.detailsFor(row.student.name)}</span>
              </Button>
            </DataCell>
          </DataRow>
        ))}
      </tbody>
    </DataTable>
  );
}

function Amount({ label, amount }: { label: string; amount: number }) {
  return (
    <DataCell label={label} className={`${CELL} tablet:text-right whitespace-nowrap tabular-nums`}>
      {formatNpr(amount)}
    </DataCell>
  );
}

type FeeDetailsDialogProps = {
  student: Student;
  onClose: () => void;
  onAdd: () => void;
  onPayment: () => void;
};

/** One Student's agreed fees, paid and still to pay, with Add a fee and Take a payment. */
function FeeDetailsDialog({ student, onClose, onAdd, onPayment }: FeeDetailsDialogProps) {
  const load = useCallback(() => fetchStudentFees(student.id), [student.id]);
  const state = useLoaded(load, 0);
  return (
    <Dialog
      isOpen
      isWide
      title={FEE_TEXT.feesFor(student.name)}
      onClose={onClose}
      footer={
        <>
          <div className="mr-auto">
            <ButtonLink href={ROUTES.student(student.id)} variant="ghost">
              {FEE_TEXT.openProfile}
            </ButtonLink>
          </div>
          <Button icon="plus" onClick={onAdd}>
            {FEE_TEXT.addAFee}
          </Button>
          <Button variant="primary" icon="receipt" onClick={onPayment}>
            {PAYMENT_TEXT.takeAPayment}
          </Button>
        </>
      }
    >
      {state.status === "loading" && <Loading />}
      {state.status === "failed" && <Banner tone="problem">{FEE_TEXT.feesFailed}</Banner>}
      {state.status === "loaded" && (
        <div className="grid gap-6">
          <BalanceTiles fees={state.data} />
          <Panel>
            <RowList label={FEE_TEXT.whatTheyAgreed}>
              {state.data.fees.map((fee) => (
                <RowItem
                  key={fee.id}
                  title={
                    <span className="wrap-anywhere">{describeFeeType(fee.feeType, fee.note)}</span>
                  }
                  right={
                    <span className="font-semibold whitespace-nowrap tabular-nums">
                      {formatNpr(fee.amount)}
                    </span>
                  }
                />
              ))}
            </RowList>
          </Panel>
        </div>
      )}
    </Dialog>
  );
}
