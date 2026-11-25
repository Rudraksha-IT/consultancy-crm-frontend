"use client";

import Link from "next/link";

import { RangeForm } from "@/components/features/reports/RangeForm";
import { useDates, type Dates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { Section } from "@/components/ui/Section";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatPlainNumber } from "@/components/ui/chartTypes";
import { ROUTES } from "@/constants/routes";
import {
  PROGRESS_COUNT_LABELS,
  PROGRESS_PERIOD_LABELS,
  PROGRESS_TEXT,
  MAX_LISTED_CHANGES,
  ProgressPeriod,
} from "@/constants/staffProgress";
import type { DateRange, ProgressCard, ProgressChange, StaffProgress } from "@/lib/api";
import { formatNpr } from "@/lib/money";

import { changeTitle, dayHeading } from "./changeText";
import type { ProgressState } from "./useStaffProgress";

const PERIOD_OPTIONS = Object.values(ProgressPeriod).map((value) => ({
  value,
  label: PROGRESS_PERIOD_LABELS[value],
}));

type ProgressBodyProps = {
  state: ProgressState;
  period: ProgressPeriod;
  onPeriod: (period: ProgressPeriod) => void;
  /** The days asked for. */
  range: DateRange;
  /** Picked dates to show ("Pick dates"). */
  onPick: (range: DateRange) => void;
  /** "What they did" on an employee's page, "What you did" on My progress. */
  listTitle: string;
  /** Teachers can't open Students, so their names aren't links for them. */
  canOpenStudents: boolean;
};

/**
 * Staff Progress for a period (spec 125; issue 84): the period picker, the number cards and,
 * underneath, the changes they made grouped by day, newest first.
 */
export function ProgressBody({
  state,
  period,
  onPeriod,
  range,
  onPick,
  ...list
}: ProgressBodyProps) {
  const dates = useDates();
  return (
    <div className="grid min-w-0 gap-8">
      <div className="grid gap-4">
        <SegmentedControl
          label={PROGRESS_TEXT.period}
          options={PERIOD_OPTIONS}
          value={period}
          onChange={onPeriod}
        />
        {period === ProgressPeriod.Custom && (
          <RangeForm
            range={range}
            fieldErrors={state.status === "refused" ? state.fieldErrors : {}}
            onShow={onPick}
          />
        )}
        <p className="text-secondary text-ink-2">
          {PROGRESS_TEXT.periodLine(dates.date(range.from), dates.date(range.to))}
        </p>
      </div>
      <Loaded state={state} dates={dates} {...list} />
    </div>
  );
}

type LoadedProps = Pick<ProgressBodyProps, "state" | "listTitle" | "canOpenStudents"> & {
  dates: Dates;
};

function Loaded({ state, dates, listTitle, canOpenStudents }: LoadedProps) {
  if (state.status === "loading") return <p className="text-ink-2">{PROGRESS_TEXT.loading}</p>;
  // Refused dates are shown on the date fields themselves.
  if (state.status === "refused") return null;
  if (state.status !== "loaded") return <Banner tone="problem">{PROGRESS_TEXT.failed}</Banner>;
  return (
    <>
      <Cards cards={state.data.cards} dates={dates} />
      <Section title={listTitle}>
        <Changes progress={state.data} dates={dates} canOpenStudents={canOpenStudents} />
      </Section>
    </>
  );
}

function Cards({ cards, dates }: { cards: readonly ProgressCard[]; dates: Dates }) {
  if (cards.length === 0) {
    return (
      <Panel>
        <EmptyState>{PROGRESS_TEXT.noCards}</EmptyState>
      </Panel>
    );
  }
  return (
    <TileGrid>
      {cards.map((card) => (
        <FigureTile
          key={card.count}
          label={PROGRESS_COUNT_LABELS[card.count]}
          value={formatPlainNumber(card.value)}
          footnote={footnoteOf(card, dates)}
        />
      ))}
    </TileGrid>
  );
}

/** When counting began, if later than the period's start; or the money in Payments taken. */
function footnoteOf(card: ProgressCard, dates: Dates): string | undefined {
  if (card.countedFrom !== null) return PROGRESS_TEXT.countedFrom(dates.date(card.countedFrom));
  if (card.amount !== null && card.value > 0) return formatNpr(card.amount);
  return undefined;
}

type ChangesProps = { progress: StaffProgress; dates: Dates; canOpenStudents: boolean };

function Changes({ progress, dates, canOpenStudents }: ChangesProps) {
  return (
    <Panel>
      {progress.days.length === 0 ? (
        <EmptyState>{PROGRESS_TEXT.nothing}</EmptyState>
      ) : (
        <div className="divide-rule divide-y">
          {progress.days.map((day) => (
            <div key={day.day} className="px-gutter grid gap-2 py-4">
              <h3 className="text-body flex flex-wrap items-baseline gap-x-3 font-semibold">
                {dayHeading(day.day, dates)}
                <span className="text-small text-ink-2 font-normal">
                  {PROGRESS_TEXT.changes(day.entries.length)}
                </span>
              </h3>
              <ul className="grid gap-1">
                {day.entries.map((change, index) => (
                  <ChangeRow
                    // A change has no id of its own; its place in the day is stable.
                    key={`${change.kind}-${change.at}-${String(index)}`}
                    change={change}
                    dates={dates}
                    canOpenStudents={canOpenStudents}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {progress.more && <PanelFoot>{PROGRESS_TEXT.more(MAX_LISTED_CHANGES)}</PanelFoot>}
    </Panel>
  );
}

function ChangeRow({
  change,
  dates,
  canOpenStudents,
}: {
  change: ProgressChange;
  dates: Dates;
  canOpenStudents: boolean;
}) {
  const { student } = change;
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-3 break-words">
      <span className="min-w-0 py-2.5">{changeTitle(change, dates)}</span>
      {student !== null &&
        (canOpenStudents ? (
          <Link
            href={ROUTES.student(student.id)}
            className="text-secondary text-accent min-h-control inline-flex items-center break-words underline-offset-4 hover:underline"
          >
            {student.name}
          </Link>
        ) : (
          <span className="text-secondary text-ink-2 break-words">{student.name}</span>
        ))}
    </li>
  );
}
