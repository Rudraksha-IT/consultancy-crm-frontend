"use client";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { BrandMark } from "@/components/ui/BrandMark";
import { Button } from "@/components/ui/Button";
import { DetailList } from "@/components/ui/DetailList";
import { Dialog } from "@/components/ui/Dialog";
import { LABELS, MESSAGES } from "@/constants/messages";
import { PAYMENT_METHOD_LABELS, PAYMENT_TEXT } from "@/constants/payments";
import { describeFeeType, type OfficeLogo, type Receipt, type ReceiptLine } from "@/lib/api";
import { formatBsDate } from "@/lib/dates";
import { amountInWords, formatNpr } from "@/lib/money";

/** The receipt to show, or that it is still loading or couldn't be loaded. */
export type ReceiptState = Receipt | "loading" | "failed";

type ReceiptDialogProps = {
  receipt: ReceiptState;
  /** The office's name, always written at the top of the receipt. */
  officeName: string;
  /** The office logo beside the name (issue 39), or none for the initials. */
  officeLogo: OfficeLogo | null;
  onClose: () => void;
  /** Email it to the Student as Payment received; left out where it can't be emailed. */
  onEmail?: (() => void) | undefined;
};

/**
 * A receipt, ready to print (spec 72-73): every Payment recorded with it, one line each as they
 * are now, and the total. Its date is in the office's calendar with the other one under it, so
 * an AD receipt always carries the BS date too (spec 101).
 */
export function ReceiptDialog({
  receipt,
  officeName,
  officeLogo,
  onClose,
  onEmail,
}: ReceiptDialogProps) {
  return (
    <Dialog
      isOpen
      isWide
      isPrintable
      title={PAYMENT_TEXT.receipt}
      onClose={onClose}
      footer={
        <ReceiptFooter canPrint={typeof receipt !== "string"} onClose={onClose} onEmail={onEmail} />
      }
    >
      {typeof receipt === "string" ? (
        <ReceiptNotShown state={receipt} />
      ) : (
        <>
          <ReceiptPaper receipt={receipt} officeName={officeName} officeLogo={officeLogo} />
          <p className="text-small text-ink-2 print:hidden">{PAYMENT_TEXT.closeAfterPrinting}</p>
        </>
      )}
    </Dialog>
  );
}

type ReceiptFooterProps = Pick<ReceiptDialogProps, "onClose" | "onEmail"> & { canPrint: boolean };

/** Close, Email it (where it can be emailed), and Print receipt once there is one to print. */
function ReceiptFooter({ canPrint, onClose, onEmail }: ReceiptFooterProps) {
  return (
    <>
      <Button onClick={onClose}>{LABELS.close}</Button>
      {canPrint && onEmail !== undefined && (
        <Button icon="message" onClick={onEmail}>
          {PAYMENT_TEXT.emailIt}
        </Button>
      )}
      {canPrint && (
        <Button
          variant="primary"
          icon="receipt"
          onClick={() => {
            window.print();
          }}
        >
          {PAYMENT_TEXT.printReceipt}
        </Button>
      )}
    </>
  );
}

/** Still loading, or it couldn't be loaded. */
function ReceiptNotShown({ state }: { state: "loading" | "failed" }) {
  if (state === "failed") return <Banner tone="problem">{PAYMENT_TEXT.receiptFailed}</Banner>;
  return <p className="text-ink-2">{MESSAGES.loading}</p>;
}

type ReceiptPaperProps = Omit<ReceiptDialogProps, "receipt" | "onClose"> & { receipt: Receipt };

