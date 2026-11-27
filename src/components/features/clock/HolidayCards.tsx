"use client";

import clsx from "clsx";
import { useId } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Button } from "@/components/ui/Button";
import { HOLIDAY_TEXT as TEXT } from "@/constants/clock";
import {
  holidayCount,
  holidayWords,
  type HolidayGroup,
  type HolidayWords,
} from "@/lib/clock/holidays";

/** Finds the cards' buttons, so the cursor can go to the next Remove after a removal. */
export const HOLIDAY_CARD_BUTTONS = "[data-holiday-card] button";

type HolidayCardsProps = {
  /** "Coming up" or "Past holidays". */
  title: string;
  /** The heading's level where the cards are shown: under a page's tab, or inside a section. */
  level: "h2" | "h4";
  groups: readonly HolidayGroup[];
  /** Past holidays are a little quieter: a grey date leaf and a softer name. */
  isPast?: boolean;
  /** Said in place of the cards when there are none. */
  emptyText?: string;
  /** Admins in Configuration: each card gets Remove. Without it the cards are read only. */
  onRemove?: (group: HolidayGroup) => void;
};

/**
 * Holidays as whole holidays (UI revamp 17): a titled group of cards, each with a date leaf
 * ("Nov 8–10"), the name and how long it is ("3 days, Sun to Tue"). Shown to everyone on the
 * Working hours page and, with Remove, to Admins in Configuration.
 */
export function HolidayCards({
  title,
  level: Heading,
  groups,
  isPast = false,
  emptyText,
  onRemove,
}: HolidayCardsProps) {
  const titleId = useId();
  const count = holidayCount(groups);
  return (
    <section aria-labelledby={titleId} className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <Heading id={titleId} className="text-body text-ink font-semibold">
          {title}
        </Heading>
        {groups.length > 0 && (
          <span className="text-small text-ink-2">{TEXT.count(count.holidays, count.days)}</span>
        )}
      </div>
      {groups.length === 0 ? (
        <p className="text-small text-ink-2">{emptyText}</p>
      ) : (
        <ul
          aria-labelledby={titleId}
          className="max-phone:grid-cols-1 grid grid-cols-[repeat(auto-fill,minmax(var(--spacing-holiday-card),1fr))] gap-2.5"
        >
          {groups.map((group) => (
            <HolidayCard key={group.key} group={group} isPast={isPast} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </section>
  );
}

type HolidayCardProps = {
  group: HolidayGroup;
  isPast: boolean;
  onRemove: ((group: HolidayGroup) => void) | undefined;
};

function HolidayCard({ group, isPast, onRemove }: HolidayCardProps) {
  const dates = useDates();
  const words = holidayWords(group, dates.date);
  return (
    <li
      data-row=""
      data-holiday-card=""
      className={clsx(
        "rounded-menu border-sheet-rule bg-paper shadow-raise pl-gutter grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 border py-3",
        // Remove's own padding keeps its word off the card's side.
        onRemove === undefined ? "pr-gutter" : "pr-2",
      )}
    >
      <DateLeaf words={words} isPast={isPast} />
      <span className="grid min-w-0 gap-0.5">
        <span
          title={group.name}
          className={clsx("text-body truncate font-semibold", isPast ? "text-ink-2" : "text-ink")}
        >
          {group.name}
        </span>
        <span aria-hidden="true" className="text-secondary text-ink-2">
          {words.when}
        </span>
        <span className="sr-only">{words.full}</span>
      </span>
      {onRemove !== undefined && (
        <Button
          variant="ghost"
          size="sm"
          label={TEXT.removeFor(group.name, words.full)}
          onClick={() => {
            onRemove(group);
          }}
        >
          {TEXT.remove}
        </Button>
      )}
    </li>
  );
}

/** The date leaf: the month small over the days ("Nov" over "8–10"), grey once it is past. */
function DateLeaf({ words, isPast }: { words: HolidayWords; isPast: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "rounded-control grid h-15 min-w-15 content-center justify-items-center gap-1 px-2.5",
        isPast ? "bg-fill text-ink-2" : "bg-tint text-accent",
      )}
    >
      <span className="text-tiny leading-none font-semibold">{words.leafMonth}</span>
      <span
        className={clsx(
          "leading-none font-semibold whitespace-nowrap tabular-nums",
          words.isRange ? "text-card-title" : "text-dialog-title",
        )}
      >
        {words.leafDays}
      </span>
    </span>
  );
}
