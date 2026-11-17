import { TaskTiming } from "@/constants/tasks";
import type { Task } from "@/lib/api";
import { addDaysIso } from "@/lib/dates";

/** How far ahead "due soon" looks on the Homes: today and the next two days (spec 22a). */
const DAYS_AHEAD = 2;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** The groups a Teacher's tasks due soon are shown in, in order. */
export const TaskWhen = {
  Overdue: "overdue",
  Today: "today",
  Soon: "soon",
} as const;

export type TaskWhen = (typeof TaskWhen)[keyof typeof TaskWhen];

export type TaskGroup = { when: TaskWhen; tasks: Task[] };

/** An AD date read from its text, at noon UTC so no time zone moves it to another day. */
function dayOf(iso: string): Date | null {
  const match = ISO_DATE.exec(iso);
  if (match === null) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
}

/** The last day "due soon" reaches: two days after `today` (AD, "YYYY-MM-DD"). */
export function lastDueSoonDay(today: string): string {
  return addDaysIso(today, DAYS_AHEAD);
}

/**
 * Open tasks overdue, due today or in the next two days, in the order given (overdue, then
 * priority, then due date, from the API). Overdue and today follow the API's timing, worked out in the office's time zone.
 */
export function tasksDueSoon(tasks: readonly Task[], today: string): Task[] {
  const last = lastDueSoonDay(today);
  return tasks.filter(
    (task) =>
      task.timing === TaskTiming.Overdue ||
      task.timing === TaskTiming.Today ||
      (task.timing === TaskTiming.Upcoming && task.dueOn <= last),
  );
}

const WHEN_OF: Partial<Record<TaskTiming, TaskWhen>> = {
  [TaskTiming.Overdue]: TaskWhen.Overdue,
  [TaskTiming.Today]: TaskWhen.Today,
  [TaskTiming.Upcoming]: TaskWhen.Soon,
};

/** Tasks due soon grouped Overdue, Today, Next two days, leaving out the empty groups. */
export function groupTasksByWhen(tasks: readonly Task[]): TaskGroup[] {
  return Object.values(TaskWhen)
    .map((when) => ({ when, tasks: tasks.filter((task) => WHEN_OF[task.timing] === when) }))
    .filter((group) => group.tasks.length > 0);
}

/** The first word of a name, for the greeting. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** The day of the week of an AD date ("YYYY-MM-DD"); "" when it isn't one. */
export function weekdayOf(iso: string): string {
  const day = dayOf(iso);
  return day === null ? "" : (WEEKDAYS[day.getUTCDay()] ?? "");
}
