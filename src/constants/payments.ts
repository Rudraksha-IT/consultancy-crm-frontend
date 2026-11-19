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

export const PAYMENT_TEXT = {
  takeAPayment: "Take a payment",
  recordFrom: (name: string) => `Record a payment from ${name}`,
  amount: "Amount (NPR)",
  date: "Date",
  method: "Method",
  afterSaving: "After saving you'll see the receipt.",
  othersStayWithAdmin: "Other Payments and totals stay with the Admin.",
  saveAndShowReceipt: "Save and show receipt",
  recorded: "Payment recorded",
  receipt: "Receipt",
  receiptNumber: "Receipt no.",
  receivedFrom: "Received from",
  for: "For",
  paidBy: "Paid by",
  receivedBy: (name: string) => `Received by ${name}`,
  stamp: "Received",
  printReceipt: "Print receipt",
  cannotTakePayments: "You can't take payments any more. Refresh the page to see why.",
  closeAfterPrinting: "Print it now: once closed, only an Admin can open it again.",
  // Editing and deleting (Admins; spec 75-76).
  editTitle: (receiptNumber: string) => `Edit Payment ${receiptNumber}`,
  changeIsRecorded: "The change is recorded in History.",
  saveChanges: "Save changes",
  changesSaved: "Changes saved",
  deletePayment: "Delete payment",
  confirmDeleteTitle: (receiptNumber: string) => `Delete Payment ${receiptNumber}?`,
  confirmDelete: (receiptNumber: string, amount: string, name: string, forWhat: string) =>
    `${receiptNumber}, ${amount} from ${name} for ${forWhat}.`,
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
  editFor: (receiptNumber: string) => `Edit Payment ${receiptNumber}`,
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
  search: "Student or receipt number",
  feeType: "Fee Type",
  show: "Show",
} as const;
