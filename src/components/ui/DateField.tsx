import { useId, useState } from "react";

import { DATE_TEXT, DateDisplay } from "@/constants/dates";
import { LABELS } from "@/constants/messages";
import { adToBs, BS_MONTHS, BS_YEARS, bsMonthDays, bsToAd, formatOtherCalendar } from "@/lib/dates";

import { Button } from "./Button";
import { CONTROL_CLASSES, Field, LABEL_CLASSES, type FieldProps } from "./Field";
import { describeField, FieldNote, type FieldDescription } from "./FieldNote";

/** AD dates ("YYYY-MM-DD"), whatever the calendar shown. */
type ValueProps = {
  defaultValue?: string | undefined;
  /** Set together with `onChange` to control the value. */
  value?: string | undefined;
  onChange?: ((iso: string) => void) | undefined;
};

type DateFieldProps = FieldProps &
  ValueProps & {
    name: string;
    /** The office's calendar: AD is a date input, BS is a day, month and year. */
    display: DateDisplay;
    /** The earliest and latest allowed (AD), checked by the date input in AD. */
    min?: string;
    max?: string;
    /** Show the same day in the other calendar under the field, e.g. on Payments. */
    showsOtherCalendar?: boolean;
  };

/**
 * A labelled date in the office's calendar. Whatever is shown, the form gets the AD date under
 * `name` ("" until a whole, real date is chosen), so dates are always sent and stored in AD.
 */
export function DateField({ display, ...props }: DateFieldProps) {
  return display === DateDisplay.BS ? <BsDateField {...props} /> : <AdDateField {...props} />;
}

type CalendarFieldProps = Omit<DateFieldProps, "display">;

/** The AD date the field holds: what was typed, or a new value given from outside. */
function useIsoValue({ value, defaultValue, onChange }: ValueProps) {
  const [iso, setIso] = useState(() => value ?? defaultValue ?? "");
  useFollowGivenValue(value, iso, setIso);
  function change(next: string): void {
    setIso(next);
    if (next !== iso) onChange?.(next);
  }
  return { iso, change };
}

/** Calls `follow` when the value given from outside changes to one the field doesn't hold. */
function useFollowGivenValue(
  value: string | undefined,
  current: string,
  follow: (value: string) => void,
): void {
  const [given, setGiven] = useState(value);
  if (value === given) return;
  setGiven(value);
  if (value !== undefined && value !== current) follow(value);
}

/** The same day in the other calendar, when the field shows it. */
function otherCalendarHint(iso: string, display: DateDisplay, shows: boolean | undefined) {
  return shows === true ? (formatOtherCalendar(iso, display) ?? undefined) : undefined;
}

function AdDateField({
  name,
  min,
  max,
  showsOtherCalendar,
  hint,
  value,
  defaultValue,
  onChange,
  ...field
}: CalendarFieldProps) {
  const { iso, change } = useIsoValue({ value, defaultValue, onChange });
  const other = otherCalendarHint(iso, DateDisplay.AD, showsOtherCalendar);

  return (
    <Field {...field} hint={hint ?? other}>
      {(control) => (
        <input
          {...control}
          name={name}
          type="date"
          min={min}
          max={max}
          value={iso}
          onChange={(event) => {
            change(event.target.value);
          }}
        />
      )}
    </Field>
  );
}

type Parts = { day: string; month: string; year: string };

const EMPTY: Parts = { day: "", month: "", year: "" };
const LONGEST_MONTH = 32;
const YEAR_DIGITS = 4;
const NOT_DIGITS = /\D/g;

function partsOf(iso: string): Parts {
  const bs = adToBs(iso);
  if (bs === null) return EMPTY;
  return { day: String(bs.day), month: String(bs.month), year: String(bs.year) };
}

function isKnownYear(year: string): boolean {
  const value = Number(year);
  return year.length === YEAR_DIGITS && value >= BS_YEARS.first && value <= BS_YEARS.last;
}

/** How many days to offer: the chosen month's length, or the longest while it isn't known. */
function daysIn(parts: Parts): number {
  if (!isKnownYear(parts.year)) return LONGEST_MONTH;
  return bsMonthDays(Number(parts.year), Number(parts.month)) ?? LONGEST_MONTH;
}

/** The parts with the day kept inside the chosen month. */
function keepDayInMonth(parts: Parts): Parts {
  const days = daysIn(parts);
  return Number(parts.day) > days ? { ...parts, day: String(days) } : parts;
}

