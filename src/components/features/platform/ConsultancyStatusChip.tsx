import { Chip, type ChipTone } from "@/components/ui/Chip";
import {
  CONSULTANCY_STATUS_LABELS,
  ConsultancyStatus,
  STATUS_TEXT,
} from "@/constants/consultancyStatus";
import type { ConsultancyOverview } from "@/lib/api";
import { evaluationLastDay, formatShortDay } from "@/lib/consultancyStatus/notice";

/** Status colours are fixed; the word always goes with them. */
const STATUS_TONES: Record<ConsultancyStatus, ChipTone> = {
  evaluation: "accent",
  active: "good",
  past_due: "warn",
  suspended: "bad",
  terminated: "muted",
};

type ConsultancyStatusChipProps = {
  consultancy: Pick<ConsultancyOverview, "status" | "evaluationEndsAt">;
  /** Today, for whether the evaluation has ended; the moment of rendering by default. */
  now?: Date;
};

/** A Consultancy's Status as a chip; an evaluation also says when it ends, or that it has. */
export function ConsultancyStatusChip({
  consultancy,
  now = new Date(),
}: ConsultancyStatusChipProps) {
  const label = CONSULTANCY_STATUS_LABELS[consultancy.status];
  return (
    <Chip tone={STATUS_TONES[consultancy.status]}>
      {consultancy.status === ConsultancyStatus.Evaluation
        ? `${label}, ${evaluationEnd(consultancy.evaluationEndsAt, now)}`
        : label}
    </Chip>
  );
}

function evaluationEnd(endsAt: string | null, now: Date): string {
  const lastDay = endsAt === null ? null : evaluationLastDay(endsAt);
  if (endsAt === null || lastDay === null || new Date(endsAt).getTime() <= now.getTime()) {
    return STATUS_TEXT.ended;
  }
  return STATUS_TEXT.endsOn(formatShortDay(lastDay, now));
}
