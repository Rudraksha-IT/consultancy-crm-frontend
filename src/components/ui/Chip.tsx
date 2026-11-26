import clsx from "clsx";
import type { ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

/**
 * Status colours are fixed. `accent` is a status that is simply in progress (Applied, Offer, New
 * visitor): ink with a hollow ring, never the brand colour, which sits too close to the problem
 * red (ticket 21). Red is only for a problem.
 */
export type ChipTone = "good" | "warn" | "bad" | "accent" | "muted";

const TONE_CLASSES: Record<ChipTone, string> = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  accent: "text-ink",
  muted: "text-ink-2",
};

type ChipProps = {
  /** The status word. A colour never stands alone. */
  children: ReactNode;
  tone?: ChipTone;
  hasDot?: boolean;
  /** A line icon in place of the dot, e.g. an arrow for a priority. */
  icon?: IconName;
};

/**
 * A status: a dot and a word, coloured by the status, with no filled badge behind it (Ivory).
 * Never wider than its container.
 */
export function Chip({ children, tone = "muted", hasDot = true, icon }: ChipProps) {
  return (
    <span
      className={clsx(
        "text-secondary inline-flex max-w-full items-center gap-1.75 leading-7 font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
      )}
    >
      <ChipMark icon={icon} hasDot={hasDot} isHollow={tone === "accent"} />
      {/* In a narrow cell the word is cut with …, never spilling out (list tidy-ups 17). */}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

type ChipMarkProps = { icon: IconName | undefined; hasDot: boolean; isHollow: boolean };

/** The icon, else the dot (unless left out): filled in the status colour, or a hollow ring. */
function ChipMark({ icon, hasDot, isHollow }: ChipMarkProps) {
  if (icon !== undefined) return <Icon name={icon} size="sm" />;
  if (!hasDot) return null;
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "size-chip-dot rounded-pill flex-none",
        isHollow ? "border-ink-3 border-2" : "bg-current",
      )}
    />
  );
}