/** The receipt itself: the office, number and date, who paid and how, the lines and the total. */
function ReceiptPaper({ receipt, officeName, officeLogo }: ReceiptPaperProps) {
  const dates = useDates();
  const bsDate = formatBsDate(receipt.paidOn);
  const otherDate = dates.otherCalendar(receipt.paidOn);
  return (
    <article className="border-rule-2 rounded-control bg-paper phone:p-8 grid gap-6 border p-5">
      <header className="border-ink flex flex-wrap justify-between gap-4 border-b-2 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark
            name={officeName}
            logo={officeLogo === null ? null : { ...officeLogo, showName: true }}
          />
          <h3 className="text-card-title break-words">{officeName}</h3>
        </div>
        <div className="text-small phone:justify-items-end phone:text-right grid">
          <span>
            {PAYMENT_TEXT.receiptNumber} <b>{receipt.receiptNumber}</b>
          </span>
          <span>{dates.date(receipt.paidOn)}</span>
          {otherDate !== null && <span>{otherDate}</span>}
        </div>
      </header>
      <DetailList
        isFlush
        items={[
          {
            label: PAYMENT_TEXT.receivedFrom,
            value: `${receipt.student.name}, ${receipt.student.phone}`,
          },
          { label: PAYMENT_TEXT.paidBy, value: PAYMENT_METHOD_LABELS[receipt.method] },
        ]}
      />
      <ReceiptLines receipt={receipt} />
      <div className="grid gap-1">
        <p className="text-figure">{formatNpr(receipt.total)}</p>
        <p className="text-ink-2 italic">{amountInWords(receipt.total)}</p>
      </div>
      <footer className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <Stamp bsDate={bsDate} />
        <p className="border-rule-2 text-small text-ink-2 min-w-48 border-t pt-2 text-center">
          {PAYMENT_TEXT.receivedBy(receipt.recordedBy.name)}
        </p>
      </footer>
    </article>
  );
}

const LINE_CELL = "py-3 align-top";

/** Each line's Fee Type and note, and its amount, then the total. */
function ReceiptLines({ receipt }: { receipt: Receipt }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-rule-2 text-small text-ink-2 border-b text-left">
          <th scope="col" className="pb-2 font-semibold">
            {PAYMENT_TEXT.for}
          </th>
          <th scope="col" className="pb-2 text-right font-semibold">
            {PAYMENT_TEXT.amountHeading}
          </th>
        </tr>
      </thead>
      <tbody className="divide-rule divide-y">
        {receipt.lines.map((line) => (
          <tr key={line.id}>
            <td className={`${LINE_CELL} pr-4 wrap-anywhere`}>
              {describeFeeType(line.feeType, line.note)}
              <PaidDifferently line={line} receipt={receipt} />
            </td>
            <td className={`${LINE_CELL} text-right whitespace-nowrap tabular-nums`}>
              {formatNpr(line.amount)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-ink border-t-2">
          <th scope="row" className="pt-3 text-left font-semibold">
            {PAYMENT_TEXT.total}
          </th>
          <td className="pt-3 text-right font-semibold whitespace-nowrap tabular-nums">
            {formatNpr(receipt.total)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/** A line changed later to another method or day says so, since the top of the receipt doesn't. */
function PaidDifferently({ line, receipt }: { line: ReceiptLine; receipt: Receipt }) {
  const dates = useDates();
  if (line.method === receipt.method && line.paidOn === receipt.paidOn) return null;
  return (
    <span className="text-small text-ink-2 block">
      {PAYMENT_TEXT.paidDifferently(PAYMENT_METHOD_LABELS[line.method], dates.date(line.paidOn))}
    </span>
  );
}

/** The round "Received" stamp with the BS date; decorative, as the receipt says it in words. */
function Stamp({ bsDate }: { bsDate: string }) {
  return (
    <div
      aria-hidden="true"
      className="size-stamp border-accent text-accent text-small grid -rotate-9 place-items-center rounded-full border-4 border-double p-3 text-center leading-tight font-semibold"
    >
      <span className="grid gap-1">
        <b className="text-secondary">{PAYMENT_TEXT.stamp}</b>
        {bsDate !== "—" && <span>{bsDate}</span>}
      </span>
    </div>
  );
}
