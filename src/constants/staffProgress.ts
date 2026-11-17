/** Staff Progress (spec 125; issue 84): the number cards, the period picker and the list. */

/** A number card, as the API names it. */
export const ProgressCount = {
  MovedForward: "moved_forward",
  ApplicationsMade: "applications_made",
  VisasAppliedFor: "visas_applied_for",
  StudentsLost: "students_lost",
  TasksDone: "tasks_done",
  VisitorsRegistered: "visitors_registered",
  NewLeads: "new_leads",
  PaymentsTaken: "payments_taken",
  ClassesTaken: "classes_taken",
  AttendanceMarked: "attendance_marked",
} as const;

export type ProgressCount = (typeof ProgressCount)[keyof typeof ProgressCount];

export const PROGRESS_COUNTS = Object.values(ProgressCount);

export const PROGRESS_COUNT_LABELS: Record<ProgressCount, string> = {
  moved_forward: "Students moved forward",
  applications_made: "Applications made",
  visas_applied_for: "Visas applied for",
  students_lost: "Students lost",
  tasks_done: "Tasks done",
  visitors_registered: "Visitors registered",
  new_leads: "New Leads",
  payments_taken: "Payments taken",
  classes_taken: "Classes taken",
  attendance_marked: "Attendance marked",
};

/** Changes the list shows besides History's own kinds. */
export const ProgressChangeKind = {
  /** Before is the Visit's kind (new or follow_up); after is its purpose. */
  VisitLogged: "visit_logged",
  /** After is the University; detail is the Course. */
  ApplicationMade: "application_made",
  /** After is the University. */
  VisaAppliedFor: "visa_applied_for",
  /** After is the class's name; detail is how many Students were marked. */
  AttendanceMarked: "attendance_marked",
} as const;

export type ProgressChangeKind = (typeof ProgressChangeKind)[keyof typeof ProgressChangeKind];

export const PROGRESS_CHANGE_KINDS = Object.values(ProgressChangeKind);

/** The most changes the list shows (the server's limit); the cards count them all. */
export const MAX_LISTED_CHANGES = 500;

/** The period picker's choices. */
export const ProgressPeriod = {
  Week: "week",
  Month: "month",
  LastMonth: "last",
  Custom: "custom",
} as const;

export type ProgressPeriod = (typeof ProgressPeriod)[keyof typeof ProgressPeriod];

export const PROGRESS_PERIOD_LABELS: Record<ProgressPeriod, string> = {
  week: "This week",
  month: "This month",
  last: "Last month",
  custom: "Pick dates",
};

export const PROGRESS_TEXT = {
  tab: "Progress",
  tabs: "Employee sections",
  allEmployees: "All employees",
  myProgress: "My progress",
  myAccount: "My account",
  myProgressIntro: "What you did for Students. Admins see the same numbers.",
  period: "Period",
  dates: "Dates",
  from: "From",
  to: "To",
  show: "Show",
  periodLine: (from: string, to: string) =>
    `${from} to ${to}. Only changes are counted, never what someone looked at.`,
  countedFrom: (day: string) => `Counted from ${day}`,
  whatTheyDid: "What they did",
  whatYouDid: "What you did",
  nothing: "Nothing recorded in this period.",
  noCards: "Nothing is counted for this Role while classes are switched off.",
  more: (shown: number) =>
    `Showing the latest ${String(shown)} changes. Pick a shorter period to see the rest.`,
  changes: (count: number) => `${String(count)} change${count === 1 ? "" : "s"}`,
  notFound: "We couldn't find this employee.",
  failed: "We couldn't load this progress. Try again.",
  loading: "Loading progress…",
  visitNew: (purpose: string) => `Registered a new visitor: ${purpose}`,
  visitFollowUp: (purpose: string) => `Recorded a visit: ${purpose}`,
  applicationMade: (university: string, course: string) =>
    course === ""
      ? `Application made: ${university}`
      : `Application made: ${university}, ${course}`,
  visaAppliedFor: (university: string) => `Visa applied for: ${university}`,
  attendanceMarked: (batch: string, marks: string) =>
    `Marked attendance: ${batch} (${marks} ${marks === "1" ? "Student" : "Students"})`,
} as const;
