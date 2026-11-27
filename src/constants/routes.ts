import type { RecordId } from "@/lib/recordId";
export const ROUTES = {
  home: "/",
  login: "/login",
  forgotPassword: "/forgot-password",
  /** Where an invited employee enters their Code and chooses a password (issue 07). */
  join: "/join",
  students: "/students",
  /** The Students list with filters set in the address, e.g. `{ priority: "high" }` (ticket 12). */
  studentsWhere: (filters: Record<string, string>) =>
    `/students?${new URLSearchParams(filters).toString()}`,
  /** One Student's page (issue 10). */
  student: (id: RecordId) => `/students/${id}`,
  studentEdit: (id: RecordId) => `/students/${id}/edit`,
  /** Every Application in the office (issue 47). */
  applications: "/applications",
  /** Every Visa in the office (issue 48). */
  visas: "/visas",
  documents: "/documents",
  /** The Documents page on the Bin tab (Admins; issue 79). */
  documentsBin: "/documents?tab=bin",
  tasks: "/tasks",
  /** Transfer Requests waiting for me, sent by me, or everyone's (issue 57). */
  transferRequests: "/transfer-requests",
  /** One-to-one messages between Staff (issue 86). */
  inbox: "/inbox",
  /** The Inbox with one conversation open. */
  inboxWith: (personId: RecordId) => `/inbox?with=${personId}`,
  batches: "/batches",
  /** One class's page (issue 23). */
  batch: (id: RecordId) => `/batches/${id}`,
  messages: "/messages",
  accounts: "/accounts",
  /** Fees by type, and one Fee Type's Students (ticket 08). */
  feesByType: "/accounts/fees-by-type",
  feeTypeStudents: (id: RecordId) => `/accounts/fees-by-type/${id}`,
  /** One Student's page opened on their Fees tab. */
  studentFees: (id: RecordId) => `/students/${id}?tab=fees`,
  reports: "/reports",
  /** Configuration opened on Universities, the Catalogue and its Course Files (ticket 10). */
  universities: "/configuration?section=universities",
  /** Configuration opened on Working hours, where an Admin changes the holidays (UI revamp 17). */
  configurationWorkingHours: "/configuration?section=workingHours",
  /** One University's edit page: it and every Course, saved at once (issue 92). */
  universityEdit: (id: RecordId) => `/configuration/universities/${id}/edit`,
  staff: "/staff",
  /** One employee's page, on its Progress tab (issue 84). */
  employee: (id: RecordId) => `/staff/${id}`,
  /** One employee's Work from home tab (issue 87). */
  employeeWorkFromHome: (id: RecordId) => `/staff/${id}?tab=wfh`,
  /** Employees opened on the Working hours tab (issue 56). */
  workingHours: "/staff?tab=hours",
  /** My working hours: my own month of clock-ins (issue 56). */
  clock: "/clock",
  /** Working hours on its Work from home tab (UI revamp 16). */
  clockWorkFromHome: "/clock?tab=wfh",
  configuration: "/configuration",
  /** A person's own Settings (issue 38). */
  mySettings: "/settings",
  /** My progress: my own Staff Progress, from My account (issue 84). */
  myProgress: "/settings/progress",
  platformHome: "/platform",
  platformLogin: "/platform/login",
  /** Forgot password on the Platform (issue 63), and where it ends: its login, saying so. */
  platformForgotPassword: "/platform/forgot-password",
  platformLoginAfterReset: "/platform/login?password=changed",
  /** Joining the Platform (issue 65), and where it ends: its login, saying so. */
  platformJoin: "/platform/join",
  /** The Platform's tabs (issue 65). */
  platformAdmins: "/platform/admins",
  platformSettings: "/platform/settings",
  platformLoginAfterJoin: "/platform/login?password=set",
  /** The Central login's screen; `login.<product-domain>` shows it at every path (issue 44). */
  centralLogin: "/central-login",
  platformNewConsultancy: "/platform/consultancies/new",
  /** The Platform Admin's own name, email and password (issue 59). */
  platformAccount: "/platform/account",
  /** On an office's address: where a Platform Admin enters a Support Access visit (issue 27). */
  supportEnter: "/support-access",
} as const;
