"use client";

import { useState } from "react";

import type { Holiday } from "@/lib/api";
import { addDaysIso } from "@/lib/dates";

/** Tap days one by one, or tap a first and a last day to choose all of them (asked 2026-11-17). */
export type ChooseBy = "days" | "range";

/** The AD days from `first` to `last` (either way round), each "YYYY-MM-DD". */
export function daysBetween(first: string, last: string): string[] {
  const [from, to] = first <= last ? [first, last] : [last, first];
  const days: string[] = [];
  for (let day = from; day <= to; day = addDaysIso(day, 1)) days.push(day);
  return days;
}

/**
 * The days chosen on the holiday calendar, in order. In From – to, the first tap is where the range
 * starts and the second chooses every day up to it, skipping days already holidays.
 */
export function useHolidayChoice(holidays: readonly Holiday[]) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [chooseBy, setChooseBy] = useState<ChooseBy>("days");
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const taken = new Set(holidays.map((holiday) => holiday.date));

  function add(days: readonly string[]): void {
    setChosen((known) => [...new Set([...known, ...days])].sort());
  }

  function tapInRange(iso: string): void {
    if (rangeStart === null) {
      setRangeStart(iso);
      add([iso]);
      return;
    }
    add(daysBetween(rangeStart, iso).filter((day) => !taken.has(day)));
    setRangeStart(null);
  }

  function tap(iso: string): void {
    if (chooseBy === "range") {
      tapInRange(iso);
      return;
    }
    setChosen((known) =>
      known.includes(iso) ? known.filter((one) => one !== iso) : [...known, iso].sort(),
    );
  }

  return {
    chosen,
    chooseBy,
    isWaitingForLast: rangeStart !== null,
    tap,
    chooseHow: (how: ChooseBy): void => {
      setChooseBy(how);
      setRangeStart(null);
    },
    /** Keep only these (the days not yet added after a refusal). */
    keep: (days: readonly string[]): void => {
      setChosen([...days]);
      setRangeStart(null);
    },
  };
}
