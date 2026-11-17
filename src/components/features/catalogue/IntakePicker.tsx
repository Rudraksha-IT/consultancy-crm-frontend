"use client";

import clsx from "clsx";
import { useId, useState } from "react";

import { describeField, FieldNote } from "@/components/ui/FieldNote";
import { IconButton } from "@/components/ui/IconButton";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { gridYears, monthsOf, startYear, toggleIntake } from "@/lib/catalogue";
import { formatIntake } from "@/lib/dates";

type IntakePickerProps = {
  label: string;
  /** The chosen Intakes ("YYYY-MM"), in date order. */
  intakes: readonly string[];
  onChange: (intakes: string[]) => void;
  errors?: readonly string[] | undefined;
  isDisabled?: boolean;
  /** Today, for which months have gone by; the real day unless a test gives one. */
  today?: Date;
};

/**
 * Intakes picked on a month grid, one year at a time with ‹ ›: a month is added by clicking it
 * and taken off by clicking it again; months gone by can't be picked. Every chosen Intake also
 * shows as a chip with × (issue 92). Never typed.
 */
export function IntakePicker(props: IntakePickerProps) {
  const { label, intakes, onChange, errors, isDisabled = false } = props;
  const today = props.today ?? new Date();
  const noteId = useId();
  const [year, setYear] = useState(() => startYear(intakes, today));
  const description = describeField(errors, undefined);

  return (
    <fieldset
      aria-describedby={description === undefined ? undefined : noteId}
      aria-invalid={description === undefined ? undefined : true}
      className="grid min-w-0 gap-3"
      disabled={isDisabled}
    >
      <legend className="text-body text-ink mb-2 font-semibold">{label}</legend>
      <div className="border-rule rounded-panel max-w-month-grid grid w-full gap-2 border p-3">
        <YearSwitch year={year} today={today} isDisabled={isDisabled} onYear={setYear} />
        <div
          role="group"
          aria-label={CATALOGUE_TEXT.intakesIn(year)}
          className="phone:grid-cols-6 grid grid-cols-4 gap-1.5"
        >
          {monthsOf(year, intakes, today).map((month) => (
            <button
              key={month.value}
              type="button"
              aria-pressed={month.isChosen}
              aria-label={month.fullLabel}
              disabled={month.isDisabled}
              onClick={() => {
                onChange(toggleIntake(intakes, month.value));
              }}
              className={clsx(
                "min-h-control rounded-control cursor-pointer border font-semibold disabled:cursor-not-allowed disabled:opacity-40",
                month.isChosen
                  ? "bg-accent border-accent text-accent-ink"
                  : "bg-paper border-rule-2 text-ink hover:border-accent",
              )}
            >
              {month.label}
            </button>
          ))}
        </div>
      </div>
      <IntakeChips
        intakes={intakes}
        emptyText={CATALOGUE_TEXT.noIntakesPicked}
        removeLabel={CATALOGUE_TEXT.removeIntake}
        isDisabled={isDisabled}
        onRemove={(intake) => {
          onChange(toggleIntake(intakes, intake));
        }}
      />
      <FieldNote id={noteId} description={description} />
    </fieldset>
  );
}

type YearSwitchProps = {
  year: number;
  today: Date;
  isDisabled: boolean;
  onYear: (year: number) => void;
};

/** ‹ year ›: from this year to four years on. */
function YearSwitch({ year, today, isDisabled, onYear }: YearSwitchProps) {
  const { first, last } = gridYears(today);
  return (
    <div className="flex items-center justify-between">
      <IconButton
        icon="left"
        label={CATALOGUE_TEXT.previousYear}
        isDisabled={isDisabled || year <= first}
        onClick={() => {
          onYear(year - 1);
        }}
      />
      <b className="text-card-title text-ink">{year}</b>
      <IconButton
        icon="right"
        label={CATALOGUE_TEXT.nextYear}
        isDisabled={isDisabled || year >= last}
        onClick={() => {
          onYear(year + 1);
        }}
      />
    </div>
  );
}

type IntakeChipsProps = {
  intakes: readonly string[];
  emptyText: string;
  /** The × button's name for one Intake ("Remove intake Feb 2027"). */
  removeLabel: (intake: string) => string;
  /** Leave out to show the chips without ×. */
  onRemove?: ((intake: string) => void) | undefined;
  isDisabled?: boolean;
};

/** The chosen Intakes as chips ("Feb 2027"), each with a × to take it off when allowed. */
export function IntakeChips({
  intakes,
  emptyText,
  removeLabel,
  onRemove,
  isDisabled = false,
}: IntakeChipsProps) {
  if (intakes.length === 0) {
    return <span className="text-secondary text-ink-2">{emptyText}</span>;
  }
  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {intakes.map((intake) => (
        <li
          key={intake}
          className="rounded-pill bg-fill-2 text-small text-ink inline-flex items-center gap-0.5 font-semibold whitespace-nowrap"
        >
          <IntakeChip
            label={formatIntake(intake)}
            removeLabel={removeLabel}
            isDisabled={isDisabled}
            onRemove={
              onRemove === undefined
                ? undefined
                : () => {
                    onRemove(intake);
                  }
            }
          />
        </li>
      ))}
    </ul>
  );
}

type IntakeChipProps = {
  label: string;
  removeLabel: (intake: string) => string;
  isDisabled: boolean;
  onRemove: (() => void) | undefined;
};

function IntakeChip({ label, removeLabel, isDisabled, onRemove }: IntakeChipProps) {
  if (onRemove === undefined) return <span className="px-3 leading-7">{label}</span>;
  return (
    <>
      <span className="pl-3">{label}</span>
      <IconButton icon="x" label={removeLabel(label)} isDisabled={isDisabled} onClick={onRemove} />
    </>
  );
}
