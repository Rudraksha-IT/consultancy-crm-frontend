"use client";

import { useEffect, useState } from "react";

import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Loading";
import {
  CONSULTANCY_STATUS_LABELS,
  ConsultancyStatus,
  READ_ONLY_STATUSES,
} from "@/constants/consultancyStatus";
import { SUPPORT_TEXT } from "@/constants/supportAccess";
import { fetchSupportVisits, type SupportVisit } from "@/lib/api";
import { formatAdDateTime } from "@/lib/dates";

type VisitsState =
  { status: "loading" } | { status: "failed" } | { status: "loaded"; visits: SupportVisit[] };

type SupportVisitListProps = {
  /** Loads the visits; the Platform API by default. */
  loadVisits?: () => Promise<SupportVisit[]>;
};

/**
 * "Visits by Platform Admins" on the Platform page (spec 10): who opened which office, why, and
 * when. Kept on the Platform only; never shown to the office.
 */
export function SupportVisitList({ loadVisits = fetchSupportVisits }: SupportVisitListProps) {
  const [state, setState] = useState<VisitsState>({ status: "loading" });

  useEffect(() => {
    let isCurrent = true;
    loadVisits().then(
      (visits) => {
        if (isCurrent) setState({ status: "loaded", visits });
      },
      () => {
        if (isCurrent) setState({ status: "failed" });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [loadVisits]);

  return (
    <Section title={SUPPORT_TEXT.visitsTitle} aside={<span>{SUPPORT_TEXT.visitsAside}</span>}>
      <VisitsBody state={state} />
    </Section>
  );
}

function VisitsBody({ state }: { state: VisitsState }) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") {
    return (
      <p role="alert" className="text-bad font-semibold">
        {SUPPORT_TEXT.visitsFailed}
      </p>
    );
  }
  return (
    <Panel>
      {state.visits.length === 0 ? (
        <EmptyState>{SUPPORT_TEXT.noVisits}</EmptyState>
      ) : (
        <RowList>
          {state.visits.map((visit) => (
            <VisitRow key={visit.id} visit={visit} />
          ))}
        </RowList>
      )}
    </Panel>
  );
}

function VisitRow({ visit }: { visit: SupportVisit }) {
  const wasRestricted =
    READ_ONLY_STATUSES.includes(visit.consultancyStatus) ||
    visit.consultancyStatus === ConsultancyStatus.Terminated;
  return (
    <RowItem
      title={visit.consultancy.name}
      meta={
        <>
          <span>{SUPPORT_TEXT.visitBy(visit.platformAdminName, visit.reason)}</span>
          {wasRestricted && (
            <span>
              {SUPPORT_TEXT.statusAtTheTime(CONSULTANCY_STATUS_LABELS[visit.consultancyStatus])}
            </span>
          )}
        </>
      }
      right={
        <span className="text-secondary text-ink-2 flex flex-wrap items-center justify-end gap-2">
          <span className="tabular-nums">{formatAdDateTime(visit.startedAt)}</span>
          {visit.endedAt === null ? (
            <Chip tone="warn">{SUPPORT_TEXT.inProgress}</Chip>
          ) : (
            <span>{SUPPORT_TEXT.endedAt(formatAdDateTime(visit.endedAt))}</span>
          )}
        </span>
      }
    />
  );
}
