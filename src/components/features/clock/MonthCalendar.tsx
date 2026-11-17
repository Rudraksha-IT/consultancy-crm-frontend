"use client";

import clsx from "clsx";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Button } from "@/components/ui/Button";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { CLOCK_TEXT as TEXT, WEEKDAYS } from "@/constants/clock";
import { WORK_FROM_HOME_TEXT } from "@/constants/workFromHome";
import type { ClockDay, ClockMonth } from "@/lib/api";
import { durationText, hoursText, leadingBlanks, officeTime, shortHours } from "@/lib/clock";
import { formatMonth } from "@/lib/dates";

type MonthCalendarProps = {
  month: ClockMonth;
  /** Admins: open a day that can be corrected. Without it, no day opens. */
  onOpenDay?: (day: ClockDay) => void;
};

/**
 * One person's month of clock-ins (spec 106): four figures, then a Sunday-first calendar with
 * each day's hours, first clock-in and last clock-out. Day off, Not in, Short day, No out and
 * Corrected are written as words as well as coloured. Days split at midnight, Nepal time.
 */
export function MonthCalendar({ month, onOpenDay }: MonthCalendarProps) {
  const monthName = formatMonth(month.month);
  const working = hoursText(month.workingDayMinutes);
  return (
    <div className="grid gap-6">
      <Figures month={month} monthName={monthName} />
      <Panel>
        <div
          role="group"
          aria-label={TEXT.calendarLabel(monthName)}
          className="phone:gap-1.5 phone:p-6 grid grid-cols-7 gap-1 p-3"
        >
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              aria-hidden="true"
              className="text-tiny text-ink-3 pb-0.5 text-center font-semibold"
            >
              {weekday}
            </div>
          ))}
          {Array.from({ length: leadingBlanks(month.month) }, (_, blank) => (
            <div key={`blank-${String(blank)}`} aria-hidden="true" />
          ))}
          {month.days.map((day) => (
            <DayCell key={day.date} day={day} onOpen={onOpenDay} />
          ))}
        </div>
        <Legend working={working} />
        {onOpenDay !== undefined && <CorrectableDays month={month} onOpen={onOpenDay} />}
        <Corrections month={month} />
        <PanelFoot>{onOpenDay === undefined ? TEXT.staffHelp : TEXT.adminHelp(working)}</PanelFoot>
      </Panel>
    </div>
  );
}

function Figures({ month, monthName }: { month: ClockMonth; monthName: string }) {
  const { figures } = month;
  const average =
    figures.daysWorked === 0
      ? undefined
      : TEXT.aboutADay(durationText(figures.minutes / figures.daysWorked));
  return (
    <TileGrid columns={4}>
      <FigureTile label={TEXT.daysWorked} value={figures.daysWorked} footnote={monthName} />
      <FigureTile label={TEXT.hours} value={hoursText(figures.minutes)} footnote={average} />
      <FigureTile
        label={TEXT.shortDays}
        value={figures.shortDays}
        footnote={TEXT.under(hoursText(month.workingDayMinutes))}
        tone={figures.shortDays > 0 ? "warn" : undefined}
      />
      <FigureTile
        label={TEXT.noClockOut}
        value={figures.missingClockOuts}
        tone={figures.missingClockOuts > 0 ? "warn" : undefined}
      />
    </TileGrid>
  );
}

const CELL =
  "min-h-cal-day-sm phone:min-h-cal-day rounded-control border-rule bg-paper text-tiny text-ink-2 grid min-w-0 content-start gap-px border p-1 phone:p-2 text-left";

function cellClasses(day: ClockDay, isButton: boolean): string {
  return clsx(CELL, {
    "bg-fill text-ink-3": day.isDayOff || day.holiday !== null,
    "border-dashed bg-transparent": day.isLater,
    "border-accent ring-accent ring-1 ring-inset": day.isToday,
    "border-warn": day.isShort,
    "border-warn bg-warn-tint text-warn": day.isMissingClockOut,
    "hover:border-accent cursor-pointer": isButton,
  });
}