function isoOf(parts: Parts): string {
  if (!isKnownYear(parts.year) || parts.month === "" || parts.day === "") return "";
  const bs = { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
  return bsToAd(bs) ?? "";
}

/** Why the parts don't make a date yet, or undefined when they do (or are all empty). */
function problemWith(parts: Parts): string | undefined {
  if (Object.values(parts).every((part) => part === "")) return undefined;
  if (parts.year.length === YEAR_DIGITS && !isKnownYear(parts.year)) {
    return DATE_TEXT.bsYearRange(BS_YEARS.first, BS_YEARS.last);
  }
  return isoOf(parts) === "" ? DATE_TEXT.incomplete : undefined;
}

/** The day, month and year chosen, kept in step with the AD value. */
function useBsParts(valueProps: ValueProps) {
  const { iso, change } = useIsoValue(valueProps);
  const [parts, setParts] = useState(() => partsOf(iso));
  useFollowGivenValue(iso, isoOf(parts), (given) => {
    setParts(partsOf(given));
  });

  function update(changes: Partial<Parts>): void {
    const next = keepDayInMonth({ ...parts, ...changes });
    setParts(next);
    change(isoOf(next));
  }
  return { iso, parts, update };
}

function BsDateField({
  name,
  label,
  hint,
  isHintGood,
  errors,
  isOptional,
  isLabelHidden,
  showsOtherCalendar,
  value,
  defaultValue,
  onChange,
}: CalendarFieldProps) {
  const { iso, parts, update } = useBsParts({ value, defaultValue, onChange });
  const descriptionId = useId();
  const problem = problemWith(parts);
  const description = describeField(
    problem === undefined ? errors : [problem],
    hint ?? otherCalendarHint(iso, DateDisplay.BS, showsOtherCalendar),
    isHintGood,
  );
  const control = controlProps(description, isOptional !== true, descriptionId);

  return (
    <fieldset className="grid min-w-0 content-start gap-2">
      <BsLegend label={label} isOptional={isOptional === true} isHidden={isLabelHidden === true} />
      <input type="hidden" name={name} value={iso} />
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,2fr)] gap-2">
        <select
          {...control}
          aria-label={DATE_TEXT.day}
          value={parts.day}
          onChange={(event) => {
            update({ day: event.target.value });
          }}
        >
          <Placeholder text={DATE_TEXT.day} />
          {Array.from({ length: daysIn(parts) }, (_, index) => String(index + 1)).map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
        <select
          {...control}
          aria-label={DATE_TEXT.month}
          value={parts.month}
          onChange={(event) => {
            update({ month: event.target.value });
          }}
        >
          <Placeholder text={DATE_TEXT.month} />
          {BS_MONTHS.map((month, index) => (
            <option key={month} value={String(index + 1)}>
              {month}
            </option>
          ))}
        </select>
        <input
          {...control}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={YEAR_DIGITS}
          placeholder={DATE_TEXT.yearPlaceholder}
          aria-label={DATE_TEXT.year}
          value={parts.year}
          onChange={(event) => {
            update({ year: event.target.value.replace(NOT_DIGITS, "").slice(0, YEAR_DIGITS) });
          }}
        />
      </div>
      {isOptional === true && <ClearDate parts={parts} onClear={update} />}
      <FieldNote id={descriptionId} description={description} />
    </fieldset>
  );
}

/**
 * "Day" or "Month" in its box until one is chosen, but never a choice in the list (asked
 * 2026-11-17).
 */
function Placeholder({ text }: { text: string }) {
  return (
    <option value="" disabled hidden>
      {text}
    </option>
  );
}

/** Empties an optional date, now that Day and Month aren't choices in their lists. */
function ClearDate({ parts, onClear }: { parts: Parts; onClear: (parts: Parts) => void }) {
  if (Object.values(parts).every((part) => part === "")) return null;
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onClear(EMPTY);
        }}
      >
        {DATE_TEXT.clear}
      </Button>
    </div>
  );
}

/** What each of the three parts gets, as `Field` gives its one control. */
function controlProps(
  description: FieldDescription | undefined,
  isRequired: boolean,
  descriptionId: string,
) {
  return {
    required: isRequired,
    "aria-invalid": description?.tone === "error" ? true : undefined,
    "aria-describedby": description === undefined ? undefined : descriptionId,
    className: CONTROL_CLASSES,
  };
}

type BsLegendProps = { label: string; isOptional: boolean; isHidden: boolean };

/** The field's label, naming the group of three, like `Field`'s label does for one control. */
function BsLegend({ label, isOptional, isHidden }: BsLegendProps) {
  return (
    <legend className={isHidden ? "sr-only" : `${LABEL_CLASSES} mb-2`}>
      {isOptional ? `${label} ` : label}
      {isOptional && <span className="text-ink-2 font-normal">{LABELS.optional}</span>}
    </legend>
  );
}
