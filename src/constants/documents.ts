/** Where one checklist item is (values match the API). */
export const DocumentState = {
  NotReceived: "not_received",
  Waiting: "waiting",
  Verified: "verified",
  Rejected: "rejected",
} as const;

export type DocumentState = (typeof DocumentState)[keyof typeof DocumentState];

export const DOCUMENT_STATES = Object.values(DocumentState);

/** Which step a Document is needed for (GLOSSARY: Document Group; issue 80); values match the API. */
export const DocumentGroup = {
  Applying: "applying",
  Visa: "visa",
  Statements: "statements",
} as const;

export type DocumentGroup = (typeof DocumentGroup)[keyof typeof DocumentGroup];

export const DOCUMENT_GROUPS = Object.values(DocumentGroup);

/** Each Document Group as shown, and the line under its heading (prototype DOC_GROUP_HELP). */
export const DOCUMENT_GROUP_LABELS: Record<DocumentGroup, string> = {
  applying: "Applying",
  visa: "Visa",
  statements: "Statements",
};

export const DOCUMENT_GROUP_HELP: Record<DocumentGroup, string> = {
  applying: "For the university applications",
  visa: "For the visa application",
  statements: "Written statements the country asks for",
};

/** The words of Configuration → Documents by country (issues 80, 97; prototype `#consultancy-settings`). */
export const COUNTRY_LIST_TEXT = {
  help: "What each country asks for, on top of the Always needed documents. Applying documents count for every country a Student applies to; Visa and Statements only for the offer they choose.",
  country: "Country",
  countryOption: (country: string, count: number) =>
    `${country} (${String(count)} ${count === 1 ? "document" : "documents"})`,
  groups: "When it's needed",
  nothingFor: (country: string) => `Nothing here for ${country}.`,
  groupFor: (type: string) => `Group for ${type}`,
  remove: "Remove",
  removeFor: (type: string, country: string) => `Take ${type} off ${country}'s list`,
  removeTitle: (type: string, country: string) => `Take ${type} off ${country}'s list?`,
  removeBody: (country: string) =>
    `Students going to ${country} won't be asked for it any more. Files already uploaded stay.`,
  removeAction: "Take it off",
  removed: (country: string) => `Taken off ${country}'s list`,
  addExisting: (country: string, group: string) =>
    `Add an existing document to ${country}'s ${group} list`,
  noneLeft: (country: string) => `Every existing document is already on ${country}'s list.`,
  add: "Add",
  added: (type: string, country: string, group: string) =>
    `${type} added to ${country}'s ${group} list`,
  notOnList: "Not on the list?",
  newDocument: "New document",
  newTitle: (country: string) => `New document for ${country}`,
  newName: "Document name",
  newNameHint: "For example, Police clearance",
  newExplained: (country: string, group: string) =>
    `It's added to ${country}'s ${group} list, and listed under Extra documents so other countries, courses and counsellors can ask for it too.`,
  createAndAdd: "Create and add",
  created: (type: string, country: string, group: string) =>
    `${type} created and added to ${country}'s ${group} list. It's also under Extra documents.`,
  moved: (group: string) => `Moved to ${group}`,
  failed: "We couldn't load the document lists. Refresh the page to try again.",
} as const;

/** Configuration → Documents' three tabs (issue 97; prototype `sec=1&cpart=N`). */
export const DocumentsPart = {
  Always: "always",
  Extra: "extra",
  ByCountry: "byCountry",
} as const;

export type DocumentsPart = (typeof DocumentsPart)[keyof typeof DocumentsPart];

export const DOCUMENTS_PARTS_TEXT: Record<DocumentsPart, { tab: string; help: string }> = {
  always: { tab: "Always needed", help: "On every Student's checklist, whatever their plans." },
  extra: {
    tab: "Extra documents",
    help: "Asked for only when a country's list, a course, or a counsellor for one Student needs them. Documents added from a country's list show here too.",
  },
  byCountry: { tab: "By country", help: COUNTRY_LIST_TEXT.help },
};

