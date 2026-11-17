"use client";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Chip } from "@/components/ui/Chip";
import { BATCH_TEXT, BatchTiming } from "@/constants/batches";
import type { Batch } from "@/lib/api";

/** Whether a class is running, starts on a day, or has finished: always in words. */
export function BatchStatus({ batch }: { batch: Batch }) {
  const dates = useDates();
  if (batch.timing === BatchTiming.Upcoming) {
    return <Chip tone="accent">{BATCH_TEXT.startsOn(dates.date(batch.startsOn))}</Chip>;
  }
  if (batch.timing === BatchTiming.Finished) {
    return <Chip tone="muted">{BATCH_TEXT.finished}</Chip>;
  }
  return <Chip tone="good">{BATCH_TEXT.running}</Chip>;
}
