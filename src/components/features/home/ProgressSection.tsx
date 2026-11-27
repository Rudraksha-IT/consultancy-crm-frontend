"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { ChecklistDialog } from "@/components/features/documents/ChecklistDialog";
import { DocumentsButton } from "@/components/features/documents/DocumentsButton";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { StageMeter } from "@/components/ui/StageMeter";
import { Thread } from "@/components/ui/Thread";
import { Loading } from "@/components/ui/Loading";
import { usePhoneWidth } from "@/components/ui/usePhoneWidth";
import { HOME_TEXT } from "@/constants/home";
import { ROUTES } from "@/constants/routes";
import { COUNTRY_LABELS } from "@/constants/students";
import { fetchProgress, type ProgressList, type ProgressRow } from "@/lib/api";

import { useLoaded } from "./useLoaded";

type ProgressSectionProps = {
  title: string;
  /** Only the Students assigned to the viewer (the Counsellor's Home). */
  mine: boolean;
  limit: number;
  /** Show each Student's counsellor (the Admin's Home, which shows everyone). */
  showsCounsellor: boolean;
};

/**
 * Students furthest along first, each with their Stage on the thread, the next step and a
 * documents button that opens their checklist (spec 22a).
 */
export function ProgressSection({ title, mine, limit, showsCounsellor }: ProgressSectionProps) {
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState<ProgressRow | null>(null);
  const load = useCallback(() => fetchProgress({ mine, limit }), [mine, limit]);
  const state = useLoaded(load, version);

  return (
    <Section
      title={title}
      aside={
        <Link href={ROUTES.students} className="min-h-control inline-flex items-center">
          {HOME_TEXT.allStudents}
        </Link>
      }
    >
      {state.status === "loading" && <Loading />}
      {state.status === "failed" && <Banner tone="problem">{HOME_TEXT.progressFailed}</Banner>}
      {state.status === "loaded" && (
        <ProgressPanel list={state.data} showsCounsellor={showsCounsellor} onOpen={setOpen} />
      )}
      {open !== null && (
        <ChecklistDialog
          student={open.student}
          onClose={() => {
            setOpen(null);
            setVersion((current) => current + 1);
          }}
        />
      )}
    </Section>
  );
}

type ProgressPanelProps = {
  list: ProgressList;
  showsCounsellor: boolean;
  onOpen: (row: ProgressRow) => void;
};

function ProgressPanel({ list, showsCounsellor, onOpen }: ProgressPanelProps) {
  if (list.rows.length === 0) {
    return (
      <Panel>
        <EmptyState>{HOME_TEXT.noStudents}</EmptyState>
      </Panel>
    );
  }
  return (
    <Panel>
      <ul aria-label={HOME_TEXT.everyonesProgress} className="divide-rule divide-y">
        {list.rows.map((row) => (
          <ProgressItem
            key={row.student.id}
            row={row}
            showsCounsellor={showsCounsellor}
            onOpen={onOpen}
          />
        ))}
      </ul>
      {list.count > list.rows.length && (
        <div className="border-rule text-secondary text-ink-2 px-gutter flex flex-wrap items-center justify-between gap-x-4 border-t py-2">
          <span>{HOME_TEXT.showingFurthest(list.rows.length, list.count)}</span>
          <Link href={ROUTES.students} className="min-h-control inline-flex items-center">
            {HOME_TEXT.seeAllStudents}
          </Link>
        </div>
      )}
    </Panel>
  );
}

function whoLine({ student }: ProgressRow, showsCounsellor: boolean): string {
  const country = COUNTRY_LABELS[student.country];
  if (!showsCounsellor) return country;
  return `${country}, ${student.assignedCounsellor?.name ?? HOME_TEXT.noCounsellorYet}`;
}

type ProgressItemProps = {
  row: ProgressRow;
  showsCounsellor: boolean;
  onOpen: (row: ProgressRow) => void;
};

/**
 * Name and country, then the Stage on the thread with the next step, then the documents. On a
 * phone: the name and the next step (one line), with the Stage's name on the right; the thread
 * and the documents are on the page the name opens (UI revamp 07; owner, 2026-11-27).
 */
function ProgressItem({ row, showsCounsellor, onOpen }: ProgressItemProps) {
  return (
    <li
      data-row=""
      className="phone:grid-cols-[minmax(0,1fr)_auto] wide:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] max-phone:grid-cols-[minmax(0,1fr)_auto] max-phone:gap-x-3 max-phone:gap-y-0.5 max-phone:px-4 max-phone:py-3.5 px-gutter grid grid-cols-1 items-center gap-x-6 gap-y-3 py-5"
    >
      <div className="max-phone:col-start-1 max-phone:row-start-1 grid min-w-0 gap-1">
        <Link
          href={ROUTES.student(row.student.id)}
          className="text-body text-ink min-h-control inline-flex items-center font-semibold break-words hover:underline"
        >
          {row.student.name}
        </Link>
        <span className="text-secondary text-ink-2 max-phone:hidden">
          {whoLine(row, showsCounsellor)}
        </span>
      </div>
      <div className="wide:order-none wide:col-span-1 phone:col-span-2 max-phone:col-span-2 max-phone:col-start-1 max-phone:row-start-2 max-phone:gap-1 order-last grid min-w-0 gap-1.5">
        <span data-progress-stage="" className="max-phone:hidden grid min-w-0">
          <Thread stage={row.student.stage} isDone={row.isDone} />
        </span>
        <span className="text-secondary text-ink-2 max-phone:truncate">
          {row.isDone ? HOME_TEXT.done(row.nextStep) : HOME_TEXT.next(row.nextStep)}
        </span>
      </div>
      <div
        data-progress-end=""
        className="phone:justify-self-end max-phone:col-start-2 max-phone:row-start-1 max-phone:justify-self-end max-phone:min-w-0 justify-self-start"
      >
        <RowEnd row={row} onOpen={onOpen} />
      </div>
    </li>
  );
}

/**
 * The end of a row: the documents button, which opens the checklist. On a phone the Stage's name
 * instead (owner, 2026-11-27): the thread is not drawn there, and the documents are on the
 * Student's page.
 */
function RowEnd({ row, onOpen }: Pick<ProgressItemProps, "row" | "onOpen">) {
  const isPhone = usePhoneWidth();
  if (isPhone) {
    return (
      <span className="text-secondary text-ink-2">
        <StageMeter stage={row.student.stage} />
      </span>
    );
  }
  return (
    <DocumentsButton
      studentName={row.student.name}
      documents={row.documents}
      onOpen={() => {
        onOpen(row);
      }}
    />
  );
}
