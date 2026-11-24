"use client";

import type { RecordId } from "@/lib/recordId";
import { useCallback, useState } from "react";

import { useLoaded } from "@/components/features/home/useLoaded";
import { StudentPayments } from "@/components/features/payments/StudentPayments";
import { PaymentFlow } from "@/components/features/students/profile/ProfileHeader";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { useToast } from "@/components/ui/useToast";
import { Loading } from "@/components/ui/Loading";
import { FEE_TEXT } from "@/constants/fees";
import { PAYMENT_TEXT } from "@/constants/payments";
import { describeFeeType, fetchStudentFees, type Fee, type StudentFees as Fees } from "@/lib/api";
import { formatNpr } from "@/lib/money";

import { FeeDialog } from "./FeeDialog";

type Student = { id: RecordId; name: string };

type StudentFeesProps = {
  student: Student;
  /** The Student's counsellor or an Admin: may add, change and delete Fees (spec 76a). */
  canChangeFees: boolean;
  /** May take a payment here (it is also in the profile header). */
  canRecordPayment: boolean;
  /** A change History records was made: a Fee or a Payment. */
  onChanged: () => void;
};

type Open = { kind: "fee"; fee: Fee | null } | { kind: "payment" } | null;

/**
 * A Student's Fees tab (spec 76a-76b): for Admins, what they agreed to pay, have paid and still
 * owe, and the Payments received; for their counsellor, only the Fees (spec 73).
 */
export function StudentFees(props: StudentFeesProps) {
  const [version, setVersion] = useState(0);
  const load = useCallback(() => fetchStudentFees(props.student.id), [props.student.id]);
  const state = useLoaded(load, version);
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") return <Banner tone="problem">{FEE_TEXT.feesFailed}</Banner>;
  return (
    <LoadedFees
      {...props}
      fees={state.data}
      version={version}
      onReload={() => {
        setVersion((current) => current + 1);
        props.onChanged();
      }}
    />
  );
}

type LoadedFeesProps = StudentFeesProps & {
  fees: Fees;
  /** Bumped after a change, so the Payments list remounts too. */
  version: number;
  onReload: () => void;
};

function LoadedFees({ student, fees, canChangeFees, canRecordPayment, ...rest }: LoadedFeesProps) {
  const [open, setOpen] = useState<Open>(null);
  const seesBalance = fees.balance !== null;
  return (
    <div className="grid gap-8">
      {seesBalance && <BalanceTiles fees={fees} />}
      <AgreedFees
        fees={fees}
        canChangeFees={canChangeFees}
        onOpen={(fee) => {
          setOpen({ kind: "fee", fee });
        }}
      />
      {seesBalance && (
        <StudentPayments
          key={rest.version}
          studentId={student.id}
          onChanged={rest.onReload}
          aside={
            canRecordPayment && (
              <Button
                icon="receipt"
                onClick={() => {
                  setOpen({ kind: "payment" });
                }}
              >
                {PAYMENT_TEXT.takeAPayment}
              </Button>
            )
          }
        />
      )}
      <FeesDialog
        open={open}
        student={student}
        onClose={() => {
          setOpen(null);
        }}
        onReload={rest.onReload}
      />
    </div>
  );
}

type FeesDialogProps = {
  open: Open;
  student: Student;
  onClose: () => void;
  onReload: () => void;
};

/** Adding or changing a Fee, or taking a payment and showing its receipt. */
function FeesDialog({ open, student, onClose, onReload }: FeesDialogProps) {
  const { showToast } = useToast();
  if (open === null) return null;
  if (open.kind === "payment") {
    return <PaymentFlow profile={student} onClose={onClose} onRecorded={onReload} />;
  }
  return (
    <FeeDialog
      student={student}
      fee={open.fee}
      onClose={onClose}
      onSaved={(_, toast) => {
        showToast(toast);
        onClose();
        onReload();
      }}
    />
  );
}

