"use client";

import { createContext, useContext, useMemo } from "react";

import type { DateDisplay } from "@/constants/dates";
import { formatDate, formatDateTime, formatMoneyDate, formatOtherCalendar } from "@/lib/dates";

import { useCurrentStaff } from "./useCurrentStaff";

/** Changes the calendar the whole app shows at once, e.g. after an Admin saves Dates. */
export const SetDateDisplayContext = createContext<((display: DateDisplay) => void) | null>(null);

/** A way to show the app in another calendar; only inside the AppShell. */
export function useSetDateDisplay(): (display: DateDisplay) => void {
  const setDateDisplay = useContext(SetDateDisplayContext);
  if (setDateDisplay === null) {
    throw new Error("useSetDateDisplay must be used inside the AppShell");
  }
  return setDateDisplay;
}

export type Dates = {
  /** The office's calendar, for date fields. */
  display: DateDisplay;
  /** An AD date ("YYYY-MM-DD") in the office's calendar. */
  date: (iso: string) => string;
  /** A moment from the API: the local day in the office's calendar, then the time. */
  dateTime: (moment: string) => string;
  /** A Payment's date, with the BS date beside it while the office uses AD. */
  moneyDate: (iso: string) => { date: string; beside: string | null };
  /** The same day in the calendar the office isn't using, or null. */
  otherCalendar: (iso: string) => string | null;
};

/** Date formatting in the calendar the office chose (Configuration → Dates). */
export function useDates(): Dates {
  const { dateDisplay } = useCurrentStaff();
  return useMemo(
    () => ({
      display: dateDisplay,
      date: (iso) => formatDate(iso, dateDisplay),
      dateTime: (moment) => formatDateTime(moment, dateDisplay),
      moneyDate: (iso) => formatMoneyDate(iso, dateDisplay),
      otherCalendar: (iso) => formatOtherCalendar(iso, dateDisplay),
    }),
    [dateDisplay],
  );
}
