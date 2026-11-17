"use client";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { TRANSFER_TEXT } from "@/constants/transferRequests";
import type { TransferRequest } from "@/lib/api";

import { TransferRequestActions } from "./TransferRequestActions";

type TransferRequestBannerProps = {
  request: TransferRequest;
  onChanged: (request: TransferRequest) => void;
};

/**
 * The request waiting for this Student: who asked, when and why, with Approve and Decline for
 * whoever may answer, or Cancel request for whoever asked (spec 44b, 44c).
 */
export function TransferRequestBanner({ request, onChanged }: TransferRequestBannerProps) {
  const hasActions = request.canAnswer || request.canCancel;
  return (
    <Banner
      tone="warning"
      icon="transfer"
      action={
        hasActions ? (
          <div className="flex flex-wrap gap-2">
            <TransferRequestActions request={request} onChanged={onChanged} />
          </div>
        ) : undefined
      }
    >
      <BannerText request={request} hasActions={hasActions} />
    </Banner>
  );
}

/** "You asked …" for whoever asked; otherwise who asked, when and why, and who can answer. */
function BannerText({ request, hasActions }: { request: TransferRequest; hasActions: boolean }) {
  const dates = useDates();
  const when = dates.dateTime(request.askedAt);
  const answerer = TRANSFER_TEXT.answerer(request.counsellor?.name ?? null);
  if (request.canCancel) return TRANSFER_TEXT.bannerMine(when, answerer);
  return (
    <span className="break-words">
      <strong>{request.askedBy.name}</strong>
      {TRANSFER_TEXT.bannerTheirs(when)} {TRANSFER_TEXT.quoted(request.reason)}
      {!hasActions && ` ${TRANSFER_TEXT.bannerWaitingFor(answerer)}`}
    </span>
  );
}
