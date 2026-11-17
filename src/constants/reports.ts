/** Words on the Reports page (issues 28, 29, 30, 53, 85; spec 93-95, 93b, 97-99a, 127). */

export const ReportTab = {
  Students: "students",
  /** Only while the Accounts Module is on. */
  Money: "money",
  Sources: "sources",
  /** Reports → Staff Progress (issue 85); replaced "Counsellor performance". */
  StaffProgress: "staff_progress",
  /** Only while the test-prep Module is on. */
  Classes: "batches",
} as const;
export type ReportTab = (typeof ReportTab)[keyof typeof ReportTab];

const months = (count: number) => `${String(count)} months`;

export const REPORTS_TEXT = {
  title: "Reports",
  intro: "How the office is doing over time.",
  chooseReport: "Choose a report",
  tabs: {
    [ReportTab.Students]: "Students",
    [ReportTab.Money]: "Money",
    [ReportTab.Sources]: "Where visitors came from",
    [ReportTab.StaffProgress]: "Staff Progress",
    [ReportTab.Classes]: "Classes",
  } satisfies Record<ReportTab, string>,
  howFarBack: "How far back",
  lastMonths: (count: number) => `Last ${months(count)}`,
  range: "Dates to show",
  from: "From",
  to: "To",
  show: "Show",
  newVisitors: "New visitors",
  signedUp: "Signed up",
  visasGranted: "Visas granted",
  inTheLast: (count: number) => `in the last ${months(count)}`,
  ofVisitors: (percent: number) => `${String(percent)}% of visitors`,
  ofVisaDecisions: (percent: number) => `${String(percent)}% of visa decisions`,
  eachMonth: "Visitors, sign-ups and visas each month",
  series: { newVisitors: "New visitors", signedUp: "Signed up", visasGranted: "Visa granted" },
  countries: {
    granted: "Visas granted by country",
    grantedSeries: "Visas granted",
    grantedFoot: "The country of the visa's university.",
    noneGranted: "No visas granted in this time.",
    wanted: "Countries Students want",
    wantedSeries: "Students",
    wantedFoot: (count: number) =>
      `Students who came in during the last ${months(count)}, by the country they want.`,
    nobodyCame: "Nobody came in during this time.",
    country: "Country",
  },
  whatHappened: "What happened to them",
  funnel: {
    cameIn: "Came in",
    cameInNote: "New visitors",
    signedUp: "Signed up",
    signedUpNote: "Became Students",
    applied: "Applied",
    appliedNote: "Sent at least one application",
    gotVisa: "Got a visa",
    refused: "Visa refused",
    stopped: "Stopped",
    stoppedNote: "Marked Lost",
  },
  funnelFoot: (count: number) =>
    `Counts for the last ${months(count)}. Grey bars are the ones that didn't go through.`,
  sourcesFoot: (count: number) =>
    `${count === 1 ? "1 new visitor" : `${String(count)} new visitors`} between the dates.`,
  money: {
    moneyIn: "Money in",
    moneyOut: "Money out",
    leftOver: "Left over",
    shortBy: "Short by",
    lastMonths: (count: number) => `last ${months(count)}`,
    expenses: "expenses",
    inMinusOut: "money in minus money out",
    eachMonth: "Money in and money out each month",
    cameFrom: "Where the money came from",
    studentFees: "Student fees",
    commission: "University commission",
    went: "Where the money went",
    nothingWent: "No money went out in these months.",
  },
  staffProgress: {
    counsellors: "Counsellors",
    frontDesk: "Front Desk",
    teachers: "Teachers",
    name: "Name",
    hasLeft: "(has left)",
    nobody: "Nobody to show for these dates.",
    foot: "Click a name to see that person's Progress, day by day.",
    countedFrom: (count: string, day: string) => `${count}: counted from ${day}.`,
    columns: {
      students: "Students",
      moved_forward: "Moved forward",
      applications_made: "Applications made",
      visas_applied_for: "Visas applied for",
      visas_granted: "Visas granted",
      students_lost: "Lost",
      tasks_done: "Tasks done",
      visitors_registered: "Visitors registered",
      new_leads: "New Leads",
      payments_taken: "Payments taken",
      classes_taken: "Classes taken",
      attendance_marked: "Attendance marked",
    },
  },
  classNote: (students: number, teacher: string) =>
    `${students === 1 ? "1 Student" : `${String(students)} Students`} · ${teacher}`,
  percent: (value: number) => `${String(value)}%`,
  noShare: "—",
  noClasses: "No classes ran between these dates.",
  classesFoot:
    "Share of class days attended between the dates. Present and Late both count; — means nobody was marked yet.",
  failed: "We couldn't load this report. Please try again.",
} as const;
