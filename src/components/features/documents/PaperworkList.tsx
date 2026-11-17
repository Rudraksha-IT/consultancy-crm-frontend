import clsx from "clsx";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { ROUTES } from "@/constants/routes";
import { STAGE_LABELS } from "@/constants/stages";
import { COUNTRY_LABELS } from "@/constants/students";
import type { PaperworkRow } from "@/lib/api";

type PaperworkListProps = {
  rows: readonly PaperworkRow[];
  /** Show each Student's counsellor (when the list is everyone's). */
  showsCounsellor: boolean;
  onOpen: (row: PaperworkRow) => void;
};

/**
 * Students by how much their paperwork needs, with counts by state and their progress. On a phone
 * a row keeps the name, only the "to check" and "rejected" chips, "5 of 13" and Open checklist.
 */
export function PaperworkList({ rows, showsCounsellor, onOpen }: PaperworkListProps) {
  return (
    <RowList label={DOCUMENT_TEXT.pageTitle}>
      {rows.map((row) => (
        <RowItem
          key={row.student.id}
          title={
            <Link
              href={ROUTES.student(row.student.id)}
              className="min-h-control inline-flex max-w-full items-center hover:underline"
            >
              <span className="max-phone:truncate min-w-0">{row.student.name}</span>
            </Link>
          }
          meta={whoLine(row, showsCounsellor)}
          hidesMetaOnPhone
          keepsRightBesideOnPhone
          right={<RowProgress row={row} onOpen={onOpen} />}
        >
          <Counts row={row} />
        </RowItem>
      ))}
    </RowList>
  );
}

function whoLine(row: PaperworkRow, showsCounsellor: boolean): string {
  const { stage, country, assignedCounsellor } = row.student;
  const parts = [STAGE_LABELS[stage], COUNTRY_LABELS[country]];
  if (showsCounsellor && assignedCounsellor !== null) parts.push(assignedCounsellor.name);
  return parts.join(", ");
}

/**
 * A chip per state that has any, each with its word (colour never stands alone). On a phone only
 * what needs someone shows: to check and rejected.
 */
function Counts({ row }: { row: PaperworkRow }) {
  const chips = [
    { count: row.rejected, tone: "bad", text: DOCUMENT_TEXT.chipRejected, isShownOnPhone: true },
    { count: row.waiting, tone: "warn", text: DOCUMENT_TEXT.chipWaiting, isShownOnPhone: true },
    { count: row.missing, tone: "muted", text: DOCUMENT_TEXT.chipMissing, isShownOnPhone: false },
    { count: row.verified, tone: "good", text: DOCUMENT_TEXT.chipVerified, isShownOnPhone: false },
  ] as const;
  const shown = chips.filter((chip) => chip.count > 0);
  const needsSomeone = shown.some((chip) => chip.isShownOnPhone);
  return (
    <div className={clsx("mt-2 flex flex-wrap gap-2", !needsSomeone && "max-phone:hidden")}>
      {shown.map((chip) => (
        <span key={chip.tone} className={clsx(!chip.isShownOnPhone && "max-phone:hidden")}>
          <Chip tone={chip.tone}>{chip.text(chip.count)}</Chip>
        </span>
      ))}
    </div>
  );
}

function RowProgress({ row, onOpen }: { row: PaperworkRow; onOpen: (row: PaperworkRow) => void }) {
  return (
    <>
      <div className="max-phone:w-auto grid w-36 gap-1">
        <div className="max-phone:hidden">
          <ProgressBar
            label={DOCUMENT_TEXT.progressLabel}
            value={row.done}
            max={row.total}
            tone={row.total > 0 && row.done === row.total ? "good" : "accent"}
          />
        </div>
        <span className="text-small text-ink-2 max-phone:text-secondary max-phone:whitespace-nowrap text-right">
          {DOCUMENT_TEXT.doneOf(row.done, row.total)}
        </span>
      </div>
      <Button
        icon="file"
        onClick={() => {
          onOpen(row);
        }}
      >
        <span aria-hidden="true">{DOCUMENT_TEXT.openChecklist}</span>
        <span className="sr-only">{DOCUMENT_TEXT.openChecklistFor(row.student.name)}</span>
      </Button>
    </>
  );
}
