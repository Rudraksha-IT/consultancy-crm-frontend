/** Fees and Balances (GLOSSARY: Fee, Balance), with the Accounts Module (issue 35). */

/** How many Students who owe the Admin's Home shows. */
export const OWING_ON_HOME = 5;

export const FEE_TEXT = {
  // The Student's Fees tab (spec 76a-76b).
  agreedFees: "Agreed fees",
  total: "Total",
  paidSoFar: "Paid so far",
  stillToPay: "Still to pay",
  overpaid: (amount: string) => `Paid ${amount} more than the agreed fees.`,
  paidInFull: "Paid in full",
  whatTheyAgreed: "What they agreed to pay",
  addAFee: "Add a fee",
  noFeesYet: "No fees agreed yet.",
  feesFailed: "We couldn't load the fees. Please refresh the page.",
  counsellorNote: "Payments and what is still to pay stay with the Admin.",
  edit: "Edit",
  addedBy: (name: string) => `Added by ${name}`,
  editFor: (forWhat: string) => `Edit fee: ${forWhat}`,
  // Adding, changing and deleting.
  addTitle: (name: string) => `Add a fee for ${name}`,
  editTitle: "Edit fee",
  amount: "Amount (NPR)",
  addButton: "Add fee",
  added: "Fee added",
  saveChanges: "Save changes",
  changesSaved: "Changes saved",
  isRecorded: "The change is recorded in History.",
  deleteFee: "Delete fee",
  confirmDeleteTitle: (forWhat: string) => `Delete the fee for ${forWhat}?`,
  confirmDelete: (forWhat: string, amount: string) => `${forWhat}, ${amount}.`,
  deletionIsRecorded: "The deletion is recorded in the Student's History.",
  confirmDeleteButton: "Delete fee",
  deleted: "Fee deleted",
  deleteFailed: "We couldn't delete it. Please try again.",
  notAllowed: "Only the Student's counsellor or an Admin can change fees. Refresh the page.",
  // Accounts -> Student fees (spec 76b).
  studentFees: "Student fees",
  studentsCount: (count: number) => (count === 1 ? "1 Student" : `${String(count)} Students`),
  collected: "Collected",
  stillToCollect: "Still to collect",
  oweMoney: (count: number) =>
    count === 1 ? "1 Student owes money" : `${String(count)} Students owe money`,
  student: "Student",
  agreed: "Agreed",
  paid: "Paid",
  details: "Details",
  detailsFor: (name: string) => `Fee details for ${name}`,
  feesFor: (name: string) => `Fees for ${name}`,
  openProfile: "Open their profile",
  paidShareOf: (name: string) => `Share of the fees ${name} has paid`,
  everyonePaid: "Everyone has paid in full.",
  owingFailed: "We couldn't load who still owes. Please refresh the page.",
  paidInFullCount: (count: number) =>
    count === 1 ? "1 Student has paid in full." : `${String(count)} Students have paid in full.`,
  // The Admin's Home (spec 22a).
  atAGlance: "This month at a glance",
  glanceFailed: "We couldn't load this month's money. Please refresh the page.",
  openAccounts: "Open Accounts",
  moneyIn: "Money in",
  moneyInSplit: (students: string, commission: string) =>
    `${students} from Students, ${commission} commission`,
  profitThisMonth: "Profit this month",
  lossThisMonth: "Loss this month",
  moneyInMinusOut: "Money in minus money out",
  thisMonth: "Payments this month",
  feesToCollect: "Fees still to collect",
  whoStillOwes: "Who still owes fees",
  allFees: "All fees",
  left: (amount: string) => `${amount} left`,
  paidOf: (paid: string, fees: string, percent: number) =>
    `Paid ${paid} of ${fees} (${String(percent)}%)`,
} as const;
