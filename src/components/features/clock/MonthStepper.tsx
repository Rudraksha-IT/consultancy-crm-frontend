"use client";

import clsx from "clsx";

import { ICON_TONE_CLASSES } from "@/components/ui/IconButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { CLOCK_MONTHS_SHOWN, CLOCK_TEXT as TEXT } from "@/constants/clock";
import { monthBeside } from "@/lib/clock";
import { formatMonth, recentMonths, todayIso } from "@/lib/dates";

type MonthStepperProps = {
  /** The month shown ("YYYY-MM"). */
  value: string;
  onChange: (month: string) => void;
  /** Where it sits in its line, e.g. the middle column of the month's bar. */
  className?: string;
};

/**
 * Which month to show, as a calendar has it (owner, 2026-11-27; was a list to pick from): the
 * month's name between an arrow to the month before and one to the month after. This month is
 * the last; the first is a year back. An arrow with nowhere to go stays where it is, greyed, so
 * the cursor is never lost on it.
 */
export function MonthStepper({ value, onChange, className }: MonthStepperProps) {
  const months = recentMonths(todayIso(), CLOCK_MONTHS_SHOWN);
  return (
    <div
      role="group"
      aria-label={TEXT.month}
      className={clsx("flex items-center gap-1", className)}
    >
      <Arrow
        icon="left"
        label={TEXT.previousMonth}
        to={monthBeside(months, value, "older")}
        onChange={onChange}
      />
      <span
        aria-live="polite"
        className="text-body text-ink min-w-month-name text-center font-semibold whitespace-nowrap"
      >
        {formatMonth(value)}
      </span>
      <Arrow
        icon="right"
        label={TEXT.nextMonth}
        to={monthBeside(months, value, "newer")}
        onChange={onChange}
      />
    </div>
  );
}

type ArrowProps = {
  icon: IconName;
  label: string;
  /** The month it goes to, or null when there is none that way. */
  to: string | null;
  onChange: (month: string) => void;
};

function Arrow({ icon, label, to, onChange }: ArrowProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Not `disabled`: a button that turns off under the cursor would lose it (rule 8).
      aria-disabled={to === null}
      onClick={() => {
        if (to !== null) onChange(to);
      }}
      className={clsx(
        "size-control rounded-control grid flex-none cursor-pointer place-items-center aria-disabled:cursor-not-allowed aria-disabled:opacity-40",
        ICON_TONE_CLASSES.page,
      )}
    >
      <Icon name={icon} />
    </button>
  );
}
