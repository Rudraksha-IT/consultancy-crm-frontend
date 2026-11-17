"use client";

import { SelectField } from "@/components/ui/SelectField";
import { CLOCK_MONTHS_SHOWN, CLOCK_TEXT as TEXT } from "@/constants/clock";
import { formatMonth, recentMonths, todayIso } from "@/lib/dates";

/** Which month to show: this one or one of the last year's, newest first ("YYYY-MM"). */
export function MonthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (month: string) => void;
}) {
  return (
    <SelectField
      label={TEXT.month}
      name="month"
      options={recentMonths(todayIso(), CLOCK_MONTHS_SHOWN).map((month) => ({
        value: month,
        label: formatMonth(month),
      }))}
      value={value}
      onChange={onChange}
    />
  );
}
