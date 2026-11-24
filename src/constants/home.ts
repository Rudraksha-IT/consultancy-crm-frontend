/** How many Students each Home's progress list shows (spec 22a). */
export const ADMIN_PROGRESS_LIMIT = 6;
export const COUNSELLOR_PROGRESS_LIMIT = 10;
/** How many tasks due soon the Counsellor's and Admin's Homes list; Teachers see them grouped. */
export const TASKS_SHOWN = 4;
/** How many rows each short list on Home shows before "See all (N)" (ticket 12). */
export const HOME_LIST_SHOWN = 3;
/** How many new visitors without a counsellor the Admin's Home lists. */
export const UNASSIGNED_SHOWN = HOME_LIST_SHOWN;
/** How many High priority Students Home shows as boxes in one row. */
export const HIGH_PRIORITY_SHOWN = 4;

const students = (count: number) => (count === 1 ? "1 Student" : `${String(count)} Students`);

export const HOME_TEXT = {
  greeting: (firstName: string) => `Namaste, ${firstName}`,
  /** e.g. "Tuesday, 3 Nov 2026 (17 Kartik 2083 BS)". */
  todayLine: (weekday: string, date: string, beside: string | null) =>
    [weekday, date].filter((part) => part !== "").join(", ") +
    (beside === null ? "" : ` (${beside})`),
  yourProgress: "Your Students' progress",
  everyonesProgress: "Students' progress",
  allStudents: "All Students",
  seeAllStudents: "See all Students",
  showingFurthest: (shown: number, count: number) =>
    `Showing the ${String(shown)} furthest along out of ${String(count)}.`,
  // Finished Students (Visa granted) are left out, so "yet" would be wrong (list tidy-ups 14).
  noStudents: "No Students on their way right now.",
  noCounsellorYet: "no counsellor yet",
  next: (step: string) => `Next: ${step}`,
  done: (step: string) => `Done: ${step}`,
  progressFailed: "We couldn't load the Students' progress. Please try again.",
  pipeline: "Pipeline",
  seeCharts: "See charts",
  pipelineFailed: "We couldn't load the pipeline. Please try again.",
  unassignedTitle: "New visitors without a counsellor",
  unassignedFailed: "We couldn't load the new visitors. Please try again.",
  everyoneHasCounsellor: "Everyone has a counsellor.",
  wants: (country: string) => `Wants ${country}`,
  assign: "Assign",
  assignNamed: (name: string) => `Assign a counsellor to ${name}`,
  tasksDueSoon: "Your tasks due soon",
  seeAllTasks: "See all tasks",
  nothingDueSoon: "Nothing due in the next two days.",
  tasksFailed: "We couldn't load your tasks. Please try again.",
  whenLabels: { overdue: "Overdue", today: "Today", soon: "Next two days" },
  groupTitle: (label: string, count: number) => `${label} ${String(count)}`,
  studentsCount: students,
  waitingOnYou: "Waiting on you",
  documentsWaiting: "Documents waiting to be checked",
  transfersWaiting: "Transfer requests waiting for you",
  appointmentsSoon: "Visa appointments in the next 7 days",
  appointmentLine: (student: string, appointment: string, when: string) =>
    `${student}, ${appointment} ${when}`,
  andMore: (count: number) => `and ${String(count)} more`,
  seeAllCount: (count: number) => `See all (${String(count)})`,
  highPriorityTitle: "High priority Students",
  counsellorLine: (name: string) => `Counsellor: ${name}`,
  stageLine: (stage: string) => `Stage: ${stage}`,
  noHighPriority: "No Students are High priority right now.",
  highPriorityFailed: "We couldn't load the High priority Students. Please try again.",
} as const;

/** Where this device keeps whether Home's amounts are shown (ticket 13); anything else: hidden. */
export const HOME_AMOUNTS_KEY = "crm:home-amounts";

/** The eye on Home's money (ticket 13). */
export const AMOUNTS_TEXT = {
  show: "Show amounts",
  hide: "Hide amounts",
  /** What sighted people see in place of an amount. */
  masked: "*****",
  /** What screen readers hear in place of an amount. */
  hidden: "Hidden",
} as const;
