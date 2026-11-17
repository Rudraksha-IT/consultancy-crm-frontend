import { TaskPriority, TaskTiming } from "@/constants/tasks";
import type { Task } from "@/lib/api";

import {
  firstName,
  groupTasksByWhen,
  lastDueSoonDay,
  tasksDueSoon,
  TaskWhen,
  weekdayOf,
} from "./home";

const TODAY = "2026-11-03";

function task(id: number, dueOn: string, timing: TaskTiming): Task {
  return {
    id,
    title: `Task ${String(id)}`,
    dueOn,
    priority: TaskPriority.Normal,
    isOnlyMe: false,
    timing,
    isDone: timing === TaskTiming.Done,
    doneAt: null,
    assignee: { id: 1, name: "Sita" },
    createdBy: { id: 1, name: "Sita" },
    student: null,
    canMarkDone: true,
  };
}

const OVERDUE = task(1, "2026-10-30", TaskTiming.Overdue);
const DUE_TODAY = task(2, TODAY, TaskTiming.Today);
const TOMORROW = task(3, "2026-11-04", TaskTiming.Upcoming);
const IN_TWO_DAYS = task(4, "2026-11-05", TaskTiming.Upcoming);
const IN_THREE_DAYS = task(5, "2026-11-06", TaskTiming.Upcoming);
const DONE = task(6, TODAY, TaskTiming.Done);

describe("lastDueSoonDay", () => {
  it("is two days on, across a month's end", () => {
    expect(lastDueSoonDay(TODAY)).toBe("2026-11-05");
    expect(lastDueSoonDay("2026-11-30")).toBe("2026-12-02");
  });
});

describe("tasksDueSoon", () => {
  it("keeps open tasks overdue, due today or in the next two days, in order", () => {
    const tasks = [OVERDUE, DUE_TODAY, TOMORROW, IN_TWO_DAYS, IN_THREE_DAYS, DONE];

    expect(tasksDueSoon(tasks, TODAY).map((one) => one.id)).toEqual([1, 2, 3, 4]);
  });

  it("works across the end of a month", () => {
    const dueFirst = task(7, "2026-12-01", TaskTiming.Upcoming);

    expect(tasksDueSoon([dueFirst], "2026-11-30")).toEqual([dueFirst]);
  });
});

describe("groupTasksByWhen", () => {
  it("groups by Overdue, Today and Next two days, leaving out empty groups", () => {
    const groups = groupTasksByWhen([OVERDUE, TOMORROW, IN_TWO_DAYS]);

    expect(groups).toEqual([
      { when: TaskWhen.Overdue, tasks: [OVERDUE] },
      { when: TaskWhen.Soon, tasks: [TOMORROW, IN_TWO_DAYS] },
    ]);
  });

  it("has no groups without tasks", () => {
    expect(groupTasksByWhen([])).toEqual([]);
  });
});

describe("firstName", () => {
  it.each([
    ["Sita Sharma", "Sita"],
    ["  Bikash  ", "Bikash"],
    ["", ""],
  ])("takes %j to %j", (name, first) => {
    expect(firstName(name)).toBe(first);
  });
});

describe("weekdayOf", () => {
  it.each([
    ["2026-11-03", "Tuesday"],
    ["2026-11-08", "Sunday"],
    ["not a date", ""],
  ])("names the day of %s", (iso, day) => {
    expect(weekdayOf(iso)).toBe(day);
  });
});