function DayCell({
  day,
  onOpen,
}: {
  day: ClockDay;
  onOpen: ((day: ClockDay) => void) | undefined;
}) {
  const dates = useDates();
  const label = dayLabel(day, dates.date(day.date));
  const content = (
    <>
      <span aria-hidden="true" className="text-ink-3 font-bold">
        {Number(day.date.slice(-2))}
      </span>
      <DayWords day={day} />
    </>
  );
  if (onOpen !== undefined && day.isCorrectable) {
    // Above 600px the day itself opens. A phone-width cell is too narrow to tap, so there it
    // only shows the day, and the list under the calendar opens it.
    return (
      <>
        <button
          type="button"
          className={clsx(cellClasses(day, true), "max-phone:hidden")}
          onClick={() => {
            onOpen(day);
          }}
        >
          <span className="sr-only">{`${label}${TEXT.dayLabel.openToCorrect}`}</span>
          {content}
        </button>
        <div className={clsx(cellClasses(day, false), "phone:hidden")}>
          <span className="sr-only">{label}</span>
          {content}
        </div>
      </>
    );
  }
  return (
    <div className={cellClasses(day, false)}>
      <span className="sr-only">{label}</span>
      {content}
    </div>
  );
}

const LINE = "truncate";

/** What a day shows: hours, times and its words (never only a colour). */
function DayWords({ day }: { day: ClockDay }) {
  if (day.isLater) return null;
  if (day.sessions.length === 0) {
    return (
      <span aria-hidden="true" className={LINE}>
        {emptyDayWord(day)}
      </span>
    );
  }
  return <WorkedDayWords day={day} />;
}

function emptyDayWord(day: ClockDay): string {
  if (day.holiday !== null) return day.holiday;
  if (day.isDayOff) return TEXT.dayOff;
  return day.isNotIn ? TEXT.notInDay : "";
}

/** Words that mark a worked day, besides its hours and times. */
const DAY_MARKS = [
  {
    isShown: (day: ClockDay) => day.isShort,
    text: () => TEXT.shortDay,
    className: "text-warn font-semibold",
  },
  { isShown: (day: ClockDay) => day.isDayOff, text: () => TEXT.dayOff, className: "" },
  // A holiday's name (asked 2026-11-16).
  {
    isShown: (day: ClockDay) => day.holiday !== null,
    text: (day: ClockDay) => day.holiday ?? "",
    className: "",
  },
] as const;

function WorkedDayWords({ day }: { day: ClockDay }) {
  const isWarn = day.isShort || day.isMissingClockOut;
  return (
    <span aria-hidden="true" className="grid min-w-0 gap-px">
      <b className={clsx("phone:text-small text-ink tabular-nums", LINE, { "text-warn": isWarn })}>
        {day.isMissingClockOut ? TEXT.noOut : shortHours(day.minutes)}
      </b>
      <span className={clsx("max-phone:hidden tabular-nums", LINE)}>{inWords(day)}</span>
      <span className={clsx("max-phone:hidden tabular-nums", LINE)}>{outWords(day)}</span>
      {DAY_MARKS.filter((mark) => mark.isShown(day)).map((mark) => (
        <span key={mark.text(day)} className={clsx(LINE, mark.className)}>
          {mark.text(day)}
        </span>
      ))}
      {day.isCorrected && <CorrectedMark />}
      {day.isHome && <HomeMark />}
    </span>
  );
}

/** Worked on Approved Work From Home dates (issue 87): taken from the dates, never the address. */
function HomeMark() {
  return (
    <span className={clsx("text-accent inline-flex items-center gap-0.5 font-semibold", LINE)}>
      <Icon name="home" size="sm" />
      {WORK_FROM_HOME_TEXT.homeTag}
    </span>
  );
}

function CorrectedMark() {
  return (
    <span className={clsx("text-accent inline-flex items-center gap-0.5 font-semibold", LINE)}>
      <Icon name="edit" size="sm" />
      {TEXT.corrected}
    </span>
  );
}

function inWords(day: ClockDay): string {
  return day.firstIn === null ? "" : `${officeTime(day.firstIn)} –`;
}

function outWords(day: ClockDay): string {
  if (day.isStillIn) return TEXT.stillIn;
  if (day.lastOut !== null) return officeTime(day.lastOut);
  return TEXT.noClockOutShort;
}

