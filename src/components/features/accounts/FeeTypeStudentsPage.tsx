"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";

import { useLoaded, type Loaded } from "@/components/features/home/useLoaded";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Chip } from "@/components/ui/Chip";
import { DataCell, DataRow, DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { OneLine } from "@/components/ui/OneLine";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { TileGrid } from "@/components/ui/TileGrid";
import { FEE_TYPE_STUDENTS_TEXT as TEXT, FEES_BY_TYPE_TEXT } from "@/constants/feesByType";
import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { STAGE_LABELS } from "@/constants/stages";
import {
  ApiRequestError,
  fetchFeeTypeStudents,
  type FeeTypePart,
  type FeeTypeStudent,
  type FeeTypeStudents,
} from "@/lib/api";
import { formatNpr } from "@/lib/money";

import { AdminAccountsOnly } from "./AdminAccountsOnly";
import { BackLink } from "./BackLink";
import { CELL, HEAD, NUMBER } from "./FeesByTypePage";

const NOT_FOUND = 404;

/** A part of the Students, or that the Fee Type isn't this office's (or doesn't exist). */
type Part = { found: true; page: FeeTypeStudents } | { found: false };

async function loadPart(feeTypeId: number, part: FeeTypePart, page: number): Promise<Part> {
  try {
    return { found: true, page: await fetchFeeTypeStudents(feeTypeId, part, page) };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === NOT_FOUND) return { found: false };
    throw error;
  }
}

/** One part of the Students, a page at a time. */
function usePart(feeTypeId: number, part: FeeTypePart) {
  const [page, setPage] = useState(1);
  const load = useCallback(() => loadPart(feeTypeId, part, page), [feeTypeId, part, page]);
  return { state: useLoaded(load, 0), onPage: setPage };
}

/**
 * One Fee Type's Students (spec 82, 83, 89): the counted ones, most still to pay first, each with
 * the Fee and what they paid for this Fee Type and their whole still to pay; then the Lost ones,
 * not counted. A Student opens on their Fees tab.
 */
export function FeeTypeStudentsPage({ feeTypeId }: { feeTypeId: number }) {
  return (
    <AdminAccountsOnly>
      <FeeTypeStudentsBody feeTypeId={feeTypeId} />
    </AdminAccountsOnly>
  );
}

const BACK = <BackLink href={ROUTES.feesByType}>{TEXT.backToAll}</BackLink>;

/** The page in a loaded, found part; null otherwise. */
function pageOf(state: Loaded<Part>): FeeTypeStudents | null {
  if (state.status !== "loaded" || !state.data.found) return null;
  return state.data.page;
}

/** The last page that loaded: it stays while another page loads, so paging never moves anyone. */
function useShownPage(state: Loaded<Part>): FeeTypeStudents | null {
  const [shown, setShown] = useState<FeeTypeStudents | null>(null);
  const loaded = pageOf(state);
  if (loaded !== null && loaded !== shown) setShown(loaded);
  return loaded ?? shown;
}

function FeeTypeStudentsBody({ feeTypeId }: { feeTypeId: number }) {
  const counted = usePart(feeTypeId, "counted");
  const lost = usePart(feeTypeId, "lost");
  const shown = useShownPage(counted.state);
  const { state } = counted;
  if (state.status === "loaded" && !state.data.found) return <NotFound />;
  if (shown === null) return <NotYet hasFailed={state.status === "failed"} />;
  return (
    <FeeTypeView
      shown={shown}
      hasFailed={state.status === "failed"}
      onPage={counted.onPage}
      lost={<LostPart state={lost.state} onPage={lost.onPage} />}
    />
  );
}

function NotYet({ hasFailed }: { hasFailed: boolean }) {
  return (
    <div className="grid gap-8">
      <PageHeader title={FEES_BY_TYPE_TEXT.title} crumbs={BACK} />
      {hasFailed ? (
        <Banner tone="problem">{TEXT.failed}</Banner>
      ) : (
        <p className="text-ink-2">{MESSAGES.loading}</p>
      )}
    </div>
  );
}

type FeeTypeViewProps = {
  shown: FeeTypeStudents;
  hasFailed: boolean;
  onPage: (page: number) => void;
  lost: ReactNode;
};

function FeeTypeView({ shown, hasFailed, onPage, lost }: FeeTypeViewProps) {
  const { feeType } = shown;
  return (
    <div className="grid gap-8">
      <PageHeader
        title={feeType.name}
        subtitle={TEXT.intro(feeType.name, feeType.hidden)}
        crumbs={BACK}
      />
      <TileGrid>
        <FigureTile label={FEES_BY_TYPE_TEXT.feesAdded} value={formatNpr(shown.fees)} />
        <FigureTile
          label={FEES_BY_TYPE_TEXT.received}
          value={formatNpr(shown.received)}
          tone="good"
        />
      </TileGrid>
      <Section title={TEXT.students}>
        {hasFailed && <Banner tone="problem">{TEXT.failed}</Banner>}
        <Panel>
          <CountedTable page={shown} />
          <Pager
            summary={TEXT.count(shown.count)}
            note={TEXT.openToAct}
            count={shown.count}
            page={shown.page}
            pageSize={shown.pageSize}
            onPage={onPage}
          />
        </Panel>
        <p className="text-small text-ink-2 max-w-prose">{TEXT.wholeBalance}</p>
      </Section>
      {lost}
    </div>
  );
}

