import type { Dates } from "@/components/features/shell/dateDisplay";
import type { TimelineItem } from "@/components/ui/Timeline";
import { APPLICATION_STATUS_LABELS } from "@/constants/applications";
import { LABELS } from "@/constants/messages";
import { STAGE_LABELS, isStage } from "@/constants/stages";
import { HISTORY_KIND_LABELS, HistoryKind } from "@/constants/students";
import { APPOINTMENT_LABELS, VISA_STATUS_LABELS } from "@/constants/visas";
import type { HistoryEntry } from "@/lib/api";

/** What a History entry says: its title, and the text to show under it. */
export type Described = Pick<TimelineItem, "title" | "before" | "detail">;

/** What each kind of change says, and the text to show under it. */
const DESCRIBE: Record<HistoryKind, (entry: HistoryEntry, dates: Dates) => Described> = {
  [HistoryKind.PriorityChanged]: (entry) => ({
    title: LABELS.priorityChange(entry.before, entry.after),
  }),
  [HistoryKind.NoteEdited]: (entry) => ({
    title: HISTORY_KIND_LABELS[entry.kind],
    before: entry.before,
  }),
  [HistoryKind.StageChanged]: (entry) => ({
    title: LABELS.stageChange(stageLabel(entry.before), stageLabel(entry.after)),
    ...(entry.detail !== "" && { detail: entry.detail }),
  }),
  // The detail names who asked and who approved, for a Transfer Request (issue 57).
  [HistoryKind.CounsellorAssigned]: (entry) => ({
    title: LABELS.assignedTo(entry.after),
    ...(entry.detail !== "" && { detail: entry.detail }),
  }),
  [HistoryKind.Transferred]: (entry) => ({
    title: LABELS.transferredFromTo(entry.before, entry.after),
    ...(entry.detail !== "" && { detail: entry.detail }),
  }),
  [HistoryKind.PaymentRecorded]: (entry) => ({
    title: LABELS.paymentRecorded(entry.after),
    ...(entry.detail !== "" && { detail: entry.detail }),
  }),
  [HistoryKind.PaymentEdited]: (entry) => ({
    title: LABELS.paymentChanged(entry.after),
    before: entry.before,
    ...(entry.detail !== "" && { detail: entry.detail }),
  }),
  [HistoryKind.PaymentDeleted]: (entry) => ({
    title: LABELS.paymentDeleted(entry.before),
    ...(entry.detail !== "" && { detail: entry.detail }),
  }),
  [HistoryKind.FeeAdded]: (entry) => ({ title: LABELS.feeAdded(entry.after) }),
  [HistoryKind.FeeEdited]: (entry) => ({
    title: LABELS.feeChanged(entry.after),
    before: entry.before,
  }),
  [HistoryKind.FeeDeleted]: (entry) => ({ title: LABELS.feeDeleted(entry.before) }),
  [HistoryKind.OfferLetterAdded]: (entry) => ({ title: LABELS.offerLetterAdded(entry.after) }),
  // The detail says what caused it when it wasn't chosen by hand, e.g. a refused visa (issue 76).
  [HistoryKind.ChosenOfferChanged]: (entry) => ({
    title: chosenOfferTitle(entry.before, entry.after),
    ...(entry.detail !== "" && { detail: entry.detail }),
  }),
  [HistoryKind.DocumentBinned]: binEntry,
  [HistoryKind.DocumentTakenOut]: binEntry,
  [HistoryKind.DocumentRestored]: binEntry,
  [HistoryKind.DocumentDeletedFromBin]: binEntry,
  [HistoryKind.DocumentDeleted]: binEntry,
  // Who did each action Staff Progress counts (issue 83); the detail names the University.
  [HistoryKind.ApplicationStatusChanged]: (entry) => ({
    title: LABELS.applicationStatusChanged(
      entry.detail,
      labelOf(APPLICATION_STATUS_LABELS, entry.before),
      labelOf(APPLICATION_STATUS_LABELS, entry.after),
    ),
  }),
  [HistoryKind.VisaStatusChanged]: (entry) => ({
    title: LABELS.visaStatusChanged(
      entry.detail,
      labelOf(VISA_STATUS_LABELS, entry.before),
      labelOf(VISA_STATUS_LABELS, entry.after),
    ),
  }),
  [HistoryKind.TaskDone]: (entry) => ({ title: LABELS.taskDone(entry.after) }),
  [HistoryKind.DocumentVerified]: (entry) => ({ title: LABELS.documentVerified(entry.after) }),
  [HistoryKind.DocumentRejected]: (entry) => ({
    title: LABELS.documentRejected(entry.after),
    ...(entry.detail !== "" && { detail: entry.detail }),
  }),
  [HistoryKind.VisaDateChanged]: (entry, dates) => ({ title: visaDateTitle(entry, dates) }),
};

/** "Biometrics booked for ...", "... moved from ... to ..." or "... date removed (was ...)". */
function visaDateTitle(entry: HistoryEntry, dates: Dates): string {
  const appointment = labelOf(APPOINTMENT_LABELS, entry.detail);
  if (entry.before === "") return LABELS.visaDateBooked(appointment, dates.dateTime(entry.after));
  const was = dates.dateTime(entry.before);
  if (entry.after === "") return LABELS.visaDateRemoved(appointment, was);
  return LABELS.visaDateMoved(appointment, was, dates.dateTime(entry.after));
}

/** The shown word for an API value, or the value itself if it is one this screen doesn't know. */
function labelOf(labels: Readonly<Record<string, string>>, value: string): string {
  return labels[value] ?? value;
}

/** A step of the Bin (issue 79): what it was, and why it was put there. */
function binEntry(entry: HistoryEntry): Described {
  return {
    title: LABELS.historyWhat(HISTORY_KIND_LABELS[entry.kind], entry.after),
    ...(entry.detail !== "" && { detail: entry.detail }),
  };
}

function chosenOfferTitle(before: string, after: string): string {
  if (after === "") return LABELS.offerCleared(before);
  if (before === "") return LABELS.offerChosen(after);
  return LABELS.offerChosenInstead(before, after);
}

/** What a History entry says, in the office's calendar (the Activity tab and Staff Progress). */
export function describeHistoryEntry(entry: HistoryEntry, dates: Dates): Described {
  return DESCRIBE[entry.kind](entry, dates);
}

/** The shown name of a Stage value; a value this screen doesn't know shows as it is. */
export function stageLabel(value: string): string {
  return isStage(value) ? STAGE_LABELS[value] : value;
}
