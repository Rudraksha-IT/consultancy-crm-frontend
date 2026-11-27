/** Where a Consultancy is with us as a customer (GLOSSARY: Consultancy Status); values match the API. */
export const ConsultancyStatus = {
  Evaluation: "evaluation",
  Active: "active",
  PastDue: "past_due",
  Suspended: "suspended",
  Terminated: "terminated",
} as const;
export type ConsultancyStatus = (typeof ConsultancyStatus)[keyof typeof ConsultancyStatus];
export const CONSULTANCY_STATUSES = [
  ConsultancyStatus.Evaluation,
  ConsultancyStatus.Active,
  ConsultancyStatus.PastDue,
  ConsultancyStatus.Suspended,
  ConsultancyStatus.Terminated,
] as const;

/** The Statuses that refuse every change (Staff can still read and log in). */
export const READ_ONLY_STATUSES: readonly ConsultancyStatus[] = [
  ConsultancyStatus.PastDue,
  ConsultancyStatus.Suspended,
];

export const CONSULTANCY_STATUS_LABELS: Record<ConsultancyStatus, string> = {
  evaluation: "Evaluation",
  active: "Active",
  past_due: "Past due",
  suspended: "Suspended",
  terminated: "Terminated",
};

/**
 * What a Platform Admin may change a Status to, as the backend allows it (tenancy/status.py).
 * Evaluation to Evaluation is "extend the evaluation"; Active to Active renews the paid-until date.
 */
export const ALLOWED_STATUS_CHANGES: Record<ConsultancyStatus, readonly ConsultancyStatus[]> = {
  evaluation: [
    ConsultancyStatus.Evaluation,
    ConsultancyStatus.Active,
    ConsultancyStatus.Terminated,
  ],
  active: [
    ConsultancyStatus.Active,
    ConsultancyStatus.PastDue,
    ConsultancyStatus.Suspended,
    ConsultancyStatus.Terminated,
  ],
  past_due: [ConsultancyStatus.Active, ConsultancyStatus.Suspended, ConsultancyStatus.Terminated],
  suspended: [ConsultancyStatus.Active, ConsultancyStatus.PastDue, ConsultancyStatus.Terminated],
  terminated: [],
};

/** A reason must be given to move into these. */
export const REASON_REQUIRED_STATUSES: readonly ConsultancyStatus[] = [
  ConsultancyStatus.PastDue,
  ConsultancyStatus.Suspended,
  ConsultancyStatus.Terminated,
];

export const STATUS_REASON_MAX_LENGTH = 500;
/** Staff are warned this many days before their office's evaluation ends. */
export const EVALUATION_WARNING_DAYS = 3;

export const STATUS_TEXT = {
  status: "Status",
  changeStatus: "Change status",
  changeStatusFor: (name: string) => `Change the status of ${name}`,
  changeTo: "New status",
  extendEvaluation: "Extend the evaluation",
  makeActive: "Active",
  reason: "Reason",
  reasonHint: "Kept in the platform's record.",
  reasonRequiredHint: "Required. Kept in the platform's record and shown to nobody in the office.",
  paidUntil: "Paid until",
  paidUntilHint: "The last day this office has paid for.",
  evaluationEndsOn: "Evaluation ends on",
  evaluationEndsHint: "The last day of the evaluation.",
  typeToConfirm: (subdomain: string) => `Type ${subdomain} to confirm`,
  terminateWarning:
    "Terminating is final. Every address of this office stops working at once and can't be switched back on. No data is deleted.",
  readOnlyHint: "Staff can look things up and log in, but every change is refused.",
  saveStatus: "Save status",
  terminate: "Terminate",
  statusSaved: (name: string) => `Status saved for ${name}`,
  saveStatusFailed: "We couldn't save the status. Please try again.",
  subdomainDoesntMatch: "Type the subdomain exactly as shown.",
  endsOn: (day: string) => `ends ${day}`,
  ended: "ended",
  paidUntilShort: (day: string) => `paid until ${day}`,
  startingStatus: "Starting status",
  evaluationForDays: "Evaluation (14 days)",
  startActive: "Active",
  // Staff side (spec 13d).
  evaluationEndsSoon: (day: string) =>
    `Your office's trial ends on ${day}. Ask your Admin to contact the CRM team to keep using it.`,
  evaluationEndsToday:
    "Your office's trial ends today. Ask your Admin to contact the CRM team to keep using it.",
  changeRefusedTitle: "That change wasn't saved.",
} as const;

/** How far a new Consultancy's setup has come (issue 60); values match the API. */
export const SetupState = {
  SettingUp: "setting_up",
  Ready: "ready",
  Failed: "failed",
} as const;
export type SetupState = (typeof SetupState)[keyof typeof SetupState];
export const SETUP_STATES = [SetupState.SettingUp, SetupState.Ready, SetupState.Failed] as const;

/** How often the Platform list checks again while an office is being set up. */
export const SETUP_POLL_MS = 3000;

export const SETUP_TEXT = {
  settingUp: "Setting up",
  failed: "Setup failed",
  tryAgain: "Try again",
  tryingAgain: "Starting again…",
  setupStartedAgain: (name: string) => `Setting up ${name} again`,
  tryAgainFailed: "We couldn't start the setup again. Please try again.",
  notReadyHint: "Its features and status can be changed once it is set up.",
  adminsAfterSetup: "Once it is set up, add its Admins with Add admin on its row.",
  setupStarted: (name: string) => `Setting up ${name}. It will be ready in a minute or two.`,
} as const;

/** Add admin, on an office's row of the Platform list (issue 64). */
export const ADMIN_TEXT = {
  addAdmin: "Add admin",
  addAdminTo: (office: string) => `Add an admin to ${office}`,
  name: "Name",
  email: "Email",
  sendInvite: "Send invite",
  inviteExplained: "We'll email them a 6-digit code. They use it to choose their own password.",
  inviteSent: (name: string) => `Invite sent to ${name}`,
  enterName: "Enter their name.",
  enterEmail: "Enter their email.",
  sendFailed: "We couldn't send the invite. Please try again.",
} as const;
