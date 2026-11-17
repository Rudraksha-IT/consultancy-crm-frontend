import { DateDisplay } from "@/constants/dates";

import { formatBsDate } from "./bs";
import { formatAdDate, localDayIso, localTime } from "./dates";

const NO_DATE = "—";

/** An AD date ("YYYY-MM-DD") written in the calendar the office chose; "—" when there is none. */
export function formatDate(iso: string, display: DateDisplay): string {
  return display === DateDisplay.BS ? formatBsDate(iso) : formatAdDate(iso);
}

/** A moment from the API: the browser's local day in the office's calendar, then the time. */
export function formatDateTime(moment: string, display: DateDisplay): string {
  const day = localDayIso(moment);
  if (day === null) return NO_DATE;
  return `${formatDate(day, display)}, ${localTime(moment)}`;
}

/** A Payment's date: in AD the BS date goes beside it (spec 101); in BS it stands alone. */
export function formatMoneyDate(
  iso: string,
  display: DateDisplay,
): { date: string; beside: string | null } {
  if (display === DateDisplay.BS) return { date: formatBsDate(iso), beside: null };
  return { date: formatAdDate(iso), beside: formatOtherCalendar(iso, display) };
}

/** The same day in the other calendar, e.g. "16 Kartik 2083 BS"; null when it has none. */
export function formatOtherCalendar(iso: string, display: DateDisplay): string | null {
  const other = display === DateDisplay.BS ? formatAdDate(iso) : formatBsDate(iso);
  if (other === NO_DATE) return null;
  return `${other} ${display === DateDisplay.BS ? DateDisplay.AD : DateDisplay.BS}`;
}
