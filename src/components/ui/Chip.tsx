import clsx from "clsx";
import type { ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

/** Status colours are fixed; `accent` follows the Theme and is for neutral highlights only. */
export type ChipTone = "good" | "warn" | "bad" | "accent" | "muted";

const TONE_CLASSES: Record<ChipTone, string> = {
  good: "bg-good-tint text-good",
  warn: "bg-warn-tint text-warn",
  bad: "bg-bad-tint text-bad",
  accent: "bg-tint text-accent",
  muted: "bg-fill-2 text-ink-2",
};

type ChipProps = {
  /** The status word. A colour never stands alone. */
  children: ReactNode;
  tone?: ChipTone;
  hasDot?: boolean;
  /** A line icon in place of the dot, e.g. an arrow for a priority. */
  icon?: IconName;
};

/** A status: a dot and a word, coloured by the status. */
export function Chip({ children, tone = "muted", hasDot = true, icon }: ChipProps) {
  return (
    <span
      className={clsx(
        "rounded-pill text-small inline-flex items-center gap-2 px-3 leading-7 font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
      )}
    >
      <ChipMark icon={icon} hasDot={hasDot} />
      {children}
    </span>
  );
}

/** The icon, else the dot (unless left out). */
function ChipMark({ icon, hasDot }: { icon: IconName | undefined; hasDot: boolean }) {
  if (icon !== undefined) return <Icon name={icon} size="sm" />;
  if (!hasDot) return null;
  return <span aria-hidden="true" className="size-dot rounded-pill bg-current" />;
}
