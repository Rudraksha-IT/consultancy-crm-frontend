/** Helpers for the Reports page (issues 28, 29, 53). Pure. */

import type { ChartCategory } from "@/components/ui/chartTypes";
import { Country, COUNTRY_LABELS } from "@/constants/students";
import type { CountryCount, DateRange, MoneyMonth, StudentMonth } from "@/lib/api";
import { formatIntake } from "@/lib/dates";

export type StudentTotals = Omit<StudentMonth, "month">;

const COUNT_KEYS = [
  "newVisitors",
  "signedUp",
  "applied",
  "visasGranted",
  "visasRefused",
  "lost",
] as const satisfies readonly (keyof StudentTotals)[];

const JANUARY = "-01";
const LAKH = 100_000;
const THOUSAND = 1_000;
// The other reports start this many months before today.
const RANGE_MONTHS = 3;
const MONTHS_IN_YEAR = 12;

/** Every count added up over the months. */
export function totalOf(months: readonly StudentMonth[]): StudentTotals {
  const totals: StudentTotals = {
    newVisitors: 0,
    signedUp: 0,
    applied: 0,
    visasGranted: 0,
    visasRefused: 0,
    lost: 0,
  };
  for (const row of months) {
    for (const key of COUNT_KEYS) totals[key] += row[key];
  }
  return totals;
}

/** The chart's months ("YYYY-MM"): "Nov 2025" in full; under the columns, the year only on the
 * first month and on January. */
export function monthCategories(months: readonly string[]): ChartCategory[] {
  return months.map((key, index) => {
    const label = formatIntake(key);
    const shortLabel =
      index === 0 || key.endsWith(JANUARY) ? label : (label.split(" ")[0] ?? label);
    return { key, label, shortLabel };
  });
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** From three months before `today` ("YYYY-MM-DD") to today, both included. */
export function rangeEndingOn(today: string): DateRange {
  const [year = 0, month = 1, day = 1] = today.split("-").map(Number);
  const index = year * MONTHS_IN_YEAR + (month - 1) - RANGE_MONTHS;
  const startYear = Math.floor(index / MONTHS_IN_YEAR);
  const startMonth = (index % MONTHS_IN_YEAR) + 1;
  const lastDay = new Date(Date.UTC(startYear, startMonth, 0)).getUTCDate();
  return {
    from: `${String(startYear)}-${pad(startMonth)}-${pad(Math.min(day, lastDay))}`,
    to: today,
  };
}

export type MoneyTotals = {
  fromStudents: number;
  fromCommission: number;
  moneyIn: number;
  moneyOut: number;
  /** Money in minus money out; below zero when more went out than came in. */
  leftOver: number;
};

/** Money in (from Students and commission), money out and what is left over, over the months. */
export function moneyTotalsOf(months: readonly MoneyMonth[]): MoneyTotals {
  let fromStudents = 0;
  let fromCommission = 0;
  let moneyOut = 0;
  for (const row of months) {
    fromStudents += row.fromStudents;
    fromCommission += row.fromCommission;
    moneyOut += row.moneyOut;
  }
  const moneyIn = fromStudents + fromCommission;
  return { fromStudents, fromCommission, moneyIn, moneyOut, leftOver: moneyIn - moneyOut };
}

/** A short amount for a chart's axis: "85k", "1.5 lakh". */
export function formatLakh(amount: number): string {
  if (amount === 0) return "0";
  if (amount >= LAKH) return `${String(Math.round((amount / LAKH) * 10) / 10)} lakh`;
  return `${String(Math.round(amount / THOUSAND))}k`;
}

/** One country's bar: its value from the API, its name, and how many. */
export type CountryBar = { key: Country; label: string; value: number };

/** How many countries get their own bar; the rest are put together under Other. */
export const TOP_COUNTRIES = 10;

/** Every country named, in the order given (most first from the API). */
export function countryRows(counts: readonly CountryCount[]): CountryBar[] {
  return counts.map(({ country, count }) => ({
    key: country,
    label: COUNTRY_LABELS[country],
    value: count,
  }));
}

/** The top `limit` countries, then the rest and the Other country together as Other, last. */
export function topCountries(
  counts: readonly CountryCount[],
  limit: number = TOP_COUNTRIES,
): CountryBar[] {
  const named = countryRows(counts.filter(({ country }) => country !== Country.Other));
  const restCount = [
    ...named.slice(limit),
    ...countryRows(counts.filter(({ country }) => country === Country.Other)),
  ].reduce((sum, row) => sum + row.value, 0);
  const top = named.slice(0, limit);
  const hasRest = counts.length > top.length;
  return hasRest
    ? [...top, { key: Country.Other, label: COUNTRY_LABELS.other, value: restCount }]
    : top;
}