type AgreedFeesProps = {
  fees: Fees;
  canChangeFees: boolean;
  /** Add a Fee (null) or change one. */
  onOpen: (fee: Fee | null) => void;
};

/** "What they agreed to pay", with Add a fee; a counsellor is told the rest stays with the Admin. */
function AgreedFees({ fees, canChangeFees, onOpen }: AgreedFeesProps) {
  return (
    <Section
      title={FEE_TEXT.whatTheyAgreed}
      aside={
        canChangeFees && (
          <Button
            icon="plus"
            onClick={() => {
              onOpen(null);
            }}
          >
            {FEE_TEXT.addAFee}
          </Button>
        )
      }
    >
      <FeeList fees={fees} canChangeFees={canChangeFees} onEdit={onOpen} />
      {fees.balance === null && <p className="text-small text-ink-2">{FEE_TEXT.counsellorNote}</p>}
    </Section>
  );
}

/** What the "Still to pay" tile says under its number: an overpayment, or paid in full. */
function stillToPayNote(fees: Fees): string | undefined {
  if (fees.balance === null) return undefined;
  if (fees.balance.overpaid > 0) return FEE_TEXT.overpaid(formatNpr(fees.balance.overpaid));
  return fees.total > 0 && fees.balance.stillToPay === 0 ? FEE_TEXT.paidInFull : undefined;
}

/** Agreed fees, paid so far and still to pay; an overpayment owes nothing and says so. */
export function BalanceTiles({ fees }: { fees: Fees }) {
  const { balance } = fees;
  if (balance === null) return null;
  const note = stillToPayNote(fees);
  return (
    <TileGrid>
      <FigureTile label={FEE_TEXT.agreedFees} value={formatNpr(fees.total)} />
      <FigureTile label={FEE_TEXT.paidSoFar} value={formatNpr(balance.paid)} tone="good" />
      <FigureTile
        label={FEE_TEXT.stillToPay}
        value={formatNpr(balance.stillToPay)}
        {...(balance.stillToPay > 0 && { tone: "warn" as const })}
        {...(note !== undefined && { footnote: note })}
      />
    </TileGrid>
  );
}

type FeeListProps = {
  fees: Fees;
  canChangeFees: boolean;
  onEdit: (fee: Fee) => void;
};

function FeeList({ fees, canChangeFees, onEdit }: FeeListProps) {
  if (fees.fees.length === 0) {
    return (
      <Panel>
        <EmptyState>{FEE_TEXT.noFeesYet}</EmptyState>
      </Panel>
    );
  }
  return (
    <Panel>
      <RowList label={FEE_TEXT.whatTheyAgreed}>
        {fees.fees.map((fee) => (
          <RowItem
            key={fee.id}
            title={<span className="wrap-anywhere">{describeFeeType(fee.feeType, fee.note)}</span>}
            meta={<span data-fee-by="">{FEE_TEXT.addedBy(fee.addedBy.name)}</span>}
            hidesMetaOnPhone
            right={
              <>
                <span className="font-semibold whitespace-nowrap tabular-nums">
                  {formatNpr(fee.amount)}
                </span>
                {canChangeFees && (
                  <Button
                    variant="ghost"
                    icon="edit"
                    onClick={() => {
                      onEdit(fee);
                    }}
                  >
                    <span aria-hidden="true">{FEE_TEXT.edit}</span>
                    <span className="sr-only">
                      {FEE_TEXT.editFor(describeFeeType(fee.feeType, fee.note))}
                    </span>
                  </Button>
                )}
              </>
            }
          />
        ))}
      </RowList>
      <PanelFoot>
        <span className="flex flex-wrap justify-between gap-4">
          <span>{FEE_TEXT.total}</span>
          <span className="text-ink font-semibold tabular-nums">{formatNpr(fees.total)}</span>
        </span>
      </PanelFoot>
    </Panel>
  );
}
