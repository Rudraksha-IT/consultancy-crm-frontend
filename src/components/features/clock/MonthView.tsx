"use client";

import { useDates } from "@/components/features/shell/dateDisplay";
import { FigureTile } from "@/components/ui/FigureTile";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { TileGrid } from "@/components/ui/TileGrid";
import { ViewSwitch } from "@/components/ui/ViewSwitch";
import { CLOCK_TEXT as TEXT, ClockView } from "@/constants/clock";
import type { ClockDay, ClockMonth } from "@/lib/api";
import { durationText, hoursText } from "@/lib/clock";
import { formatMonth } from "@/lib/dates";

import { MonthCalendar } from "./MonthCalendar";
import { MonthList } from "./MonthList";
import { MonthStepper } from "./MonthStepper";
import { useClockView } from "./useClockView";

const VIEW_OPTIONS = [
  { value: ClockView.Calendar, label: TEXT.calendar, icon: "batches" },
  { value: ClockView.List, label: TEXT.list, icon: "list" },
] as const;

type MonthViewProps = {
  month: ClockMonth;
  /**
   * The month chosen and how to change it: given, the month's name sits between two arrows on
   * the line of the Calendar / List switch. `chosen` may be a step ahead of `month` while the
   * next one loads.
   */
  stepper?: { chosen: string; onMonth: (month: string) => void };
  /** Admins: open a day that can be corrected. Without it, no day opens. */
  onOpenDay?: (day: ClockDay) => void;
};

/**
 * One person's month of clock-ins (spec 106; UI revamp 16): four figures, then the month as a
 * Calendar or a List, chosen with a small switch and remembered on the device. A phone shows the
 * List only, with no switch. Under either: the corrections made, and how a day gets corrected.
 * For an Admin the Calendar's days open; in the List a day that can be corrected has a Correct
 * button in its row.
 */
export function MonthView({ month, stepper, onOpenDay }: MonthViewProps) {
  const { view, isList, storeView } = useClockView();
  const working = hoursText(month.workingDayMinutes);
  return (
    <div className="grid gap-6">
      <Figures month={month} />
      <div className="grid gap-2.5">
        <MonthBar stepper={stepper} view={view} onView={storeView} />
        <Panel>
          {isList ? (
            <MonthList month={month} onOpenDay={onOpenDay} />
          ) : (
            <MonthCalendar month={month} onOpenDay={onOpenDay} />
          )}
          <Corrections month={month} />
          <PanelFoot>
            {onOpenDay === undefined ? TEXT.staffHelp : TEXT.adminHelp(working)}
          </PanelFoot>
        </Panel>
      </div>
    </div>
  );
}

type MonthBarProps = {
  stepper: MonthViewProps["stepper"] | undefined;
  /** The view shown, or null on a phone: the List, with no switch. */
  view: ClockView | null;
  onView: (view: ClockView) => void;
};

/**
 * Above the month: which month, on the left, and Calendar or List, on the right, on one line
 * (owner, 2026-11-27). Either may be missing: a phone has no switch, a popup no arrows.
 */
function MonthBar({ stepper, view, onView }: MonthBarProps) {
  if (stepper === undefined && view === null) return null;
  return (
    // The month and its arrows in the middle of the line, the switch at its right (owner).
    <div data-swap-bar="" className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      {stepper !== undefined && (
        <MonthStepper value={stepper.chosen} onChange={stepper.onMonth} className="col-start-2" />
      )}
      {view !== null && (
        <span className="col-start-3 justify-self-end">
          <ViewSwitch
            label={TEXT.showMonthAs}
            options={VIEW_OPTIONS}
            value={view}
            onChange={onView}
          />
        </span>
      )}
    </div>
  );
}

function Figures({ month }: { month: ClockMonth }) {
  const { figures } = month;
  const average =
    figures.daysWorked === 0
      ? undefined
      : TEXT.aboutADay(durationText(figures.minutes / figures.daysWorked));
  return (
    <TileGrid columns={4}>
      <FigureTile
        label={TEXT.daysWorked}
        value={figures.daysWorked}
        footnote={formatMonth(month.month)}
      />
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

function Corrections({ month }: { month: ClockMonth }) {
  const dates = useDates();
  if (month.corrections.length === 0) return null;
  return (
    <div className="border-rule text-secondary text-ink-2 px-gutter grid gap-2 border-t py-4">
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
