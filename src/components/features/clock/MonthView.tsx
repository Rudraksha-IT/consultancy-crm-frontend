"use client";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Button } from "@/components/ui/Button";
import { FigureTile } from "@/components/ui/FigureTile";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { TileGrid } from "@/components/ui/TileGrid";
import { ViewSwitch } from "@/components/ui/ViewSwitch";
import { CLOCK_TEXT as TEXT, ClockView } from "@/constants/clock";
import type { ClockDay, ClockMonth } from "@/lib/api";
import { durationText, hoursText } from "@/lib/clock";
import { formatMonth } from "@/lib/dates";

import { MonthCalendar } from "./MonthCalendar";
import { MonthList } from "./MonthList";
import { useClockView } from "./useClockView";

const VIEW_OPTIONS = [
  { value: ClockView.Calendar, label: TEXT.calendar, icon: "batches" },
  { value: ClockView.List, label: TEXT.list, icon: "list" },
] as const;

type MonthViewProps = {
  month: ClockMonth;
  /** The page of the month's List, from 1, and how to change it. */
  listPage: number;
  onListPage: (page: number) => void;
  /** Admins: open a day that can be corrected. Without it, no day opens. */
  onOpenDay?: (day: ClockDay) => void;
};

/**
 * One person's month of clock-ins (spec 106; UI revamp 16): four figures, then the month as a
 * Calendar or a List, chosen with a small switch and remembered on the device. A phone shows the
 * List only, with no switch. Under either: the corrections made, and how a day gets corrected.
 * For an Admin the Calendar's days open; beside the List the days that can be corrected are
 * listed with a button each, as a list row itself opens nothing.
 */
export function MonthView({ month, listPage, onListPage, onOpenDay }: MonthViewProps) {
  const { view, isList, storeView } = useClockView();
  const working = hoursText(month.workingDayMinutes);
  return (
    <div className="grid gap-6">
      <Figures month={month} />
      <div className="grid gap-2.5">
        {view !== null && (
          <div className="flex justify-end">
            <ViewSwitch
              label={TEXT.showMonthAs}
              options={VIEW_OPTIONS}
              value={view}
              onChange={storeView}
            />
          </div>
        )}
        <Panel>
          {isList ? (
            <>
              <MonthList month={month} page={listPage} onPage={onListPage} />
              {onOpenDay !== undefined && <CorrectableDays month={month} onOpen={onOpenDay} />}
            </>
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

/**
 * Beside the List: the days that can be corrected, the date and the reason on two lines, each
 * with its own Correct button.
 */
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
    <div className="border-rule border-t">
      <RowList label={TEXT.daysToCorrect}>
        {days.map((day) => (
          <RowItem
            key={day.date}
            title={dates.date(day.date)}
            meta={correctableWords(day)}
            keepsRightBesideOnPhone
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
