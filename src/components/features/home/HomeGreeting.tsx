"use client";

import { HomeClock } from "@/components/features/clock/HomeClock";
import { useDates } from "@/components/features/shell/dateDisplay";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { PageHeader } from "@/components/ui/PageHeader";
import { HOME_TEXT } from "@/constants/home";
import { Module } from "@/constants/modules";
import { todayIso } from "@/lib/dates";
import { firstName, weekdayOf } from "@/lib/home";

/**
 * "Namaste, Sita" and today's date in the office's calendar, the other one beside it in AD; with
 * Clock-in on, the clock on the right (spec 103). A Platform Admin never clocks in, so has none.
 */
export function HomeGreeting() {
  const { staff, modules, supportAccess } = useCurrentStaff();
  const hasClock = modules.includes(Module.ClockIn) && supportAccess === null;
  const dates = useDates();
  const today = todayIso();
  const beside = dates.display === "AD" ? dates.otherCalendar(today) : null;
  return (
    <PageHeader
      title={HOME_TEXT.greeting(firstName(staff.name))}
      subtitle={HOME_TEXT.todayLine(weekdayOf(today), dates.date(today), beside)}
      actions={hasClock ? <HomeClock /> : undefined}
    />
  );
}
