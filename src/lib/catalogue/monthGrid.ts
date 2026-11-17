import { formatIntake } from "@/lib/dates";

/** How many years on from this one the month grid goes. */
const YEARS_AHEAD = 4;
const MONTHS_IN_A_YEAR = 12;

/** One month button of the Intake month grid (issue 92). */
export type GridMonth = {
  /** As stored: "YYYY-MM". */
  value: string;
  /** On the button: "Jan". */
  label: string;
  /** For screen readers and chips: "Jan 2030". */
  fullLabel: string;
  isChosen: boolean;
  /** A month gone by can't be picked; one already chosen can still be taken off. */
  isDisabled: boolean;
};

/** The stored month ("YYYY-MM") a day falls in. */
export function monthOf(day: Date): string {
  return `${String(day.getFullYear())}-${String(day.getMonth() + 1).padStart(2, "0")}`;
}

/** Add `month` to the Intakes, or take it off when it is there; kept in date order, each once. */
export function toggleIntake(intakes: readonly string[], month: string): string[] {
  const kept = new Set(intakes);
  if (kept.has(month)) kept.delete(month);
  else kept.add(month);
  return [...kept].sort();
}

/** Whether `month` is before this one, so it can't be added. */
export function isGoneBy(month: string, today: Date): boolean {
  return month < monthOf(today);
}

/** The years the grid can show: this year to four years on. */
export function gridYears(today: Date): { first: number; last: number } {
  const first = today.getFullYear();
  return { first, last: first + YEARS_AHEAD };
}

/** The year the grid opens on: that of the first upcoming Intake, or this year. */
export function startYear(intakes: readonly string[], today: Date): number {
  const { first, last } = gridYears(today);
  const upcoming = intakes.map((intake) => Number(intake.slice(0, 4))).find((y) => y >= first);
  return Math.min(upcoming ?? first, last);
}

/** The twelve month buttons of `year`. */
export function monthsOf(year: number, intakes: readonly string[], today: Date): GridMonth[] {
  const chosen = new Set(intakes);
  return Array.from({ length: MONTHS_IN_A_YEAR }, (_, index) => {
    const value = `${String(year)}-${String(index + 1).padStart(2, "0")}`;
    const fullLabel = formatIntake(value);
    const isChosen = chosen.has(value);
    return {
      value,
      label: fullLabel.slice(0, 3),
      fullLabel,
      isChosen,
      isDisabled: !isChosen && isGoneBy(value, today),
    };
  });
}
