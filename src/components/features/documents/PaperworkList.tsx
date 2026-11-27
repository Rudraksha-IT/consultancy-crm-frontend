import Link from "next/link";
import { useRef, type MouseEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { RowList } from "@/components/ui/RowList";
import { DOCUMENT_TEXT, PAPERWORK_PILL_ORDER, PAPERWORK_STATE_TEXT } from "@/constants/documents";
import { ROUTES } from "@/constants/routes";
import { STAGE_LABELS } from "@/constants/stages";
import { COUNTRY_LABELS } from "@/constants/students";
import type { PaperworkItem, PaperworkRow } from "@/lib/api";

import { DocumentPill } from "./DocumentPill";

type PaperworkListProps = {
  rows: readonly PaperworkRow[];
  /** Show each Student's counsellor (when the list is everyone's). */
  showsCounsellor: boolean;
  onOpen: (row: PaperworkRow) => void;
};

/**
 * Students by how much their paperwork needs (UI revamp 12): the name, a pill per checklist
 * document, then how many came in and Open checklist. On tablets the pills take their own line
 * under the name. On a phone a row keeps the name, the short counts ("1 rejected", "2 to check"),
 * "5 of 13" and Open checklist.
 */
export function PaperworkList({ rows, showsCounsellor, onOpen }: PaperworkListProps) {
  return (
    <RowList label={DOCUMENT_TEXT.pageTitle}>
      {rows.map((row) => (
        <PaperworkRowItem
          key={row.student.id}
          row={row}
          showsCounsellor={showsCounsellor}
          onOpen={onOpen}
        />
      ))}
    </RowList>
  );
}

/** The row's link and button keep their own job; a click anywhere else opens the checklist. */
const OWN_JOB = "a, button";

type PaperworkRowItemProps = Omit<PaperworkListProps, "rows"> & { row: PaperworkRow };

function PaperworkRowItem({ row, showsCounsellor, onOpen }: PaperworkRowItemProps) {
  const openRef = useRef<HTMLButtonElement>(null);

  /**
   * The cursor goes to the row's Open checklist button first, so it is back there when the
   * checklist closes (design-system rule 8).
   */
  function handleClick(event: MouseEvent<HTMLElement>): void {
    if (event.target instanceof Element && event.target.closest(OWN_JOB) !== null) return;
    openRef.current?.focus();
    onOpen(row);
  }

  return (
    <li
      data-opens-checklist=""
      onClick={handleClick}
      className="px-gutter max-phone:gap-x-3 wide:grid-cols-[minmax(var(--spacing-doc-name),1fr)_minmax(0,2.4fr)_auto] wide:items-start grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-3.25"
    >
      <div className="grid min-w-0 gap-1">
        <div className="text-name text-ink min-w-0 font-semibold">
          <Link
            href={ROUTES.student(row.student.id)}
            className="min-h-control hover:text-accent inline-flex max-w-full items-center"
          >
            <span className="max-phone:truncate min-w-0">{row.student.name}</span>
          </Link>
        </div>
        <div className="text-secondary text-ink-2 max-phone:hidden">
          {whoLine(row, showsCounsellor)}
        </div>
        <Counts row={row} />
      </div>
      <Pills student={row.student.name} items={row.items} />
      <div className="max-phone:flex-col max-phone:items-end max-phone:gap-1.5 wide:self-center flex items-center justify-end gap-3">
        <Received done={row.done} total={row.total} />
        <Button
          ref={openRef}
          icon="file"
          onClick={() => {
            onOpen(row);
          }}
        >
          <span aria-hidden="true">{DOCUMENT_TEXT.openChecklist}</span>
          <span className="sr-only">{DOCUMENT_TEXT.openChecklistFor(row.student.name)}</span>
        </Button>
      </div>
    </li>
  );
}

function whoLine(row: PaperworkRow, showsCounsellor: boolean): string {
  const { stage, country, assignedCounsellor } = row.student;
  const parts = [STAGE_LABELS[stage], COUNTRY_LABELS[country]];
  if (showsCounsellor && assignedCounsellor !== null) parts.push(assignedCounsellor.name);
  return parts.join(", ");
}

/**
 * The short counts a phone keeps in place of the pills: only what needs someone (rejected, to
 * check), each with its word. Nothing when neither has any.
 */
function Counts({ row }: { row: PaperworkRow }) {
  if (row.rejected === 0 && row.waiting === 0) return null;
  return (
    <div data-counts="" className="phone:hidden flex flex-wrap gap-x-3">
      {row.rejected > 0 && <Chip tone="bad">{DOCUMENT_TEXT.chipRejected(row.rejected)}</Chip>}
      {row.waiting > 0 && <Chip tone="warn">{DOCUMENT_TEXT.chipWaiting(row.waiting)}</Chip>}
    </div>
  );
}

/** The ones that need work first; inside a state, checklist order is kept. */
function byNeed(items: readonly PaperworkItem[]): PaperworkItem[] {
  return PAPERWORK_PILL_ORDER.flatMap((state) => items.filter((item) => item.state === state));
}

/** A pill per checklist document. On tablets the whole second line; none on a phone. */
function Pills({ student, items }: { student: string; items: readonly PaperworkItem[] }) {
  if (items.length === 0) return <div className="max-wide:hidden" />;
  return (
    <ul
      aria-label={DOCUMENT_TEXT.pillsFor(student)}
      className="max-phone:hidden max-wide:col-span-full max-wide:row-start-2 flex min-w-0 flex-wrap gap-1.5"
    >
      {byNeed(items).map((item) => {
        const { says } = PAPERWORK_STATE_TEXT[item.state];
        return (
          <DocumentPill
            key={item.name}
            state={item.state}
            says={`, ${says}`}
            title={`${item.name}: ${says}`}
          >
            {item.name}
          </DocumentPill>
        );
      })}
    </ul>
  );
}

/** "5 of 13" over "received"; a phone drops the second word. Screen readers hear it whole. */
function Received({ done, total }: { done: number; total: number }) {
  return (
    <div
      data-received=""
      className="text-ink-2 max-phone:text-secondary text-right whitespace-nowrap"
    >
      <span aria-hidden="true" className="block">
        <b className="text-ink font-semibold">{done}</b> {DOCUMENT_TEXT.ofTotal(total)}
      </span>{" "}
      <span aria-hidden="true" className="text-small max-phone:hidden block">
        {DOCUMENT_TEXT.receivedWord}
      </span>
      <span className="sr-only">{DOCUMENT_TEXT.received(done, total)}</span>
    </div>
  );
}
