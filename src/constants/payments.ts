/** How a Student paid (GLOSSARY: Payment); values match the API. */
export const PaymentMethod = {
  Cash: "cash",
  Esewa: "esewa",
  Khalti: "khalti",
  FonepayQr: "fonepay_qr",
  BankTransfer: "bank_transfer",
  Cheque: "cheque",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PAYMENT_METHODS = Object.values(PaymentMethod);

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  esewa: "eSewa",
  khalti: "Khalti",
  fonepay_qr: "Fonepay QR",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
};

/** The largest amount the API accepts (NPR 10 crore). */
export const PAYMENT_MAX_AMOUNT = 100_000_000;

/** The most lines (Payments) one receipt takes in one go (ticket 07). */
export const MAX_PAYMENT_LINES = 10;

export const PAYMENT_TEXT = {
  takeAPayment: "Take a payment",
  recordFrom: (name: string) => `Record a payment from ${name}`,
  amount: "Amount (NPR)",
  date: "Date",
  method: "Method",
  othersStayWithAdmin: "Other Payments and totals stay with the Admin.",
  // No receipt or receipt number is shown or printed for now (asked 2026-11-20).
  savePayment: "Save payment",
  // One visit split across Fee Types: a Payment per line, one receipt (spec 73).
  whatItsFor: "What it's for",
  splitHelp:
    "Split one visit's money across Fee Types. Each line is its own Payment, saved together.",
  line: (place: number) => `Line ${String(place)}`,
  removeLine: (place: number) => `Remove line ${String(place)}`,
  addLine: "Add another line",
  linesFull: `Up to ${String(MAX_PAYMENT_LINES)} lines in one payment.`,
  total: "Total",
  totalOf: (amount: string) => `Total ${amount}`,
  paidDifferently: (method: string, date: string) => `${method}, ${date}`,
  receiptFailed: "We couldn't load the receipt. Please try again.",
  recorded: "Payment recorded",
  receipt: "Receipt",
  receiptNumber: "Receipt no.",
  receivedFrom: "Received from",
  for: "For",
  paidBy: "Paid by",
  receivedBy: (name: string) => `Received by ${name}`,
  stamp: "Received",
  emailIt: "Email it",
  printReceipt: "Print receipt",
  cannotTakePayments: "You can't take payments any more. Refresh the page to see why.",
  closeAfterPrinting: "Print it now: once closed, only an Admin can open it again.",
  // Editing and deleting (Admins; spec 75-76).
  editTitle: "Edit payment",
  recordedInHistory: "The change is recorded in History.",
  saveChanges: "Save changes",
  changesSaved: "Changes saved",
  deletePayment: "Delete payment",
  confirmDeleteTitle: "Delete this payment?",
  confirmDelete: (amount: string, name: string, forWhat: string) =>
    `${amount} from ${name} for ${forWhat}.`,
  deletionIsRecorded: "The deletion is recorded in the Student's History with these details.",
  confirmDeleteButton: "Delete Payment",
  deleted: "Payment deleted",
  deleteFailed: "We couldn't delete it. Please try again.",
  onlyAdminChanges: "Only an Admin can change or delete a Payment. Refresh the page to see why.",
  // The list (Accounts -> Money in, and the Student's Fees tab; spec 74).
  student: "Student",
  amountHeading: "Amount",
  edit: "Edit",
  receiptFor: (receiptNumber: string) => `Receipt ${receiptNumber}`,
  editFor: (name: string, forWhat: string, amount: string) =>
    `Edit payment from ${name}: ${forWhat}, ${amount}`,
  paymentsCount: (count: number) => (count === 1 ? "1 payment" : `${String(count)} payments`),
  listFailed: "We couldn't load the Payments. Please refresh the page.",
  noPaymentsMatch: "No payments match these filters.",
  noPaymentsYet: "No payments yet.",
  paymentsReceived: "Payments received",
  feesTab: "Fees",
} as const;

/** Accounts (Admins, with the Accounts Module). Money in is its first section (issue 19). */
export const ACCOUNTS_TEXT = {
  title: "Accounts",
  intro: "Fees, income, costs and university commission. Only Admins can see this.",
  sections: "Accounts section",
  moneyIn: "Money in",
  fromStudents: "From Students",
  between: (from: string, to: string) => `${from} to ${to}`,
  since: (from: string) => `Since ${from}`,
  until: (to: string) => `Until ${to}`,
  allDates: "All dates",
  filters: "Filter payments",
  from: "From",
  to: "To",
  search: "Student name or phone",
  feeType: "Fee Type",
  show: "Show",
} as const;
