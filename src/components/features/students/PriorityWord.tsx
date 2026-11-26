import clsx from "clsx";

import { PRIORITY_LABELS, type Priority } from "@/constants/priority";

/**
 * Each Priority's dot; the word is always shown beside it (tickets 10, 11). Red is only for High:
 * Normal is a hollow ring and Low a quieter one, never the brand colour (UI revamp, ticket 21).
 */
export const PRIORITY_DOTS: Record<Priority, string> = {
  high: "bg-bad",
  normal: "border-ink-3 border-2",
  low: "border-rule-2 border",
};

/** A Priority as a dot and its word, e.g. "● High". */
export function PriorityWord({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={clsx("size-2.5 shrink-0 rounded-full", PRIORITY_DOTS[priority])}
      />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
