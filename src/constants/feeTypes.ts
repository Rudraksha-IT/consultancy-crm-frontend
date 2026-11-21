/** Fee Types (GLOSSARY: Fee Type): what a Fee or Payment is for (issue 06). */

/** The longest Fee Type name the API accepts. */
export const FEE_TYPE_NAME_MAX_LENGTH = 60;
/** The longest note on a Fee or Payment the API accepts. */
export const FEE_NOTE_MAX_LENGTH = 200;

/** "2 Fees", "1 Payment", or nothing for none. */
function countOf(count: number, one: string, many: string): string[] {
  if (count === 0) return [];
  return [count === 1 ? `1 ${one}` : `${String(count)} ${many}`];
}

export const FEE_TYPE_TEXT = {
  // Configuration -> Fees.
  title: "Fee Types",
  help: "What a Fee or Payment is for. Staff pick one every time, so money adds up by type. A Fee Type in use can be hidden, never deleted.",
  listLabel: "Fee Types",
  loading: "Loading the Fee Types…",
  loadFailed: "We couldn't load the Fee Types. Please refresh the page.",
  hidden: "Hidden",
  usedBy: (fees: number, payments: number) => {
    const parts = [...countOf(fees, "Fee", "Fees"), ...countOf(payments, "Payment", "Payments")];
    return parts.length === 0 ? "Not used yet" : `Used by ${parts.join(" and ")}`;
  },
  otherExplained: "Always there, and asks for a short note",
  moveUp: (name: string) => `Move ${name} up`,
  moveDown: (name: string) => `Move ${name} down`,
  rename: "Rename",
  renameFor: (name: string) => `Rename ${name}`,
  hide: "Hide",
  hideFor: (name: string) => `Hide ${name}`,
  show: "Show",
  showFor: (name: string) => `Show ${name}`,
  delete: "Delete",
  deleteFor: (name: string) => `Delete ${name}`,
  addLabel: "Add a Fee Type",
  addPlaceholder: "For example, SOP writing",
  add: "Add",
  added: (name: string) => `${name} added`,
  renamed: (name: string) => `Renamed to ${name}`,
  hiddenToast: (name: string) => `${name} is hidden. Old records keep it.`,
  shownToast: (name: string) => `${name} is offered again`,
  deleted: (name: string) => `${name} deleted`,
  footnote:
    "A hidden Fee Type stays on old Fees and Payments but isn't offered for new ones. The order here is the order in every list.",
  enterName: "Type the Fee Type's name.",
  renameTitle: (name: string) => `Rename ${name}`,
  nameLabel: "Fee Type",
  renameHint: "Old Fees and Payments show the new name too.",
  save: "Save",
  deleteTitle: (name: string) => `Delete ${name}?`,
  deleteBody: "No Fee or Payment uses it, so nothing else changes.",
  saveFailed: "We couldn't save that. Please try again.",
  // Fee and Payment forms.
  feeType: "Fee Type",
  choose: "Choose a Fee Type",
  note: "Note",
  notePlaceholder: "For example, first half",
  noteOptional: "Optional",
  noteNeeded: "Needed for Other: say what it is for.",
  chooseRefused: "Choose a Fee Type.",
  noteRefused: "Add a short note for Other.",
  typesFailed: "We couldn't load the Fee Types. Please refresh the page.",
  // Filters and the Money report.
  anyFeeType: "Any Fee Type",
  whereFrom: "Where the money came from",
  whereFromHelp: "Payments from Students in these months, by Fee Type.",
  noPayments: "No payments in these months.",
} as const;