/** The judgment on a Document (GLOSSARY: Verification); values match the API. */
export const VERIFICATIONS = ["pending", "verified", "rejected"] as const;

/** What a Document can be linked to (spec 66); values match the API. */
export const DOCUMENT_LINK_KINDS = ["application", "visa"] as const;
export type DocumentLinkKind = (typeof DOCUMENT_LINK_KINDS)[number];

/** What an item on the Bin tab is: a whole Document or one file (issue 79); values match the API. */
export const BIN_ITEM_KINDS = ["document", "file"] as const;

/** The quick picks for why something should be deleted (prototype BIN_REASONS). */
export const BIN_REASONS = ["Wrong Student", "Blurry scan", "Uploaded twice", "Wrong document"];
/** The longest reason the server keeps. */
export const BIN_REASON_MAX_LENGTH = 200;

/** The words of the Bin (issue 79; prototype `#student-1` Documents tab, `#documents` Bin tab). */
export const BIN_TEXT = {
  delete: "Delete",
  deleteFor: (name: string) => `Delete ${name}`,
  deleteTitle: (name: string) => `Delete ${name}?`,
  binBody:
    "It goes to the Bin, and nobody can open or use it. An Admin will check it, then delete it for good or restore it. You can take it out until then.",
  whyLegend: "Why should it be deleted?",
  other: "Other",
  otherLabel: "If Other, say why",
  otherPlaceholder: "For example, belongs to her brother",
  reasonNeeded: "Say why it should be deleted.",
  reasonTooLong: `Use at most ${String(BIN_REASON_MAX_LENGTH)} characters.`,
  putInBin: "Put in the Bin",
  putInBinDone: "In the Bin. An Admin will delete it for good or restore it.",
  adminDocumentBody: (student: string) =>
    `This Document and all its files are removed from ${student}'s documents for good. As an Admin, it doesn't go to the Bin.`,
  adminChosenBody: (student: string) =>
    `The chosen files are removed from ${student}'s documents for good. As an Admin, it doesn't go to the Bin.`,
  whichFiles: "Which files?",
  whichFilesHint: "All of them deletes the whole Document. Untick the ones to keep.",
  tickAFile: "Tick at least one file to delete.",
  deleted: (name: string) => `${name} deleted`,
  filesDeleted: (count: number) => `${String(count)} files deleted`,
  inTheBin: "In the bin",
  inTheBinOf: (type: string) => `${type} in the Bin`,
  note: (reason: string, by: string, at: string) => `${reason}. ${by}, ${at}`,
  nobodyCanUse: "Nobody can open or use it until an Admin restores it.",
  takeOut: "Take it out",
  takeOutFor: (name: string) => `Take ${name} out of the Bin`,
  takenOut: "Taken out of the Bin",
  openBin: "Open the Bin",
  failed: "We couldn't do that. Try again.",
  tabs: "Documents view",
  tabStudents: "Students",
  tabBin: "Bin",
  binIntro:
    "Documents, Course Files and Document Examples that were deleted. Nobody can use them while they wait here. Open the files to check, then delete for good or restore. Nothing is emptied automatically.",
  /** The kind of each item on the Bin tab, shown as a chip (ticket 10). */
  kindDocument: "Document",
  kindCourseFile: "Course File",
  kindDocumentExample: "Document Example",
  courseOf: (university: string, course: string) => `${university}, ${course}`,
  binEmpty: "The Bin is empty.",
  itemsCount: (count: number) => `${String(count)} ${count === 1 ? "item" : "items"} in the Bin`,
  binLoading: "Loading the Bin…",
  binFailed: "We couldn't load the Bin. Refresh the page to try again.",
  oneFileOf: (name: string) => `one file of ${name}`,
  why: "Why:",
  itemLine: (by: string, at: string) => `${by}, ${at}`,
  openFile: (name: string) => `Open ${name}`,
  restore: "Restore",
  restoreFor: (name: string) => `Restore ${name}`,
  restored: (name: string) => `${name} restored`,
  deleteForGood: "Delete for good",
  deleteForGoodFor: (name: string) => `Delete ${name} for good`,
  deleteForGoodTitle: (name: string) => `Delete ${name} for good?`,
  deleteForGoodBody: "The file is removed from storage. This can't be undone.",
  deletedForGood: (name: string) => `${name} deleted for good`,
} as const;

