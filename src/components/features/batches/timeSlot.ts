/** A class's time slot as minutes after midnight, chosen from the half-hour lists. */
export type TimeSlot = { from: number; to: number };

const STEP = 30;
const FIRST = 6 * 60; // 6:00 AM
const LAST = 21 * 60; // 9:00 PM
const NOON = 12 * 60;
const USUAL_LENGTH = 90;

const ALL_TIMES = Array.from({ length: (LAST - FIRST) / STEP + 1 }, (_, i) => FIRST + i * STEP);

/** Every time a class can start: all but the last, so there's always an end after it. */
export const START_TIMES: readonly number[] = ALL_TIMES.slice(0, -1);

export const DEFAULT_TIME_SLOT: TimeSlot = { from: 7 * 60, to: 8 * 60 + 30 };

/** The times a class starting at `from` can end at. */
export function endTimesAfter(from: number): number[] {
  return ALL_TIMES.filter((time) => time > from);
}

/** After the start changes: the same end if still after it, else a usual-length class. */
export function keepEndAfterStart(slot: TimeSlot): TimeSlot {
  if (slot.to > slot.from) return slot;
  return { from: slot.from, to: Math.min(slot.from + USUAL_LENGTH, LAST) };
}

/** E.g. 420 → "7:00 AM". */
export function formatTime(minutes: number): string {
  return `${clock(minutes)} ${half(minutes)}`;
}

/** E.g. "7:00-8:30 AM", or "11:30 AM-1:00 PM" across noon: how slots have always been written. */
export function formatTimeSlot({ from, to }: TimeSlot): string {
  if (half(from) === half(to)) return `${clock(from)}-${clock(to)} ${half(to)}`;
  return `${formatTime(from)}-${formatTime(to)}`;
}

const SLOT_PATTERN =
  /^(?<fh>\d{1,2}):(?<fm>\d{2})\s*(?<fp>AM|PM)?\s*-\s*(?<th>\d{1,2}):(?<tm>\d{2})\s*(?<tp>AM|PM)$/i;

/** A saved slot back as two times, or undefined when it isn't one the lists can show. */
export function parseTimeSlot(text: string): TimeSlot | undefined {
  const parts = SLOT_PATTERN.exec(text.trim())?.groups;
  if (parts === undefined) return undefined;
  const part = (key: string): string => parts[key] ?? "";
  const toHalf = part("tp");
  const slot = {
    from: toMinutes(part("fh"), part("fm"), part("fp") || toHalf),
    to: toMinutes(part("th"), part("tm"), toHalf),
  };
  return isOnTheLists(slot) ? slot : undefined;
}

/** Both times are real and are choices the lists offer, the end after the start. */
function isOnTheLists({ from, to }: TimeSlot): boolean {
  return START_TIMES.includes(from) && endTimesAfter(from).includes(to);
}

/** E.g. ("7", "30", "PM") → 1170; NaN for an hour or minute no clock shows. */
function toMinutes(hour: string, minute: string, halfOfDay: string): number {
  const h = Number(hour);
  const m = Number(minute);
  if (h < 1 || h > 12 || m > 59) return Number.NaN;
  const afternoon = halfOfDay.toUpperCase() === "PM" ? NOON : 0;
  return (h % 12) * 60 + afternoon + m;
}

function clock(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 12 || 12;
  return `${String(hour)}:${String(minutes % 60).padStart(2, "0")}`;
}

function half(minutes: number): "AM" | "PM" {
  return minutes < NOON ? "AM" : "PM";
}
