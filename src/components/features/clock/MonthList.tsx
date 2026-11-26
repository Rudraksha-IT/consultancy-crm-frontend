"use client";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { DataCell, DataRow, DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pager } from "@/components/ui/Pager";
import { CLOCK_LIST_PAGE_SIZE, CLOCK_TEXT as TEXT, DayStatus } from "@/constants/clock";
import { WORK_FROM_HOME_TEXT } from "@/constants/workFromHome";
import type { ClockDay, ClockMonth } from "@/lib/api";
import { dayStatus, listedDays, officeTime, pageOf, shortHours, weekdayName } from "@/lib/clock";
import { formatMonth } from "@/lib/dates";

type MonthListProps = {
  month: ClockMonth;
  /** Which ten days show, from 1; kept by whoever shows the month, so a redraw keeps the page. */
  page: number;
  onPage: (page: number) => void;
};

const HEAD = "px-3 py-3 text-left";
const CELL = "px-3 py-3 align-middle";
const TIME = `${CELL} tabular-nums whitespace-nowrap`;

/**
 * One person's month as a list (UI revamp 16): the days up to today, newest first, ten a page,
 * each with its first clock-in, last clock-out, hours and what kind of day it was, in words. On a
 * phone a row is the day, its times on one line and the status.
 */
export function MonthList({ month, page, onPage }: MonthListProps) {
  const days = listedDays(month.days);
  const monthName = formatMonth(month.month);
  if (days.length === 0) return <EmptyState>{TEXT.nothingYet}</EmptyState>;
  const isThisMonth = days.some((day) => day.isToday);
  return (
    <>
      <DataTable phone="list" label={TEXT.listLabel(monthName)}>
        <thead>
          <tr>
            {[TEXT.day, TEXT.timeIn, TEXT.timeOut, TEXT.hours, TEXT.status].map((heading) => (
              <th key={heading} scope="col" className={HEAD}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-rule divide-y">
          {pageOf(days, page, CLOCK_LIST_PAGE_SIZE).map((day) => (
            <DayRow key={day.date} day={day} />
          ))}
        </tbody>
      </DataTable>
      <Pager
        summary={(isThisMonth ? TEXT.daysSoFar : TEXT.daysIn)(days.length, monthName)}
        count={days.length}
        page={page}
        pageSize={CLOCK_LIST_PAGE_SIZE}
        onPage={onPage}
      />
    </>
  );
}

function DayRow({ day }: { day: ClockDay }) {
  const dates = useDates();
  const times = timesOf(day);
  return (
    // Today stands out with a light tint, and says so in words beside its weekday.
    <DataRow className={day.isToday ? "phone:bg-tint/55" : ""}>
      <DataCell part="title" className={CELL}>
        <b className="font-semibold">{dates.date(day.date)}</b>
        <span className="text-secondary text-ink-2 block font-normal">{weekdayWords(day)}</span>
      </DataCell>
      <DataCell className={TIME}>{times.start}</DataCell>
      <DataCell className={TIME}>{times.end}</DataCell>
      <DataCell className={TIME}>{times.hours}</DataCell>
      <DataCell part="fact" className={CELL}>
        <DayStatusWords day={day} />
      </DataCell>
      {/* Phones only: the times on one line under the day, in place of the three columns. */}
      <DataCell part="line" className="phone:hidden tabular-nums">
        {timesLine(times)}
      </DataCell>
    </DataRow>
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
    <span className="max-phone:flex-col max-phone:items-end max-phone:gap-y-0 flex min-w-0 flex-wrap items-center gap-x-2.5">
      {look !== null && <Chip tone={look.tone}>{look.label}</Chip>}
      {notes.map((note) => (
        <span key={note} className="text-small text-ink-2 font-normal">
          {note}
        </span>
      ))}
    </span>
  );
}