/** Each Verification as a linked Document shows it, in the checklist's words. */
export const VERIFICATION_LABELS: Record<(typeof VERIFICATIONS)[number], string> = {
  pending: "Waiting for a check",
  verified: "Checked and correct",
  rejected: "Rejected",
};

/** Each state as the checklist shows it (prototype `#student-1`, Documents tab). */
export const DOCUMENT_STATE_LABELS: Record<DocumentState, string> = {
  not_received: "Not received",
  waiting: "Waiting for a check",
  verified: "Checked and correct",
  rejected: "Rejected",
};

/** The largest file accepted (the server checks again). */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
/** How many files one upload may carry, and how big together (issue 78; the server checks). */
export const MAX_FILES_AT_ONCE = 10;
export const MAX_UPLOAD_BYTES = 2 * MAX_DOCUMENT_BYTES;

/** File types offered when choosing a file; the server checks what the file really is. */
export const DOCUMENT_FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
export const DOCUMENT_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;
/** A Student's Documents also take zips, kept as sent and only ever downloaded (ticket 09). */
export const ZIP_EXTENSION = ".zip";
export const STUDENT_DOCUMENT_FILE_ACCEPT = `${DOCUMENT_FILE_ACCEPT},${ZIP_EXTENSION},application/zip,application/x-zip-compressed`;
export const STUDENT_DOCUMENT_FILE_EXTENSIONS = [
  ...DOCUMENT_FILE_EXTENSIONS,
  ZIP_EXTENSION,
] as const;

/**
 * Where one checklist document stands on the Documents page (UI revamp 12); values match the API,
 * which uses the words of the page's counts ("missing", not the checklist's "not_received").
 */
export const PaperworkItemState = {
  Rejected: "rejected",
  Waiting: "waiting",
  Missing: "missing",
  Verified: "verified",
} as const;
export type PaperworkItemState = (typeof PaperworkItemState)[keyof typeof PaperworkItemState];

/** The order of a row's pills: the ones that need work come first. */
export const PAPERWORK_PILL_ORDER: readonly PaperworkItemState[] = [
  PaperworkItemState.Rejected,
  PaperworkItemState.Waiting,
  PaperworkItemState.Missing,
  PaperworkItemState.Verified,
];

/** The order of the key above the list (prototype `docPillKey`). */
export const PAPERWORK_KEY_ORDER: readonly PaperworkItemState[] = [
  PaperworkItemState.Verified,
  PaperworkItemState.Waiting,
  PaperworkItemState.Rejected,
  PaperworkItemState.Missing,
];

/** Each state's short word (the key) and what a pill says to screen readers and on hover. */
export const PAPERWORK_STATE_TEXT: Record<PaperworkItemState, { word: string; says: string }> = {
  rejected: { word: "Rejected", says: "rejected, needs a new copy" },
  waiting: { word: "To check", says: "received, waiting to be checked" },
  missing: { word: "Not received", says: "not received yet" },
  verified: { word: "Checked", says: "checked and correct" },
};

/** Whose Students the Documents page lists. */
export const PaperworkScope = { Mine: "mine", Everyone: "everyone" } as const;
export type PaperworkScope = (typeof PaperworkScope)[keyof typeof PaperworkScope];

