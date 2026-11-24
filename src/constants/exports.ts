/** The lists that can be exported as CSV files (spec 31b), and the Clock-in team (issue 56). */
export const EXPORT_LISTS = ["students", "applications", "visas", "clock_in", "payments"] as const;
export type ExportList = (typeof EXPORT_LISTS)[number];

/** At most this many rows in one export; the server refuses more too. */
export const MAX_EXPORT_ROWS = 10_000;

export const EXPORT_LIST_LABELS: Record<ExportList, string> = {
  students: "Students",
  applications: "Applications",
  visas: "Visas",
  clock_in: "Clock-in",
  payments: "Payments",
};

/** The fixed columns of each export, as the server writes them. */
export const EXPORT_COLUMNS: Record<ExportList, readonly string[]> = {
  students: [
    "Name",
    "Mobile",
    "Email",
    "Stage",
    "Counsellor",
    "Wants to study in",
    "Target level",
    "How they found us",
    "First visit",
  ],
  applications: [
    "Student",
    "Email",
    "Mobile",
    "University",
    "Country",
    "Course",
    "Intake",
    "Status",
    "Counsellor",
    "Applied",
    "Added",
  ],
  visas: [
    "Student",
    "Email",
    "Mobile",
    "Country",
    "University",
    "Course",
    "Intake",
    "Visa status",
    "Next appointment",
    "Documents",
    "Counsellor",
  ],
  clock_in: [
    "Employee",
    "Job title",
    "Days worked",
    "Hours",
    "Short days",
    "No clock-out",
    "Corrected",
  ],
  payments: ["Date", "Student", "Fee Type", "Note", "Amount (NPR)", "Method", "Taken by"],
};

const plural = (count: number, one: string, many: string): string =>
  `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

/** The Export button and dialog, and Configuration → Exports (spec 31b, 31c). */
export const EXPORT_TEXT = {
  export: "Export",
  title: (list: ExportList) => `Export ${EXPORT_LIST_LABELS[list].toLowerCase()}`,
  downloading: (count: number) => `You're downloading ${plural(count, "row", "rows")}`,
  asCsv: " as a CSV file that opens in Excel.",
  filters: "Filters",
  columns: "Columns",
  recorded:
    "The export is recorded under your name in Configuration, Exports. Documents, Notes and passport numbers are never included.",
  download: "Download CSV",
  preparing: "Preparing…",
  cancel: "Cancel",
  exported: (count: number) =>
    `Exported ${plural(count, "row", "rows")}. It's listed in Configuration, Exports.`,
  tooMany: "That's more than 10,000 rows. Narrow the filters first.",
  failed: "The export didn't work. Try again.",
  noFilters: "No filters, everyone",
  search: "Search",
  myStudents: "My Students",
  noCounsellor: "No counsellor yet",
  exports: "Exports",
  exportsHelp:
    "Every list downloaded as a CSV file, so you know whenever data has left the office. Only Admins can export.",
  noExports: "Nothing exported yet.",
  recordTitle: (list: string, rows: number) => `${list}, ${plural(rows, "row", "rows")}`,
  loading: "Loading exports…",
  loadFailed: "The exports couldn't be loaded. Try again later.",
  count: (count: number) => plural(count, "export", "exports"),
} as const;
