import {
  ConsultancyStatus,
  EVALUATION_WARNING_DAYS,
  READ_ONLY_STATUSES,
  STATUS_TEXT,
} from "@/constants/consultancyStatus";
import { formatAdDate, localDayIso, todayIso } from "@/lib/dates";

const DAY_MS = 86_400_000;
const READ_ONLY_FALLBACK =
  "Your office's account is on hold, so you can look things up but not make changes. Ask your Admin to contact the CRM team.";

/** The office's Status as the shell knows it (from `/api/context/`). */
export type ShownStatus = {
  status: ConsultancyStatus;
  statusMessage: string | null;
  evaluationEndsAt: string | null;
};

/** What every screen tells Staff about their office's Status (spec 13d), or nothing. */
export type StatusNotice = {
  tone: "warning" | "problem";
  message: string;
  /** Changes are refused: screens may say so before anyone tries. */
  isReadOnly: boolean;
};

/**
 * The banner for the office's Status: Past due and Suspended always, with the server's reason;
 * an evaluation from 3 days before its end (naming its last day); an ended one as a problem.
 */
export function statusNotice(shown: ShownStatus, now: Date): StatusNotice | null {
  if (READ_ONLY_STATUSES.includes(shown.status)) {
    return {
      tone: "warning",
      message: shown.statusMessage ?? READ_ONLY_FALLBACK,
      isReadOnly: true,
    };
  }
  if (shown.status !== ConsultancyStatus.Evaluation || shown.evaluationEndsAt === null) {
    return null;
  }
  return evaluationNotice(shown.evaluationEndsAt, shown.statusMessage, now);
}

function evaluationNotice(
  endsAt: string,
  statusMessage: string | null,
  now: Date,
): StatusNotice | null {
  const lastDay = evaluationLastDay(endsAt);
  if (lastDay === null) return null;
  const left = new Date(endsAt).getTime() - now.getTime();
  if (left <= 0) return endedNotice(statusMessage);
  if (left > EVALUATION_WARNING_DAYS * DAY_MS) return null;
  const message =
    lastDay === todayIso(now)
      ? STATUS_TEXT.evaluationEndsToday
      : STATUS_TEXT.evaluationEndsSoon(formatShortDay(lastDay, now));
  return { tone: "warning", message, isReadOnly: false };
}

/** An ended evaluation, in the server's words (it blocks everything, so this is rarely seen). */
function endedNotice(statusMessage: string | null): StatusNotice | null {
  return statusMessage === null
    ? null
    : { tone: "problem", message: statusMessage, isReadOnly: true };
}

/**
 * The last day an evaluation still works, as "YYYY-MM-DD" in the browser's calendar: one that
 * ends at midnight ends after the day before. Null for something that isn't a moment.
 */
export function evaluationLastDay(endsAt: string): string | null {
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return null;
  return localDayIso(new Date(end - 1).toISOString());
}

/** "12 Nov" in the current year, "3 Jan 2027" in another; "—" for something that isn't a date. */
export function formatShortDay(iso: string, now: Date): string {
  const written = formatAdDate(iso);
  const thisYear = ` ${String(now.getFullYear())}`;
  return written.endsWith(thisYear) ? written.slice(0, -thisYear.length) : written;
}
