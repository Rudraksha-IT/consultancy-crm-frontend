"use client";

import { useDates } from "@/components/features/shell/dateDisplay";
import { BrandMark } from "@/components/ui/BrandMark";
import { Button } from "@/components/ui/Button";
import { DetailList } from "@/components/ui/DetailList";
import { Dialog } from "@/components/ui/Dialog";
import { LABELS } from "@/constants/messages";
import { PAYMENT_METHOD_LABELS, PAYMENT_TEXT } from "@/constants/payments";
import { describeFeeType, type OfficeLogo, type Receipt } from "@/lib/api";
import { formatBsDate } from "@/lib/dates";
import { amountInWords, formatNpr } from "@/lib/money";

type ReceiptDialogProps = {
  receipt: Receipt;
  /** The office's name, always written at the top of the receipt. */
  officeName: string;
  /** The office logo beside the name (issue 39), or none for the initials. */
  officeLogo: OfficeLogo | null;
  onClose: () => void;
};

/**
 * A Payment's receipt, ready to print (spec 72). Its date is in the office's calendar with the
 * other one under it, so an AD receipt always carries the BS date too (spec 101).
 */
export function ReceiptDialog({ receipt, officeName, officeLogo, onClose }: ReceiptDialogProps) {
  const dates = useDates();
  const bsDate = formatBsDate(receipt.paidOn);
  const otherDate = dates.otherCalendar(receipt.paidOn);
  return (
    <Dialog
      isOpen
      isWide
      isPrintable
      title={PAYMENT_TEXT.receipt}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.close}</Button>
          <Button
            variant="primary"
            icon="receipt"
            onClick={() => {
              window.print();
            }}
          >
            {PAYMENT_TEXT.printReceipt}
          </Button>
        </>
      }
    >
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
            { label: PAYMENT_TEXT.for, value: describeFeeType(receipt.feeType, receipt.note) },
            { label: PAYMENT_TEXT.paidBy, value: PAYMENT_METHOD_LABELS[receipt.method] },
          ]}
        />
        <div className="grid gap-1">
          <p className="text-figure">{formatNpr(receipt.amount)}</p>
          <p className="text-ink-2 italic">{amountInWords(receipt.amount)}</p>
        </div>
        <footer className="flex flex-wrap items-end justify-between gap-4 pt-2">
          <Stamp bsDate={bsDate} />
          <p className="border-rule-2 text-small text-ink-2 min-w-48 border-t pt-2 text-center">
            {PAYMENT_TEXT.receivedBy(receipt.recordedBy.name)}
          </p>
        </footer>
      </article>
      <p className="text-small text-ink-2 print:hidden">{PAYMENT_TEXT.closeAfterPrinting}</p>
    </Dialog>
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
