"use client";

import { useLoaded } from "@/components/features/home/useLoaded";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { HOLIDAY_TEXT as TEXT } from "@/constants/clock";
import { fetchHolidays } from "@/lib/api";
import { holidayGroups, splitHolidays } from "@/lib/clock/holidays";
import { todayIso } from "@/lib/dates";

import { HolidayCards } from "./HolidayCards";

/**
 * Working hours → Holidays, for every Staff member (UI revamp 17): the office's holidays as two
 * plain lists, Coming up and Past holidays, read only. Admins change them in Configuration.
 */
export function MyHolidays() {
  const state = useLoaded(fetchHolidays, 0);
  if (state.status === "loading") return <p className="text-ink-2">{TEXT.loading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{TEXT.loadFailed}</Banner>;
  if (state.data.length === 0) {
    return (
      <Panel>
        <EmptyState>{TEXT.noneForStaff}</EmptyState>
      </Panel>
    );
  }
  const { coming, past } = splitHolidays(holidayGroups(state.data), todayIso());
  return (
    <div className="grid gap-6">
      <HolidayCards title={TEXT.comingUp} level="h2" groups={coming} emptyText={TEXT.noneComing} />
      {past.length > 0 && <HolidayCards title={TEXT.past} level="h2" groups={past} isPast />}
    </div>
  );
}