/** The words of Documents: the checklist, uploading, the Documents page and Configuration. */
export const DOCUMENT_TEXT = {
  /** After the count on a documents button, e.g. "5/9 documents". */
  countWord: "documents",
  countFor: (name: string, done: number, total: number, rejected: number, waiting: number) =>
    [
      `Open the checklist for ${name}: ${String(done)} of ${String(total)} documents`,
      rejected > 0 ? `${String(rejected)} rejected` : "",
      waiting > 0 ? `${String(waiting)} waiting to check` : "",
    ]
      .filter((part) => part !== "")
      .join(", "),
  tab: "Documents",
  received: (done: number, total: number) =>
    `${String(done)} of ${String(total)} documents received`,
  progressLabel: "Documents received",
  checklist: "Document checklist",
  upload: "Upload",
  uploadNewCopy: "Upload new copy",
  uploadFor: (type: string) => `for ${type}`,
  uploadTitle: (student: string) => `Upload a document for ${student}`,
  documentType: "Document Type",
  file: "File",
  fileHint:
    "PDF, JPG, PNG or ZIP, up to 10 MB each. Pick several for one Document, for example the front and back of a passport. Stored privately.",
  chooseFile: "Choose a file to upload.",
  fileTooBig: "The file is too big. Upload at most 10 MB.",
  fileKind: "Upload a PDF, JPG or PNG file.",
  studentFileKind: "Upload a PDF, JPG, PNG or ZIP file.",
  tooManyAtOnce: `Upload at most ${String(MAX_FILES_AT_ONCE)} files at once.`,
  tooBigTogether: "The files are too big together. Upload at most 20 MB at once.",
  uploading: "Uploading…",
  uploaded: "Uploaded. Waiting for a check.",
  uploadedMany: (count: number) =>
    `${String(count)} files uploaded as one Document. Waiting for a check.`,
  filesOf: (type: string) => `Files of ${type}`,
  addFile: "Add a file",
  addFileTo: (type: string) => `Add a file to ${type}`,
  addFileLead: (student: string, needsCheckAgain: boolean) =>
    `For ${student}. The new file joins the same Document${needsCheckAgain ? ", which then needs checking again" : ""}.`,
  addFileHint: "PDF, JPG, PNG or ZIP, up to 10 MB each. Stored privately.",
  addFileSave: "Add",
  fileAdded: (count: number, needsCheckAgain: boolean) =>
    `${count === 1 ? "File added" : `${String(count)} files added`}${needsCheckAgain ? ". The Document needs checking again." : ""}`,
  uploadFailed: "We couldn't upload the file. Try again.",
  notAllowed: "Only the Student's counsellor or an Admin can upload files.",
  privateFiles: "Files are private to this office.",
  viewOnly: "Only the Student's counsellor or an Admin can upload or check files.",
  notOnChecklist: "Not on the current checklist",
  otherDocuments: "Other documents",
  otherDocumentsHelp:
    "Uploaded before, not needed for the current plan. Kept, and moved back if needed again.",
  open: (file: string) => `Open ${file}`,
  download: (file: string) => `Download ${file}`,
  linkFailed: "We couldn't open the file. Try again.",
  loading: "Loading the checklist…",
  failed: "We couldn't load the checklist. Refresh the page to try again.",
  empty: "No documents are needed yet. An Admin chooses them in Configuration.",
  pageTitle: "Documents",
  pageIntro:
    "Every Student's paperwork. Open a checklist to upload new files or check what came in.",
  whose: "Whose documents",
  mine: "My Students",
  everyone: "Everyone",
  onlyWaiting: "Showing only Students with documents waiting to be checked.",
  showEveryone: "Show everyone",
  tileRejected: "Rejected, need a new copy",
  tileWaiting: "Waiting for you to check",
  tileMissing: "Not received yet",
  tileVerified: "Checked and correct",
  chipRejected: (count: number) => `${String(count)} rejected`,
  chipWaiting: (count: number) => `${String(count)} to check`,
  ofTotal: (total: number) => `of ${String(total)}`,
  receivedWord: "received",
  pillsFor: (student: string) => `${student}'s documents`,
  pillKey: "What the colours mean",
  openChecklist: "Open checklist",
  openChecklistFor: (student: string) => `Open checklist for ${student}`,
  dialogTitle: (student: string) => `Documents for ${student}`,
  openTheirPage: "Open their page",
  done: "Done",
  noStudents: "No Students here yet.",
  pageFailed: "We couldn't load the Documents page. Refresh the page to try again.",
  studentsCount: (count: number) => `${String(count)} ${count === 1 ? "Student" : "Students"}`,
  partsLabel: "Documents",
  moveToOptional: "Only when asked",
  moveToEveryone: "Needed by everyone",
  noneHere: "None yet.",
  addName: "Add a document",
  addNameHint: "For example, Police report",
  everyStudentNeedsIt: "Every Student needs this",
  add: "Add document",
  addedForEveryone: "Added to every Student's checklist",
  addedOptional: "Document added. Add it to a country's list, a course or a Student.",
  movedToEveryone: "Now on every Student's checklist",
  movedToOptional: "Now under Extra documents",
  typesFailed: "We couldn't load the documents. Refresh the page to try again.",
  saveFailed: "We couldn't save that. Try again.",
  enterName: "Enter the document's name.",
  linkTo: "Link to (optional)",
  justTheStudent: "Just the Student",
  linkApplication: (university: string, course: string) => `Application: ${university}, ${course}`,
  linkVisa: (university: string, course: string) => `Visa: ${university}, ${course}`,
  forApplication: (university: string) => `For ${university}`,
  forVisa: (university: string) => `For the ${university} visa`,
  itsCorrect: "It's correct",
  itsCorrectFor: (type: string) => `It's correct: ${type}`,
  reject: "Reject",
  rejectFor: (type: string) => `Reject ${type}`,
  rejectTitle: "Reject Document",
  reason: "Reason",
  reasonPlaceholder: "e.g. Photo is blurred, the passport number can't be read",
  reasonLine: (reason: string) => `Reason: ${reason}`,
  reasonNeeded: "Say why the document is rejected.",
  verified: (type: string) => `${type} verified`,
  rejected: "Rejected. Ask the Student for a new copy.",
  checkFailed: "We couldn't save that. Try again.",
  checkNotAllowed: "Only the Student's counsellor or an Admin can check files.",
  changedMeanwhile: "This document has changed since you opened it. Refresh the page to see it.",
  linkedFor: (record: string) => `Documents for ${record}`,
  pickerChoices: "Documents to ask for",
  pickerNone: "No other documents yet. Add one below.",
  pickerNewName: "Something not on the list",
  pickerPlaceholder: "For example, Portfolio of work",
  pickerHint: "Added to the office's documents, and ticked here.",
  pickerAdd: "Add",
  pickerTypeFirst: "Type the document's name first.",
  pickerTooLong: "Use at most 80 characters.",
  pickerEveryone: (type: string) => `${type} is already needed by every Student.`,
  pickerAlreadyThere: (type: string) => `${type} is already on the list, so it's ticked.`,
  pickerAdded: (type: string) => `${type} added and ticked. Save to keep it.`,
  pickerSave: "Save",
  listSaved: "Document list saved",
  askAnother: "Ask for another document",
  askAnotherHint: "Only for this Student. Lists for each country are set in Configuration.",
  askTitle: (student: string) => `Ask ${student} for another document`,
  askLead: (student: string) => `Only ${student} will be asked for these.`,
  notNeeded: "Not needed",
  notNeededFor: (type: string) => `Not needed: ${type}`,
  takeOffTitle: (type: string, student: string) => `Take ${type} off ${student}'s checklist?`,
  takeOffBody: "It is no longer asked for. You can ask for it again later.",
  takeOff: "Take it off",
  takenOff: "Taken off the checklist",
  usedBy: (parts: readonly string[]) => `Asked for by ${parts.join(", ")}`,
  notAskedYet: "Not asked for yet",
  countries: (count: number) => `${String(count)} ${count === 1 ? "country" : "countries"}`,
  courses: (count: number) => `${String(count)} ${count === 1 ? "course" : "courses"}`,
  students: (count: number) => `${String(count)} ${count === 1 ? "Student" : "Students"}`,
  files: (count: number) => `${String(count)} ${count === 1 ? "file" : "files"} uploaded`,
  remove: "Remove",
  removeFor: (type: string) => `Remove ${type}`,
  removeTitle: (type: string) => `Remove ${type}?`,
  removeBody:
    "It comes off the office's documents, so it can't be asked for any more. You can add it again later.",
  removed: "Removed from the office's documents",
  theVisa: (university: string) => `the ${university} visa`,
} as const;

