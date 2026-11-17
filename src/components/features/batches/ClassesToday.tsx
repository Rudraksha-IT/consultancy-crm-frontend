"use client";

import Link from "next/link";

import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { BATCH_TEXT, BatchTiming } from "@/constants/batches";
import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import type { Batch } from "@/lib/api";

import { BatchMeta } from "./BatchMeta";
import { useBatchPage } from "./useBatchData";

/**
 * A Teacher's classes running today, each with Take attendance, or Attendance done once anyone
 * is marked (spec 22a, 85). Their classes come first on the list, so its first page has them.
 */
export function ClassesToday() {
  const state = useBatchPage(1, 0);
  return (
    <Section title={BATCH_TEXT.classesToday}>
      <TodayList state={state} />
    </Section>
  );
}

function TodayList({ state }: { state: ReturnType<typeof useBatchPage> }) {
  if (state.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (state.status !== "loaded") return <Banner tone="problem">{BATCH_TEXT.listFailed}</Banner>;
  const today = state.data.batches.filter((batch) => batch.timing === BatchTiming.Running);
  return (
    <Panel>
      {today.length === 0 ? (
        <EmptyState>{BATCH_TEXT.noClassesToday}</EmptyState>
      ) : (
        <RowList label={BATCH_TEXT.classesToday}>
          {today.map((batch) => (
            <TodayRow key={batch.id} batch={batch} />
          ))}
        </RowList>
      )}
    </Panel>
  );
}

function TodayRow({ batch }: { batch: Batch }) {
  const href = ROUTES.batch(batch.id);
  return (
    <RowItem
      title={
        <Link
          href={href}
          className="text-accent min-h-control inline-flex items-center hover:underline"
        >
          {batch.name}
        </Link>
      }
      meta={<BatchMeta batch={batch} showsTeacher={false} />}
      right={
        batch.attendanceTakenToday ? (
          <>
            <Chip tone="good">{BATCH_TEXT.attendanceDone}</Chip>
            <ButtonLink href={href}>
              {BATCH_TEXT.view} <span className="sr-only">{batch.name}</span>
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href={href} variant="primary">
            {BATCH_TEXT.takeAttendance} <span className="sr-only">{batch.name}</span>
          </ButtonLink>
        )
      }
    />
  );
}