/** The whole day in words for screen readers, e.g. "4 Nov 2026: 8 h 24 min, in 9:02 AM, …". */
export function dayLabel(day: ClockDay, shown: string): string {
  if (day.isLater) return TEXT.dayLabel.later(shown);
  if (day.sessions.length === 0) return emptyDayLabel(day, shown);
  return `${shown}: ${workedParts(day).join(", ")}`;
}

function emptyDayLabel(day: ClockDay, shown: string): string {
  if (day.holiday !== null) return TEXT.dayLabel.holiday(shown, day.holiday);
  if (day.isDayOff) return TEXT.dayLabel.dayOff(shown);
  return day.isNotIn ? TEXT.dayLabel.notIn(shown) : shown;
}

function workedParts(day: ClockDay): string[] {
  const parts: [isShown: boolean, text: string][] = [
    [true, day.isMissingClockOut ? TEXT.noClockOutShort : durationText(day.minutes)],
    [day.isShort, TEXT.shortDay.toLowerCase()],
    [day.firstIn !== null, `in ${officeTime(day.firstIn ?? "")}`],
    [true, day.isMissingClockOut ? TEXT.outMissing : `out ${outWords(day)}`],
    [day.isDayOff, TEXT.dayOff.toLowerCase()],
    [day.holiday !== null, `${TEXT.holiday.toLowerCase()}: ${day.holiday ?? ""}`],
    [day.isCorrected, TEXT.corrected.toLowerCase()],
    [day.isHome, WORK_FROM_HOME_TEXT.homeLabel],
  ];
  return parts.filter(([isShown]) => isShown).map(([, text]) => text);
}

/** On phones: the days that can be corrected, as full-size rows (the cells are too small). */
function CorrectableDays({
  month,
  onOpen,
}: {
  month: ClockMonth;
  onOpen: (day: ClockDay) => void;
}) {
  const dates = useDates();
  const days = month.days.filter((day) => day.isCorrectable);
  if (days.length === 0) return null;
  return (
    <div className="phone:hidden border-rule border-t">
      <RowList label={TEXT.daysToCorrect}>
        {days.map((day) => (
          <RowItem
            key={day.date}
            title={dates.date(day.date)}
            meta={correctableWords(day)}
            right={
              <Button
                size="sm"
                onClick={() => {
                  onOpen(day);
                }}
              >
                <span aria-hidden="true">{TEXT.correct}</span>
                <span className="sr-only">{TEXT.correctDay(dates.date(day.date))}</span>
              </Button>
            }
          />
        ))}
      </RowList>
    </div>
  );
}

function correctableWords(day: ClockDay): string {
  if (day.isMissingClockOut) return TEXT.noClockOut;
  if (day.sessions.length === 0) return TEXT.notInDay;
  return `${TEXT.shortDay}, ${durationText(day.minutes)}`;
}

function Legend({ working }: { working: string }) {
  const swatch = "rounded-chip border-rule bg-paper size-3.5 border";
  return (
    <ul
      aria-label={TEXT.legendLabel}
      className="text-small text-ink-2 phone:px-6 flex flex-wrap gap-x-4.5 gap-y-2 px-3 pb-4.5"
    >
      <li className="inline-flex items-center gap-1.5">
        <i aria-hidden="true" className={swatch} />
        {TEXT.legendFull(working)}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <i aria-hidden="true" className={clsx(swatch, "border-warn")} />
        {TEXT.shortDay}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <i aria-hidden="true" className={clsx(swatch, "border-warn bg-warn-tint")} />
        {TEXT.noClockOut}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <i aria-hidden="true" className={clsx(swatch, "bg-fill")} />
        {TEXT.dayOff}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <i aria-hidden="true" className={clsx(swatch, "bg-fill")} />
        {TEXT.holiday}
      </li>
    </ul>
  );
}

function Corrections({ month }: { month: ClockMonth }) {
  const dates = useDates();
  if (month.corrections.length === 0) return null;
  return (
    <div className="border-rule bg-fill text-secondary text-ink-2 grid gap-2 border-t px-6 py-4">
      <b className="text-ink">{TEXT.corrections}</b>
      <ul className="grid gap-1">
        {month.corrections.map((change) => (
          <li key={change.id} className="break-words">
            {`${TEXT.correctionLine(dates.date(change.day), change.before, change.after)} “${change.reason}” ${TEXT.correctionBy(change.by, dates.dateTime(change.at))}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
