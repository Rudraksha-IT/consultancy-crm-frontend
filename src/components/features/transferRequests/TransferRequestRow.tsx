"use client";

import Link from "next/link";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Chip } from "@/components/ui/Chip";
import { RowItem } from "@/components/ui/RowItem";
import { ROUTES } from "@/constants/routes";
import { TRANSFER_TEXT, TransferRequestStatus } from "@/constants/transferRequests";
import type { TransferRequest } from "@/lib/api";

import { STATUS_TONES } from "./statusTone";
import { TransferRequestActions } from "./TransferRequestActions";

type TransferRequestRowProps = {
  request: TransferRequest;
  onChanged: (request: TransferRequest) => void;
};

/**
 * One request: the Student, its status, who asked and why, the answer, and what I may do. On a
 * phone who asked fits on one line and the reason on two.
 */
export function TransferRequestRow({ request, onChanged }: TransferRequestRowProps) {
  const dates = useDates();
  return (
    <RowItem
      title={
        <span className="flex flex-wrap items-center gap-3">
          <Link
            href={ROUTES.student(request.student.id)}
            className="text-ink min-h-control inline-flex items-center underline"
          >
            {request.student.name}
          </Link>
          <Chip tone={STATUS_TONES[request.status]}>{TRANSFER_TEXT.statuses[request.status]}</Chip>
        </span>
      }
      meta={
        <span className="max-phone:block max-phone:w-full max-phone:truncate">
          {TRANSFER_TEXT.askedToTakeOver(
            request.askedBy.name,
            takenFrom(request),
            dates.dateTime(request.askedAt),
          )}
        </span>
      }
      right={<TransferRequestActions request={request} onChanged={onChanged} />}
    >
      <p className="text-body text-ink max-phone:text-secondary max-phone:line-clamp-2 break-words whitespace-pre-line">
        {TRANSFER_TEXT.quoted(request.reason)}
      </p>
      <Outcome request={request} />
    </RowItem>
  );
}

/**
 * Who the Student was with: their counsellor now while it waits; once answered, who they were
 * with then (later Transfers don't change it).
 */
function takenFrom(request: TransferRequest): string {
  const name =
    request.status === TransferRequestStatus.Waiting
      ? (request.counsellor?.name ?? "")
      : request.takenFrom;
  return name === "" ? TRANSFER_TEXT.noCounsellor : name;
}

/** How it ended: by whom, when, and the reason given, if any. */
function Outcome({ request }: { request: TransferRequest }) {
  const dates = useDates();
  if (request.answeredAt === null) return null;
  const line = TRANSFER_TEXT.outcome(
    TRANSFER_TEXT.statuses[request.status],
    request.answeredBy?.name ?? null,
    dates.dateTime(request.answeredAt),
  );
  return (
    <p className="text-secondary text-ink-2 break-words">
      {request.answerReason === ""
        ? line
        : `${line}: ${TRANSFER_TEXT.quoted(request.answerReason)}`}
    </p>
  );
}
