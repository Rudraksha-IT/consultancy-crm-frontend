/** Commission from Universities (GLOSSARY: Commission), with the Accounts Module (issue 37). */

/** Where a Commission is; values match the API. To confirm with the Consultancy. */
export const CommissionStatus = {
  WaitingForEnrolment: "waiting_for_enrolment",
  ClaimSent: "claim_sent",
  Received: "received",
} as const;

export type CommissionStatus = (typeof CommissionStatus)[keyof typeof CommissionStatus];

export const COMMISSION_STATUSES = Object.values(CommissionStatus);

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  waiting_for_enrolment: "Waiting for enrolment",
  claim_sent: "Claim sent",
  received: "Received",
};

export const COMMISSION_TEXT = {
  // Accounts -> Commission (spec 76d).
  commission: "Commission",
  waitingFootnote: "Student hasn't started yet",
  claimFootnote: "Invoice sent to the university",
  receivedFootnote: "Arrived from universities",
  byStudent: "Commission by Student",
  addCommission: "Add commission",
  student: "Student",
  university: "University",
  amount: "Amount",
  status: "Status",
  intake: (intake: string) => `Intake ${intake}`,
  statusFor: (name: string) => `Commission status for ${name}`,
  receivedOn: (date: string) => `Received ${date}`,
  marked: (status: string) => `Commission marked ${status}`,
  statusFailed: "We couldn't change the status. Please try again.",
  footnote: "Amounts are converted to NPR when the claim is sent.",
  noneYet: "No commission recorded yet.",
  listFailed: "We couldn't load the commission. Please refresh the page.",
  count: (count: number) => (count === 1 ? "1 commission" : `${String(count)} commissions`),
  // Adding (spec 76d).
  addTitle: "Add commission",
  findStudent: "Find a Student",
  findStudentPlaceholder: "Name or phone",
  chooseStudent: "Choose a Student",
  chooseUniversity: "Choose a University",
  chooseIntake: "Choose an intake",
  intakeLabel: "Intake",
  expectedAmount: "Expected amount (NPR)",
  save: "Save",
  added: "Commission added",
  universitiesFailed: "We couldn't load the Catalogue. Please try again.",
  studentRefused: "Choose a Student.",
  universityRefused: "Choose a University from the Catalogue.",
  intakeRefused: "Choose a month and year from 2000 on.",
  notAllowed: "Only an Admin can see or change Commission. Refresh the page.",
  // Money in and the Admin's Home (spec 76e, 22a).
  fromCommission: "From university commission",
  totalMoneyIn: "Total money in",
  commissionCount: (count: number) =>
    count === 1 ? "1 commission received" : `${String(count)} commissions received`,
  toCome: "Commission to come",
  fromUniversities: "From universities",
} as const;
