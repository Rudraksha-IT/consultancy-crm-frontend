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
 * Students it says "Dear Student," (no names). Ticket 09 moves the starting text to the backend.
 */
export function plainEmailText(firstName: string | null, sender: string, office: string): string {
  const greeting = firstName === null ? "Dear Student," : `Dear ${firstName},`;
  return `${greeting}\n\n\n\nKind regards,\n${sender}\n${office}`;
}

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
} as const;
