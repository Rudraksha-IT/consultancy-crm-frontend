"use client";

import Link from "next/link";

import { useLoaded, type Loaded } from "@/components/features/home/useLoaded";
import { Banner } from "@/components/ui/Banner";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { VisitKind, VISIT_TEXT } from "@/constants/visits";
import { fetchTodaysVisits, type TimelineVisit, type TodaysVisits } from "@/lib/api";
import { localTime } from "@/lib/dates";

function loadToday() {
  return fetchTodaysVisits();
}

/**
 * Today's Visits as a timeline, newest first (spec 23b): time, name, New or Follow-up, why they
 * came, and the first line of their Note. New visitors get a filled dot. `version` reloads it.
 */
export function TodaysVisitors({ version }: { version: number }) {
  const state = useLoaded(loadToday, version);
  const count = state.status === "loaded" ? state.data.count : null;
  return (
    <Section
      title={VISIT_TEXT.todaysVisitors}
      aside={
        count === null ? undefined : <Chip hasDot={false}>{VISIT_TEXT.todaysCount(count)}</Chip>
      }
    >
      <TodayBody state={state} />
    </Section>
  );
}

function TodayBody({ state }: { state: Loaded<TodaysVisits> }) {
  if (state.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{VISIT_TEXT.todayFailed}</Banner>;
  if (state.data.visits.length === 0) {
    return (
      <Panel>
        <EmptyState>{VISIT_TEXT.noVisitorsYet}</EmptyState>
      </Panel>
    );
  }
  return (
    <Panel>
      <ol aria-label={VISIT_TEXT.todaysVisitors} className="py-2">
        {state.data.visits.map((visit) => (
          <VisitRow key={visit.id} visit={visit} />
        ))}
      </ol>
    </Panel>
  );
}

function VisitRow({ visit }: { visit: TimelineVisit }) {
  const isNew = visit.kind === VisitKind.New;
  return (
    <li className="group phone:px-6 flex gap-3 px-4">
      <span className="phone:w-16 w-12 shrink-0 py-4 font-bold tabular-nums">
        {localTime(visit.at)}
      </span>
      <span
        aria-hidden="true"
        className="before:border-rule relative flex w-5 shrink-0 justify-center before:absolute before:top-0 before:bottom-0 before:border-l-2 group-first:before:top-6 group-last:before:bottom-auto group-last:before:h-6 group-only:before:hidden"
      >
        <span
          data-new={isNew}
          className="border-ink-3 bg-paper data-[new=true]:border-accent data-[new=true]:bg-accent relative mt-5.5 size-3 rounded-full border-2"
        />
      </span>
      <div className="grid min-w-0 flex-1 gap-1 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href={ROUTES.student(visit.student.id)}
            className="min-h-control inline-flex items-center font-semibold hover:underline"
          >
            {visit.student.name}
          </Link>
          {isNew ? (
            <Chip tone="accent">{VISIT_TEXT.newVisitorChip}</Chip>
          ) : (
            <Chip>{VISIT_TEXT.followUpChip}</Chip>
          )}
        </div>
        <p className="text-secondary text-ink-2 break-words">{visit.purpose}</p>
        {visit.student.noteFirstLine !== "" && (
          <p className="text-small text-warn mt-1.5 flex items-center gap-1.5 break-words">
            <Icon name="pin" size="sm" />
            <span className="sr-only">{VISIT_TEXT.noteLine}: </span>
            {visit.student.noteFirstLine}
          </p>
        )}
      </div>
    </li>
  );
}
