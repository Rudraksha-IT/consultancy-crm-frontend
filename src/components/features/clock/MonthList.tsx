"use client";

import clsx from "clsx";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { CLOCK_TEXT as TEXT, DayStatus } from "@/constants/clock";
import { WORK_FROM_HOME_TEXT } from "@/constants/workFromHome";
import type { ClockDay, ClockMonth } from "@/lib/api";
import { dayStatus, listedDays, officeTime, shortHours, weekdayName } from "@/lib/clock";
import { formatMonth } from "@/lib/dates";

type MonthListProps = { month: ClockMonth };

/**
 * One person's month as a list (UI revamp 16; made small on 2026-11-27, as the owner asked): every
 * day up to today, newest first, the whole month in view with no pages. From tablet width the days
 * run down two columns, the newer half on the left. A row is the day, its times on one line
 * under it, and what kind of day it was, in words.
 */
export function MonthList({ month }: MonthListProps) {
  const days = listedDays(month.days);
  const monthName = formatMonth(month.month);
  if (days.length === 0) return <EmptyState>{TEXT.nothingYet}</EmptyState>;
  const isThisMonth = days.some((day) => day.isToday);
  const perColumn = Math.ceil(days.length / COLUMNS);
  return (
    <>
      <ul
        aria-label={TEXT.listLabel(monthName)}
        // Two columns filled downwards, each holding half the days.
        style={{ gridTemplateRows: `repeat(${String(perColumn)}, auto)` }}
        className="tablet:grid-flow-col tablet:grid-cols-2 grid"
      >
        {days.map((day, index) => (
          <DayRow key={day.date} day={day} isInFirstColumn={index < perColumn} />
        ))}
      </ul>
      <p className="text-small text-ink-2 px-gutter py-3">
        {(isThisMonth ? TEXT.daysSoFar : TEXT.daysIn)(days.length, monthName)}
      </p>
    </>
  );
}

const COLUMNS = 2;

function DayRow({ day, isInFirstColumn }: { day: ClockDay; isInFirstColumn: boolean }) {
  const dates = useDates();
  const line = timesLine(timesOf(day));
  return (
    <li
      className={clsx(
        "border-rule px-gutter grid min-h-13 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b py-1.5",
        // A line between the two columns; today stands out with a light tint, and says so.
        isInFirstColumn && "tablet:border-r",
        day.isToday && "bg-tint/55",
      )}
    >
      <span className="text-small grid min-w-0">
        <span className="truncate">
          <b className="text-ink font-semibold">{dates.date(day.date)}</b>{" "}
          <span className="text-ink-2">{weekdayWords(day)}</span>
        </span>
        {line !== "" && <span className="text-ink-2 truncate tabular-nums">{line}</span>}
      </span>
      <DayStatusWords day={day} />
    </li>
  );
}

/** "Wednesday", and "Wednesday, today" for today. */
function weekdayWords(day: ClockDay): string {
  const weekday = weekdayName(day.date);
  return day.isToday ? TEXT.todayAfter(weekday) : weekday;
}

type Times = { start: string; end: string; hours: string };

const NO_TIMES: Times = { start: "", end: "", hours: "" };

/** A worked day's first clock-in, last clock-out and hours; all empty for a day with no clock-in. */
function timesOf(day: ClockDay): Times {
  if (day.sessions.length === 0) return NO_TIMES;
  return {
    start: day.firstIn === null ? "" : officeTime(day.firstIn),
    end: endOf(day),
    // Hours can't be counted while a clock-out is missing.
    hours: day.isMissingClockOut ? "" : shortHours(day.minutes),
  };
}

function endOf(day: ClockDay): string {
  if (day.isMissingClockOut) return TEXT.outIsMissing;
  if (day.isStillIn) return TEXT.stillInStatus;
  return day.lastOut === null ? "" : officeTime(day.lastOut);
}

function timesLine({ start, end, hours }: Times): string {
  if (start === "" && end === "") return "";
  const line = TEXT.timesLine(start, end);
  return hours === "" ? line : `${line} · ${hours}`;
}

/** Each status in words with its fixed colour; an in-progress one is ink with a ring. */
const STATUS_LOOKS: Record<
  Exclude<DayStatus, typeof DayStatus.Holiday | typeof DayStatus.None>,
  { label: string; tone: ChipTone }
> = {
  [DayStatus.FullDay]: { label: TEXT.fullDay, tone: "good" },
  [DayStatus.ShortDay]: { label: TEXT.shortDay, tone: "warn" },
  [DayStatus.NoClockOut]: { label: TEXT.noClockOut, tone: "warn" },
  [DayStatus.StillIn]: { label: TEXT.stillInStatus, tone: "accent" },
  [DayStatus.NotInYet]: { label: TEXT.notInYet, tone: "muted" },
  [DayStatus.NotIn]: { label: TEXT.notInDay, tone: "muted" },
  [DayStatus.DayOff]: { label: TEXT.dayOff, tone: "muted" },
};

/** The look of a day's status; a holiday shows its own name, and nothing shows for none. */
function statusLook(day: ClockDay): { label: string; tone: ChipTone } | null {
  const status = dayStatus(day);
  if (status === DayStatus.None) return null;
  if (status === DayStatus.Holiday) return { label: day.holiday ?? TEXT.holiday, tone: "muted" };
  return STATUS_LOOKS[status];
}

/** The status, then "Corrected" and "Home" as small words where they apply. */
function DayStatusWords({ day }: { day: ClockDay }) {
  const look = statusLook(day);
  const notes = [
    day.isCorrected ? TEXT.corrected : null,
    day.isHome ? WORK_FROM_HOME_TEXT.homeTag : null,
  ].filter((note) => note !== null);
  return (
    <span className="flex min-w-0 flex-col items-end">
      {look !== null && <Chip tone={look.tone}>{look.label}</Chip>}
      {notes.map((note) => (
        <span key={note} className="text-small text-ink-2 font-normal">
          {note}
        </span>
      ))}
    </span>
  );
}
