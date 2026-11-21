import type { Dates } from "@/components/features/shell/dateDisplay";
import { describeHistoryEntry } from "@/components/features/students/profile/historyDescriptions";
import { ProgressChangeKind, PROGRESS_TEXT } from "@/constants/staffProgress";
import { VisitKind } from "@/constants/visits";
import type { ProgressChange } from "@/lib/api";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type OwnKind = (typeof ProgressChangeKind)[keyof typeof ProgressChangeKind];

/** What each change the list adds to History's own says. */
const OWN_TITLES: Record<OwnKind, (change: ProgressChange) => string> = {
  [ProgressChangeKind.VisitLogged]: (change) =>
    change.before === VisitKind.New
      ? PROGRESS_TEXT.visitNew(change.after)
      : PROGRESS_TEXT.visitFollowUp(change.after),
  [ProgressChangeKind.ApplicationMade]: (change) =>
    PROGRESS_TEXT.applicationMade(change.after, change.detail),
  [ProgressChangeKind.VisaAppliedFor]: (change) => PROGRESS_TEXT.visaAppliedFor(change.after),
  [ProgressChangeKind.AttendanceMarked]: (change) =>
    PROGRESS_TEXT.attendanceMarked(change.after, change.detail),
};

function isOwnKind(kind: ProgressChange["kind"]): kind is OwnKind {
  return Object.hasOwn(OWN_TITLES, kind);
}

/** One line saying what the change was; History kinds read as in the Student's Activity. */
export function changeTitle(change: ProgressChange, dates: Dates): string {
  const { kind } = change;
  if (isOwnKind(kind)) return OWN_TITLES[kind](change);
  return describeHistoryEntry(
    { ...change, kind, id: "", by: { name: "", isPlatformAdmin: false } },
    dates,
  ).title;
}

/** A day of the list, e.g. "Sun, 15 Nov 2026" (the date in the office's calendar). */
export function dayHeading(day: string, dates: Dates): string {
  const weekday = WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()] ?? "";
  return `${weekday}, ${dates.date(day)}`;
}
