"use client";

import clsx from "clsx";
import { useId, useState } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { FieldNote, describeField } from "@/components/ui/FieldNote";
import { IconButton } from "@/components/ui/IconButton";
import { HOLIDAY_TEXT as TEXT, WEEKDAYS } from "@/constants/clock";
import type { Holiday } from "@/lib/api";
import {
  monthGrid,
  monthOf,
  shiftMonth,
  todayIso,
  type CalendarMonth,
  type GridDay,
} from "@/lib/dates";

type HolidayCalendarProps = {
  holidays: readonly Holiday[];
  /** The AD days chosen, in the order they fall. */
  chosen: readonly string[];
  onToggle: (iso: string) => void;
  errors?: string[] | undefined;
};

/**
 * Holidays are chosen by tapping days on a month calendar in the office's calendar, not picked
 * from dropdowns (asked 2026-11-17). Each tap chooses a day and a second tap takes it off, so a
 * holiday of several days (all of Dashain, even with a gap) is chosen at once (UI revamp 17). A
 * day that is already a holiday is marked with its name and can't be chosen again.
 */
export function HolidayCalendar({ holidays, chosen, onToggle, errors }: HolidayCalendarProps) {
  const dates = useDates();
  const [month, setMonth] = useState<CalendarMonth | null>(() =>
    monthOf(todayIso(), dates.display),
  );
  const grid = month === null ? null : monthGrid(month, dates.display);
  const named = new Map(holidays.map((holiday) => [holiday.date, holiday.name]));
  const description = describeField(errors, TEXT.calendarHelp, false);
  const noteId = useId();

  if (month === null || grid === null) return null;

  function move(by: number): void {
    if (month !== null) setMonth(shiftMonth(month, by, dates.display) ?? month);
  }

  return (
    <div
      role="group"
      aria-label={`${TEXT.calendarLabel}, ${grid.title}`}
      aria-describedby={noteId}
      className="grid max-w-105 min-w-0 content-start gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <IconButton
          icon="left"
          label={TEXT.previousMonth}
          onClick={() => {
            move(-1);
          }}
        />
        <p className="text-body text-ink font-semibold">{grid.title}</p>
        <IconButton
          icon="right"
          label={TEXT.nextMonth}
          onClick={() => {
            move(1);
          }}
        />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            aria-hidden="true"
            className="text-tiny text-ink-3 text-center font-semibold"
          >
            {weekday}
          </div>
        ))}
        {Array.from({ length: grid.leadingBlanks }, (_, blank) => (
          <div key={`blank-${String(blank)}`} aria-hidden="true" />
        ))}
        {grid.days.map((day) => (
          <DayButton
            key={day.iso}
            day={day}
            label={dates.date(day.iso)}
            holiday={named.get(day.iso)}
            isChosen={chosen.includes(day.iso)}
            onToggle={onToggle}
          />
        ))}
      </div>
      <p className="flex flex-wrap gap-x-1.5">
        <FieldNote id={noteId} description={description} />
        <span aria-live="polite" className="text-small text-ink font-semibold">
          {chosen.length > 0 && TEXT.chosen(chosen.length)}
        </span>
      </p>
    </div>
  );
}

type DayButtonProps = {
  day: GridDay;
  label: string;
  holiday: string | undefined;
  isChosen: boolean;
  onToggle: (iso: string) => void;
};

function DayButton({ day, label, holiday, isChosen, onToggle }: DayButtonProps) {
  const isHoliday = holiday !== undefined;
  return (
    <button
      type="button"
      aria-label={isHoliday ? TEXT.isHoliday(label, holiday) : label}
      aria-pressed={isHoliday ? undefined : isChosen}
      disabled={isHoliday}
      title={holiday}
      onClick={() => {
        onToggle(day.iso);
      }}
      className={clsx(
        "rounded-control min-h-control text-secondary grid min-w-0 place-items-center border font-semibold tabular-nums",
        isHoliday
          ? "border-warn bg-warn-tint text-warn cursor-not-allowed"
          : "border-rule text-ink hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-ink cursor-pointer",
      )}
    >
      {day.day}
    </button>
  );
}
