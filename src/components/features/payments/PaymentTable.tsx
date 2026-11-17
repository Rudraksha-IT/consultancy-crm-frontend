"use client";

import Link from "next/link";
import { useState } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Button } from "@/components/ui/Button";
import { DataCell, DataRow, DataTable } from "@/components/ui/DataTable";
import { OneLine } from "@/components/ui/OneLine";
import { useToast } from "@/components/ui/useToast";
import { PAYMENT_METHOD_LABELS, PAYMENT_TEXT } from "@/constants/payments";
import { ROUTES } from "@/constants/routes";
import type { Receipt } from "@/lib/api";
import { formatNpr } from "@/lib/money";

import { EditPaymentDialog } from "./EditPaymentDialog";
import { ReceiptDialog } from "./ReceiptDialog";

type PaymentTableProps = {
  payments: readonly Receipt[];
  /** Show who paid (the Accounts list); a Student's own Fees tab doesn't need it. */
  showsStudent: boolean;
  /** A Payment was changed or deleted, so the list and its total should load again. */
  onChanged: () => void;
};

type Open = { kind: "receipt" | "edit"; payment: Receipt } | null;

const HEAD = "text-small text-ink-2 bg-fill px-6 py-3 text-left font-semibold";
const CELL = "px-6 py-4 align-middle max-tablet:p-0";

/**
 * Payments with their date and method, Student, purpose and amount, each with Receipt and Edit
 * (spec 74-75). Below tablet width each row stacks into a card, so the page never scrolls
 * sideways. On a phone a row is the date, who paid (or what it was for) and the amount, with
 * Receipt and Edit on their own line.
 */
export function PaymentTable({ payments, showsStudent, onChanged }: PaymentTableProps) {
  const [open, setOpen] = useState<Open>(null);
  return (
    <>
      <DataTable phone="list" stacksBelowTablet>
        <thead className="max-tablet:sr-only">
          <tr>
            <th scope="col" className={HEAD}>
              {PAYMENT_TEXT.date}
            </th>
            {showsStudent && (
              <th scope="col" className={HEAD}>
                {PAYMENT_TEXT.student}
              </th>
            )}
            <th scope="col" className={HEAD}>
              {PAYMENT_TEXT.for}
            </th>
            <th scope="col" className={`${HEAD} tablet:text-right`}>
              {PAYMENT_TEXT.amountHeading}
            </th>
            <th scope="col" className={HEAD}>
              <span className="sr-only">{PAYMENT_TEXT.receipt}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-rule divide-y">
          {payments.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              showsStudent={showsStudent}
              onOpen={setOpen}
            />
          ))}
        </tbody>
      </DataTable>
      <PaymentDialog
        open={open}
        onClose={() => {
          setOpen(null);
        }}
        onChanged={onChanged}
      />
    </>
  );
}

type PaymentRowProps = {
  payment: Receipt;
  showsStudent: boolean;
  onOpen: (open: Open) => void;
};

function PaymentRow({ payment, showsStudent, onOpen }: PaymentRowProps) {
  const paidOn = useDates().moneyDate(payment.paidOn);
  return (
    <DataRow className="hover:bg-fill max-tablet:grid max-tablet:gap-2 max-tablet:p-5">
      <DataCell part="title" className={CELL}>
        <div className="tablet:whitespace-nowrap max-phone:font-semibold tabular-nums">
          {paidOn.date}
        </div>
        {paidOn.beside !== null && (
          <div className="text-small text-ink-2 tablet:whitespace-nowrap max-phone:hidden tabular-nums">
            {paidOn.beside}
          </div>
        )}
        <div className="text-secondary text-ink-2 max-phone:hidden">
          {PAYMENT_METHOD_LABELS[payment.method]}
        </div>
      </DataCell>
      {showsStudent && (
        <DataCell part="line" shrinks className={CELL}>
          <Link
            href={ROUTES.student(payment.student.id)}
            className="text-ink hover:text-accent min-h-control inline-flex max-w-full items-center font-semibold underline-offset-4 hover:underline"
          >
            <OneLine>{payment.student.name}</OneLine>
          </Link>
        </DataCell>
      )}
      <DataCell {...(!showsStudent && { part: "line" as const })} shrinks className={CELL}>
        <OneLine block>{payment.purpose}</OneLine>
      </DataCell>
      <DataCell
        part="fact"
        className={`${CELL} tablet:text-right font-semibold whitespace-nowrap tabular-nums`}
      >
        {formatNpr(payment.amount)}
      </DataCell>
      <DataCell part="actions" className={CELL}>
        <div className="tablet:justify-end wide:flex-nowrap flex flex-wrap gap-2">
          <Button
            icon="receipt"
            onClick={() => {
              onOpen({ kind: "receipt", payment });
            }}
          >
            <span aria-hidden="true">{PAYMENT_TEXT.receipt}</span>
            <span className="sr-only">{PAYMENT_TEXT.receiptFor(payment.receiptNumber)}</span>
          </Button>
          <Button
            variant="ghost"
            icon="edit"
            onClick={() => {
              onOpen({ kind: "edit", payment });
            }}
          >
            <span aria-hidden="true">{PAYMENT_TEXT.edit}</span>
            <span className="sr-only">{PAYMENT_TEXT.editFor(payment.receiptNumber)}</span>
          </Button>
        </div>
      </DataCell>
    </DataRow>
  );
}

type PaymentDialogProps = {
  open: Open;
  onClose: () => void;
  onChanged: () => void;
};

function PaymentDialog({ open, onClose, onChanged }: PaymentDialogProps) {
  const { consultancy } = useCurrentStaff();
  const { showToast } = useToast();
  if (open === null) return null;
  if (open.kind === "receipt") {
    return (
      <ReceiptDialog
        receipt={open.payment}
        officeName={consultancy.name}
        officeLogo={consultancy.logo}
        onClose={onClose}
      />
    );
  }
  return (
    <EditPaymentDialog
      payment={open.payment}
      onClose={onClose}
      onSaved={() => {
        showToast(PAYMENT_TEXT.changesSaved);
        onClose();
        onChanged();
      }}
      onDeleted={() => {
        showToast(PAYMENT_TEXT.deleted);
        onClose();
        onChanged();
      }}
    />
  );
}
