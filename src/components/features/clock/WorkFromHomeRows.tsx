"use client";

import { useState } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { useToast } from "@/components/ui/useToast";
import { WORK_FROM_HOME_TEXT as TEXT, WorkFromHomeStatus } from "@/constants/workFromHome";
import {
  answerWorkFromHome,
  cancelWorkFromHome,
  endWorkFromHome,
  type WorkFromHomeDates,
} from "@/lib/api";
import { todayIso } from "@/lib/dates";

import { workFromHomeFailure } from "./workFromHomeFailure";

/** Each status's fixed colour; the word is always shown with it. */
const STATUS_TONES: Record<WorkFromHomeStatus, ChipTone> = {
  waiting: "warn",
  approved: "good",
  declined: "bad",
  cancelled: "muted",
  ended: "muted",
};

type WorkFromHomeRowsProps = {
  dates: readonly WorkFromHomeDates[];
  /** Admins approve, decline and end; the person themself cancels a waiting request. */
  isAdmin: boolean;
  onChanged: (dates: WorkFromHomeDates) => void;
};

/** One person's dates, newest first: when, why, who asked or set them, and what may be done. */
export function WorkFromHomeRows({ dates, isAdmin, onChanged }: WorkFromHomeRowsProps) {
  if (dates.length === 0) return <EmptyState>{TEXT.empty}</EmptyState>;
  return (
    <RowList label={TEXT.title}>
      {dates.map((one) => (
        <WorkFromHomeRow key={one.id} dates={one} isAdmin={isAdmin} onChanged={onChanged} />
      ))}
    </RowList>
  );
}

function WorkFromHomeRow({
  dates,
  isAdmin,
  onChanged,
}: {
  dates: WorkFromHomeDates;
  isAdmin: boolean;
  onChanged: (dates: WorkFromHomeDates) => void;
}) {
  const shown = useDates();
  return (
    <RowItem
      title={datesText(dates, shown.date)}
      right={
        <>
          <Chip tone={STATUS_TONES[dates.status]}>{TEXT.statuses[dates.status]}</Chip>
          <Actions dates={dates} isAdmin={isAdmin} onChanged={onChanged} />
        </>
      }
    >
      <p className="text-secondary text-ink break-words">{dates.reason}</p>
      <p className="text-small text-ink-2 break-words">{whoLine(dates, shown.dateTime)}</p>
    </RowItem>
  );
}

/** "6 Nov 2026 to 12 Nov 2026", "28 Oct 2026", or "1 Oct 2026 onwards, no end date". */
export function datesText(
  dates: { startsOn: string; endsOn: string | null },
  date: (iso: string) => string,
): string {
  return TEXT.dates(date(dates.startsOn), dates.endsOn === null ? null : date(dates.endsOn));
}

function whoLine(dates: WorkFromHomeDates, dateTime: (moment: string) => string): string {
  if (dates.isSetDirectly) return TEXT.setBy(dates.askedBy, dateTime(dates.askedAt));
  const asked = TEXT.asked(dateTime(dates.askedAt));
  if (dates.answeredBy === null) return asked;
  return asked + TEXT.answeredBy(TEXT.statuses[dates.status], dates.answeredBy);
}

type ActionProps = {
  dates: WorkFromHomeDates;
  onChanged: (dates: WorkFromHomeDates) => void;
};

/** Admins: Approve and Decline while it waits, End it while Approved dates last. */
function Actions({ dates, isAdmin, onChanged }: ActionProps & { isAdmin: boolean }) {
  const isWaiting = dates.status === WorkFromHomeStatus.Waiting;
  if (!isAdmin) return isWaiting ? <CancelButton dates={dates} onChanged={onChanged} /> : null;
  if (isWaiting) return <AnswerButtons dates={dates} onChanged={onChanged} />;
  return canEnd(dates) ? <EndButton dates={dates} onChanged={onChanged} /> : null;
}

function canEnd(dates: WorkFromHomeDates): boolean {
  const isOver = dates.endsOn !== null && dates.endsOn < todayIso();
  return dates.status === WorkFromHomeStatus.Approved && !isOver;
}

function AnswerButtons({ dates, onChanged }: ActionProps) {
  const { showToast } = useToast();
  const [isSending, setIsSending] = useState(false);

  async function answer(kind: "approve" | "decline"): Promise<void> {
    setIsSending(true);
    try {
      onChanged(await answerWorkFromHome(dates.id, kind));
      showToast(kind === "approve" ? TEXT.approved : TEXT.declined);
    } catch (error) {
      showToast(workFromHomeFailure(error));
    }
    setIsSending(false);
  }

  return (
    <>
      <Button
        size="sm"
        variant="primary"
        icon="check"
        isDisabled={isSending}
        onClick={() => void answer("approve")}
      >
        {TEXT.approve}
      </Button>
      <Button size="sm" isDisabled={isSending} onClick={() => void answer("decline")}>
        {TEXT.decline}
      </Button>
    </>
  );
}

function EndButton({ dates, onChanged }: ActionProps) {
  const { showToast } = useToast();
  const [isAsking, setIsAsking] = useState(false);

  async function end(): Promise<void> {
    const ended = await endWorkFromHome(dates.id);
    setIsAsking(false);
    showToast(ended.status === WorkFromHomeStatus.Ended ? TEXT.ended : TEXT.endsToday);
    onChanged(ended);
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setIsAsking(true);
        }}
      >
        {TEXT.endIt}
      </Button>
      {isAsking && (
        <ConfirmDialog
          title={TEXT.endTitle}
          actionLabel={TEXT.endIt}
          onClose={() => {
            setIsAsking(false);
          }}
          onConfirm={end}
          failureOf={workFromHomeFailure}
        >
          {TEXT.endBody}
        </ConfirmDialog>
      )}
    </>
  );
}

/** The person who asked takes back a request still waiting. */
function CancelButton({ dates, onChanged }: ActionProps) {
  const { showToast } = useToast();
  const [isAsking, setIsAsking] = useState(false);

  async function cancel(): Promise<void> {
    const cancelled = await cancelWorkFromHome(dates.id);
    setIsAsking(false);
    showToast(TEXT.cancelled);
    onChanged(cancelled);
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setIsAsking(true);
        }}
      >
        {TEXT.cancel}
      </Button>
      {isAsking && (
        <ConfirmDialog
          title={TEXT.cancelTitle}
          actionLabel={TEXT.cancelRequest}
          onClose={() => {
            setIsAsking(false);
          }}
          onConfirm={cancel}
          failureOf={workFromHomeFailure}
        >
          {TEXT.cancelBody}
        </ConfirmDialog>
      )}
    </>
  );
}
