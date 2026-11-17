"use client";

import { useState } from "react";

import { ProgressPeriod } from "@/constants/staffProgress";
import type { DateRange } from "@/lib/api";
import { todayIso } from "@/lib/dates";
import { periodRange } from "@/lib/staffProgress";

/** The chosen period (This month to begin with) and the days it covers. */
export function useProgressPeriod() {
  const [period, setPeriod] = useState<ProgressPeriod>(ProgressPeriod.Month);
  const [picked, setPicked] = useState<DateRange>();
  const range = periodRange(period, todayIso(), picked);
  return {
    period,
    range,
    onPeriod: (next: ProgressPeriod) => {
      // Picking dates starts from the period shown until others are chosen.
      if (next === ProgressPeriod.Custom && picked === undefined) setPicked(range);
      setPeriod(next);
    },
    onPick: setPicked,
  };
}