function NotFound() {
  return (
    <div className="grid gap-8">
      <PageHeader title={FEES_BY_TYPE_TEXT.title} />
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.feesByType}>{TEXT.backToAll}</ButtonLink>}>
          {TEXT.notFound}
        </EmptyState>
      </Panel>
    </div>
  );
}

function StudentLink({ row }: { row: FeeTypeStudent }) {
  return (
    <Link
      href={ROUTES.studentFees(row.student.id)}
      className="text-ink hover:text-accent min-h-control inline-flex max-w-full items-center font-semibold underline-offset-4 hover:underline"
    >
      <OneLine>{row.student.name}</OneLine>
    </Link>
  );
}

function Money({ label, amount }: { label: string; amount: number }) {
  return (
    <DataCell label={label} className={`${CELL} ${NUMBER}`}>
      {formatNpr(amount)}
    </DataCell>
  );
}

/** What is still to pay in the warning colour, or "Paid in full" with a tick. */
function StillToPay({ amount }: { amount: number }) {
  if (amount === 0) {
    return (
      <Chip tone="good" icon="check">
        {TEXT.paidInFull}
      </Chip>
    );
  }
  return <span className="text-warn font-semibold">{formatNpr(amount)}</span>;
}

/** On a phone: the name, the Stage under it, and what is still to pay. */
function CountedTable({ page }: { page: FeeTypeStudents }) {
  if (page.rows.length === 0) return <EmptyState>{TEXT.nobodyCounted}</EmptyState>;
  return (
    <DataTable phone="list" label={TEXT.students}>
      <thead>
        <tr>
          <th scope="col" className={HEAD}>
            {TEXT.student}
          </th>
          <th scope="col" className={`${HEAD} text-right`}>
            {TEXT.fee}
          </th>
          <th scope="col" className={`${HEAD} text-right`}>
            {TEXT.paidForIt}
          </th>
          <th scope="col" className={`${HEAD} text-right`}>
            {TEXT.stillToPayAll}
          </th>
        </tr>
      </thead>
      <tbody className="divide-rule divide-y">
        {page.rows.map((row) => (
          <DataRow key={row.student.id} opensPage className="hover:bg-fill max-phone:p-5">
            <DataCell part="title" shrinks className={CELL}>
              <StudentLink row={row} />
              <span className="text-small text-ink-2 max-phone:hidden block">
                {STAGE_LABELS[row.student.stage]}
              </span>
            </DataCell>
            <Money label={TEXT.fee} amount={row.fee} />
            <Money label={TEXT.paidForIt} amount={row.paid} />
            <DataCell part="fact" label={TEXT.stillToPayAll} className={`${CELL} ${NUMBER}`}>
              <StillToPay amount={row.stillToPay} />
            </DataCell>
          </DataRow>
        ))}
      </tbody>
    </DataTable>
  );
}

type LostPartProps = { state: Loaded<Part>; onPage: (page: number) => void };

/** Lost Students, apart: what they paid counts in Received, what they owed doesn't (spec 89). */
function LostPart({ state, onPage }: LostPartProps) {
  if (state.status !== "loaded" || !state.data.found || state.data.page.count === 0) return null;
  const { page } = state.data;
  return (
    <Section title={TEXT.lostTitle}>
      <p className="text-ink-2 max-w-prose">{TEXT.lostIntro}</p>
      <Panel>
        <DataTable phone="list" label={TEXT.lostTitle}>
          <thead>
            <tr>
              <th scope="col" className={HEAD}>
                {TEXT.student}
              </th>
              <th scope="col" className={`${HEAD} text-right`}>
                {TEXT.paidForIt}
              </th>
              <th scope="col" className={`${HEAD} text-right`}>
                {TEXT.leftNotCounted}
              </th>
            </tr>
          </thead>
          <tbody className="divide-rule divide-y">
            {page.rows.map((row) => (
              <DataRow key={row.student.id} opensPage className="hover:bg-fill max-phone:p-5">
                <DataCell part="title" shrinks className={CELL}>
                  <StudentLink row={row} />
                  <span className="text-small text-ink-2 flex min-w-0 flex-wrap items-center gap-2">
                    <Chip tone="bad">{TEXT.lost}</Chip>
                    <span className="wrap-anywhere">{row.lostReason}</span>
                  </span>
                </DataCell>
                <Money label={TEXT.paidForIt} amount={row.paid} />
                <DataCell part="fact" label={TEXT.leftNotCounted} className={`${CELL} ${NUMBER}`}>
                  {formatNpr(row.stillToPay)}
                </DataCell>
              </DataRow>
            ))}
          </tbody>
        </DataTable>
        <Pager
          summary={TEXT.count(page.count)}
          count={page.count}
          page={page.page}
          pageSize={page.pageSize}
          onPage={onPage}
        />
      </Panel>
    </Section>
  );
}
