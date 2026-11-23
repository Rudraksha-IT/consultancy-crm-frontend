import clsx from "clsx";

import { PRIORITY_LABELS, type Priority } from "@/constants/priority";

/** Each Priority's colour dot; the word is always shown beside it (tickets 10, 11). */
export const PRIORITY_DOTS: Record<Priority, string> = {
  high: "bg-bad",
  normal: "bg-accent",
  low: "bg-ink-3",
};

/** A Priority as a colour dot and its word, e.g. "● High". */
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
