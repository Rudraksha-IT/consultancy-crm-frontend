import { PRIORITIES, Priority } from "./priority";

/** Which of my Tasks to show; values match the API's `view`. */
export const TaskView = {
  Mine: "mine",
  Given: "given",
  Done: "done",
} as const;

export type TaskView = (typeof TaskView)[keyof typeof TaskView];

export const TASK_VIEWS = Object.values(TaskView);

/** Where a Task stands against its due date, as the API works it out in the office's time zone. */
export const TaskTiming = {
  Overdue: "overdue",
  Today: "today",
  Upcoming: "upcoming",
  Done: "done",
} as const;

export type TaskTiming = (typeof TaskTiming)[keyof typeof TaskTiming];

export const TASK_TIMINGS = Object.values(TaskTiming);

/** How important a Task is (spec 77a), in the same words as a Student's Priority (ticket 10). */
export const TaskPriority = Priority;

export type TaskPriority = Priority;

/** High first: the order "To do" and the choices show them in. */
export const TASK_PRIORITIES = PRIORITIES;

/** The longest title the API accepts. */
export const TASK_TITLE_MAX_LENGTH = 200;

/** How often the menu's Tasks count is asked for again, besides after each change. */
export const TASK_COUNT_REFRESH_MS = 60_000;

export const TASK_TEXT = {
  title: "Tasks",
  intro: "Overdue first, then the most important. Tick a task when it's done.",
  newTask: "New task",
  addTask: "Add a task",
  dialogTitle: "New Task",
  create: "Create Task",
  whatNeedsDoing: "What needs doing",
  titlePlaceholder: "e.g. Call Sita about her IELTS score",
  due: "Due",
  assignTo: "Assign to",
  aboutStudent: "About a Student",
  findStudent: "Find a Student",
  findStudentPlaceholder: "Type a name or phone",
  noStudent: "No Student",
  about: "About",
  whichTasks: "Which tasks",
  viewLabels: { mine: "To do", given: "Given to others", done: "Done" } satisfies Record<
    TaskView,
    string
  >,
  priority: "Priority",
  anyPriority: "Any",
  priorityLabels: { high: "High", normal: "Normal", low: "Low" } satisfies Record<
    TaskPriority,
    string
  >,
  highPriority: "High priority",
  lowPriority: "Low priority",
  onlyMe: "Only me",
  onlyMeChoice: "Only me. Nobody else sees it, and it isn't about a Student.",
  you: "You",
  /** The menu's count beside Tasks, for screen readers. */
  dueNowCount: (count: number) => `${String(count)} due today or overdue`,
  emptyMine: "You're all caught up.",
  emptyOther: "Nothing here.",
  emptyFiltered: "No tasks with this priority.",
  openTasks: "Open tasks",
  nothingOpen: "Nothing open for this Student.",
  overdue: "Overdue",
  today: "Today",
  doneOn: (date: string) => `Done ${date}`,
  forPerson: (name: string) => `For ${name}`,
  fromPerson: (name: string) => `From ${name}`,
  markDone: (title: string) => `Mark done: ${title}`,
  markNotDone: (title: string) => `Mark not done: ${title}`,
  created: "Task created",
  givenTo: (name: string) => `Task given to ${name}. They'll get a notification.`,
  done: "Task done",
  reopened: "Task reopened",
  tickFailed: "We couldn't change that task. Please try again.",
  cantTick: "Only the person it's for, who gave it, or an Admin can tick it.",
  listFailed: "We couldn't load the tasks. Please try again.",
  assigneesFailed: "We couldn't load who tasks can be given to. Please try again.",
  tasksCount: (count: number) => (count === 1 ? "1 task" : `${String(count)} tasks`),
  /** A Role in the "Assign to" list, e.g. "Bikash Thapa (Counsellor)". */
  personWithRole: (name: string, role: string) => `${name} (${role})`,
} as const;
