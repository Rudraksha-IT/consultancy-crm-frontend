/**
 * Email to Students (ADR 0023): every email goes out from the product's own account under the
 * office's name, with replies going to the office's contact email. There is no SMS; past SMS
 * records stay readable.
 */

/** How a message was sent; values match the API. Only email now. */
export const CHANNELS = ["email", "sms"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  email: "Email",
  sms: "SMS (no longer available)",
};

/** Whether an email went out; values match the API. */
export const MESSAGE_STATUSES = ["sent", "failed"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

/** The longest subject line and message the API takes. */
export const SUBJECT_MAX_LENGTH = 150;
export const BODY_MAX_LENGTH = 10_000;

/** How many Students' names show as chips before "+N more". */
export const TO_CHIPS_SHOWN = 4;

/**
 * The Plain email's starting text: the greeting and the sign-off, with room between. To many
 * Students it says "Dear Student," (no names). Shown only until the ready-made emails have loaded
 * (or if they couldn't); the backend writes every ready-made email's starting text (ticket 09).
 */
export function plainEmailText(firstName: string | null, sender: string, office: string): string {
  const greeting = firstName === null ? "Dear Student," : `Dear ${firstName},`;
  return `${greeting}\n\n\n\nKind regards,\n${sender}\n${office}`;
}

/** The eight ready-made emails (ticket 09), in the order offered; values match the API. */
export const READY_MADE_KINDS = [
  "welcome",
  "documents_needed",
  "payment_received",
  "fee_reminder",
  "offer_received",
  "visa_result",
  "class_details",
  "plain",
] as const;
export type ReadyMadeKind = (typeof READY_MADE_KINDS)[number];

/** Each ready-made email's name (prototype: the composer's Email row). */
export const READY_MADE: Record<ReadyMadeKind, { name: string }> = {
  welcome: { name: "Welcome" },
  documents_needed: { name: "Documents needed" },
  payment_received: { name: "Payment received" },
  fee_reminder: { name: "Fee reminder" },
  offer_received: { name: "Offer received" },
  visa_result: { name: "Visa result" },
  class_details: { name: "Class details" },
  plain: { name: "Plain email" },
};

/** What a ready-made email is about, picked beside it; values match the API. */
export const READY_MADE_RECORDS = ["payment", "offer", "visa", "batch"] as const;
export type ReadyMadeRecord = (typeof READY_MADE_RECORDS)[number];

export const READY_MADE_RECORD_LABELS: Record<ReadyMadeRecord, string> = {
  payment: "Payment",
  offer: "Offer letter",
  visa: "Visa",
  batch: "Class",
};

/** Where an attached file comes from; values match the API (ticket 12). */
export const ATTACHMENT_KINDS = ["course_file", "document_example", "document_file"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

/** The most one email carries (spec story 49), and how many files may be named at once. */
export const EMAIL_MAX_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 20;

/** The longest record label and reason the API sends. */
export const RECORD_LABEL_MAX_LENGTH = 1000;
export const UNAVAILABLE_MAX_LENGTH = 200;

/** The words of the Email screens (prototype: Email, the composer, the Student picker). */
export const COMMUNICATION_TEXT = {
  emailPage: "Email",
  /** A past SMS in a Student's Activity, e.g. "SMS sent: …". */
  pastSms: "SMS",
  emailIntro: (contact: string | null) =>
    `Emails sent to Students. They show the office's name and logo, and replies go to ${
      contact ?? "the office's contact email"
    }.`,
  noneSent: "No emails sent yet.",
  listFailed: "The emails couldn't be loaded. Try again.",
  sentCount: (count: number) => `${String(count)} sent`,
  sentBy: (name: string) => `By ${name}`,
  sent: "Sent",
  failed: "Failed",
  sendEmail: "Send email",
  emailAStudent: "Email a Student",
  emailManyStudents: "Email many Students",
  emailThisList: "Email this list",
  emailTheClass: "Email the class",
  newEmail: "New email",
  to: "To",
  subject: "Subject",
  subjectPlaceholder: "Subject line",
  message: "Message",
  messagePlaceholder: "Write the message",
  oneHint: "Plain text. The office's logo and contact details are added around it.",
  manyHint:
    'Every Student gets the same words, starting "Dear Student,". The office\'s logo and contact details are added around it.',
  write: "Write",
  preview: "Preview",
  show: "Show",
  previewOf: (who: string) => `Preview: what ${who} receives`,
  eachStudent: "each Student",
  toEachStudent: "to each Student, one by one",
  toName: (name: string) => `to ${name}`,
  repliesGoTo: (contact: string) => `replies go to ${contact}`,
  noSubjectYet: "No subject line yet",
  messageShowsHere: "The message shows here.",
  noReplyLine: "This email comes from an address that can't receive replies.",
  writeTo: (contact: string) => `To answer, write to ${contact}.`,
  phoneLine: (phone: string) => `Phone ${phone}`,
  sentAs: (office: string) => `Sent as ${office}.`,
  eachOwnCopy: (count: number) =>
    `${count === 1 ? "1 Student" : `${String(count)} Students`}, each gets their own copy.`,
  send: "Send",
  sendTo: (count: number) => `Send to ${String(count)}`,
  sending: "Sending…",
  change: "Change",
  moreChips: (count: number) => `+${String(count)} more`,
  emailSentTo: (name: string) => `Email sent to ${name}`,
  sendFailed: (reason: string) => `Not sent: ${reason}`,
  couldntSend: "The email couldn't be sent. Try again.",
  noEmailAddress: (name: string) => `${name} has no email address. Add one in Edit details first.`,
  writeSubject: "Write a subject line.",
  readyMade: "Email",
  readyMadeOption: (name: string, unavailable: string | null) =>
    unavailable === null ? name : `${name} (${unavailable.toLowerCase()})`,
  startAgain: "Start again",
  readyMadeFailed:
    "The ready-made emails couldn't be loaded. You can still write the email yourself.",
  draftFailed: "That email couldn't be filled in. Try again, or write it yourself.",
  skippedOrFailed: "Skipped or failed",
  noContactAdmin:
    "Add the office's contact email in Configuration first. Emails can't go to Students until it's set, because that's where their replies go.",
  noContactStaff: "Your Admin needs to add the office's contact email in Configuration first.",
  openOfficeDetails: "Open Office details",
  findAStudent: "Find a Student",
  findPlaceholder: "Name, phone or email",
  pickOneHint:
    "Choose who to email. Lost Students and Students without an email address can't be chosen.",
  pickManyHint:
    'Tick everyone who should get it. Each gets their own copy, starting "Dear Student,". Lost Students and Students without an email address can\'t be chosen.',
  noEmail: "No email address",
  chosenCount: (count: number) =>
    count === 1 ? "1 Student chosen" : `${String(count)} Students chosen`,
  nobodyChosen: "Nobody chosen yet.",
  clear: "Clear",
  remove: (name: string) => `Remove ${name}`,
  nextWrite: "Next: write the email",
  studentsList: "Students",
  noMatch: (search: string) => `No Student matches “${search}”.`,
  searchFailed: "The Students couldn't be loaded. Try again.",
  loadingStudents: "Loading Students…",
  preTickFailed: "The Students couldn't be loaded. Try again.",
  moreThanMax: (count: number, max: number) =>
    `${String(count)} Students can be chosen. The first ${String(max)} are ticked; one email goes to at most ${String(max)}.`,
  sendingFinished: "Sending finished",
  oneFailureNeverStops:
    "Each email is in that Student's Activity, with whether it was sent or failed.",
  failedLine: (name: string, reason: string) => `${name}: ${reason}`,
  done: "Done",
  attachFiles: "Attach files",
  attachedFiles: "Attached files",
  upToTen: "Up to 10 MB in all",
  sizeOfTen: (size: string) => `${size} of 10 MB`,
  overTen: (size: string, biggest: string) =>
    `The files add up to ${size}, more than the 10 MB one email can carry. Remove ${biggest} or another file.`,
  removeFile: (name: string) => `Remove ${name}`,
  attachFrom: "Attach files from the app",
  whereFrom: "Where the file comes from",
  courseFiles: "Course Files",
  documentExamples: "Document Examples",
  theirDocuments: "Their Documents",
  nothingHere: "Nothing here yet.",
  noDocumentsYet: "No Documents uploaded yet.",
  pickOneFrom: "Course Files, Document Examples and this Student's own Documents.",
  pickManyFrom: "Only Course Files and Document Examples can go to many Students.",
  filesLoading: "Loading the files…",
  filesFailed: "The files couldn't be loaded. Try again.",
  filesNotFetched: "We couldn't get the attached files. Try again.",
  fileLine: (group: string, size: string) => `${group} · ${size}`,
  attachmentsOf: (names: string) => `Attached: ${names}`,
} as const;
