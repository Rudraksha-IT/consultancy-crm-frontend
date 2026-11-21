"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FigureTile } from "@/components/ui/FigureTile";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { COMMUNICATION_TEXT as TEXT, TO_CHIPS_SHOWN } from "@/constants/communication";
import type { BulkResult } from "@/lib/api";

import type { EmailRecipient } from "./recipients";

/** Which half shows at narrow widths, where writing and the preview take turns. */
export type Pane = "write" | "preview";

const PANES = [
  { value: "write", label: TEXT.write },
  { value: "preview", label: TEXT.preview },
] as const;

/** Write / Preview, only below tablet width (wider, both show side by side). */
export function PaneToggle({ pane, onPane }: { pane: Pane; onPane: (pane: Pane) => void }) {
  return (
    <div className="tablet:hidden">
      <SegmentedControl label={TEXT.show} options={PANES} value={pane} onChange={onPane} />
    </div>
  );
}

type ToRowProps = {
  recipients: readonly EmailRecipient[];
  isBulk: boolean;
  onChange: (() => void) | undefined;
};

type ChipProps = { recipient: EmailRecipient; showsEmail: boolean };

/** One Student's name, with their address when the email is just to them. */
function RecipientChip({ recipient, showsEmail }: ChipProps) {
  return (
    <li className="rounded-control bg-fill text-secondary min-w-0 px-3 py-1.5 break-words">
      <span className="text-ink font-semibold">{recipient.name}</span>
      {showsEmail && <span className="text-ink-2"> {recipient.email}</span>}
    </li>
  );
}

/** Who it goes to: one Student with their address, or the first few names and how many more. */
export function ToRow({ recipients, isBulk, onChange }: ToRowProps) {
  const shown = isBulk ? recipients.slice(0, TO_CHIPS_SHOWN) : recipients;
  const more = recipients.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-secondary text-ink-2 font-semibold">{TEXT.to}</span>
      <ul aria-label={TEXT.to} className="flex min-w-0 flex-1 flex-wrap gap-2">
        {shown.map((recipient) => (
          <RecipientChip
            key={recipient.id}
            recipient={recipient}
            showsEmail={!isBulk && recipient.email !== ""}
          />
        ))}
        {more > 0 && (
          <li className="rounded-control bg-fill text-secondary text-ink-2 px-3 py-1.5">
            {TEXT.moreChips(more)}
          </li>
        )}
      </ul>
      {onChange !== undefined && (
        <Button size="sm" variant="ghost" onClick={onChange}>
          {TEXT.change}
        </Button>
      )}
    </div>
  );
}

export function SendingFinished({ result, onClose }: { result: BulkResult; onClose: () => void }) {
  return (
    <Dialog
      isOpen
      title={TEXT.sendingFinished}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          {TEXT.done}
        </Button>
      }
    >
      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-4">
          <FigureTile label={TEXT.sent} value={result.sent} tone="good" />
          <FigureTile label={TEXT.skippedOrFailed} value={result.failed} tone="bad" />
        </div>
        {result.failedMessages.length > 0 && (
          <ul aria-label={TEXT.failed} className="grid list-disc gap-2 pl-5 break-words">
            {result.failedMessages.map((message) => (
              <li key={message.id}>{TEXT.failedLine(message.student.name, message.error)}</li>
            ))}
          </ul>
        )}
        <p className="text-small text-ink-3">{TEXT.oneFailureNeverStops}</p>
      </div>
    </Dialog>
  );
}