/** The most example files one Document Type shows (ticket 11; those in the Bin don't count). */
export const EXAMPLES_MAX = 3;
/** The largest example file kept (5 MB). */
export const EXAMPLE_MAX_BYTES = 5 * 1024 * 1024;
/** The longest instruction kept. */
export const INSTRUCTION_MAX_LENGTH = 500;
/** What an example file may be, for the file picker; its bytes are checked by the server. */
export const EXAMPLE_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

const exampleFiles = (count: number): string =>
  count === 1 ? "1 example file" : `${count === 0 ? "no" : String(count)} example files`;

/**
 * The words of Document Examples (ticket 11; prototype `#consultancy-settings` with `sec=1`, and
 * `#student-1` with `ptab=docs`).
 */
export const EXAMPLE_TEXT = {
  // Configuration → Documents
  examples: "Examples",
  examplesFor: (name: string) => `Instruction and examples for ${name}`,
  summary: (hasInstruction: boolean, count: number) =>
    !hasInstruction && count === 0
      ? "No example yet"
      : `${hasInstruction ? "Instruction" : "No instruction"} and ${exampleFiles(count)}`,
  editTitle: (name: string) => `${name}: instruction and examples`,
  editIntro:
    'Students see these in the "Documents needed" email, and Staff see them on the checklist. Never a Student\'s own Document.',
  instruction: "Instruction (optional)",
  instructionPlaceholder: "For example, last 6 months, bank stamp on every page",
  instructionCount: (length: number) => `${String(length)} of ${String(INSTRUCTION_MAX_LENGTH)}`,
  filesLegend: "Example files",
  filesCount: (count: number) => `(${String(count)} of ${String(EXAMPLES_MAX)})`,
  noFiles: "No example files yet.",
  open: "Open",
  openFile: (name: string) => `Open ${name}`,
  replace: "Replace",
  replaceFile: (name: string) => `Replace ${name}`,
  remove: "Remove",
  removeFile: (name: string) => `Remove ${name}`,
  addFile: "Add an example file",
  addFileFor: (name: string) => `Add an example file to ${name}`,
  full: "3 is the most. Remove one to add another.",
  removeTitle: (file: string) => `Remove ${file}?`,
  removeBody: "It goes to the Bin, where an Admin can restore it or delete it for good.",
  added: (file: string) => `${file} added`,
  replaced: (old: string) => `Replaced. ${old} is in the Bin.`,
  removed: (file: string) => `${file} is in the Bin`,
  saved: (name: string) => `Saved for ${name}`,
  wrongKind: "Use a PDF, JPEG or PNG file.",
  tooBig: (size: string) => `That file is ${size}. An example can be at most 5 MB.`,
  uploadFailed: "We couldn't upload the file. Try again.",
  saveFailed: "We couldn't save the instruction. Try again.",
  changeFailed: "We couldn't change the examples. Try again.",
  linkFailed: "We couldn't open the file. Try again.",
  // A Student's checklist
  emailExamples: (count: number, firstName: string) =>
    `Email ${count === 1 ? "the example" : "the examples"} to ${firstName}`,
  exampleSubject: (typeName: string) => `An example of the ${typeName} we need`,
  exampleLine: (typeName: string, instruction: string) =>
    instruction === ""
      ? `Here is an example of the ${typeName} we need.`
      : `Here is an example of the ${typeName} we need. ${instruction}`,
  seeWhat: "See what it should look like.",
  see: (count: number) => (count === 1 ? "See the example" : `See ${String(count)} examples`),
  seeFor: (count: number, name: string) =>
    count === 1 ? `See the example of ${name}` : `See ${String(count)} examples of ${name}`,
  viewTitle: (name: string) => `${name}: what it should look like`,
  examplesOf: (name: string) => `Examples of ${name}`,
  download: "Download",
  downloadFile: (name: string) => `Download ${name}`,
  examplesOnly: "Examples only. Never put on a Student's checklist as their own Document.",
} as const;
