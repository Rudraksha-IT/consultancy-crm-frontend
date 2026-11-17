/** How an email or SMS is sent; values match the API. */
export const Channel = { Email: "email", Sms: "sms" } as const;
export type Channel = (typeof Channel)[keyof typeof Channel];
/** The one place the channel order lives: Email first wherever both are offered (issue 72). */
export const CHANNELS = [Channel.Email, Channel.Sms] as const;

export const CHANNEL_LABELS: Record<Channel, string> = { email: "Email", sms: "SMS" };

/**
 * The channel a send starts on: Email, or SMS for a Student with no email address. With no
 * single Student (sending to many), Email; each Student without an address then fails on its own.
 */
export function defaultChannel(email?: string): Channel {
  return email?.trim() === "" ? Channel.Sms : Channel.Email;
}

/** Whether a message went out (spec 91); values match the API. */
export const MESSAGE_STATUSES = ["sent", "failed"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

/** The SMS companies an office can send through; "" means SMS isn't set up. */
export const SMS_PROVIDERS = ["", "sparrow", "aakash"] as const;
export type SmsProvider = (typeof SMS_PROVIDERS)[number];

export const SMS_PROVIDER_LABELS: Record<SmsProvider, string> = {
  "": "Not set up",
  sparrow: "Sparrow SMS",
  aakash: "Aakash SMS",
};

/** The SMTP ports an email server can be reached on: STARTTLS, or TLS from the start (465). */
export const EMAIL_PORTS = [587, 465, 25, 2525] as const;
export type EmailPort = (typeof EMAIL_PORTS)[number];

/** How long one message can be; an SMS is split into parts of `SMS_PART_LENGTH`. */
export const SMS_MAX_LENGTH = 800;
export const EMAIL_MAX_LENGTH = 5000;
export const SMS_PART_LENGTH = 160;

/**
 * The words of the Email & SMS screens (prototype: Configuration, Email & SMS, Send dialog).
 * Shown as "Email & SMS", never "Messages", which could be confused with the Inbox (issue 72).
 */
export const COMMUNICATION_TEXT = {
  emailAndSmsPage: "Email & SMS",
  emailAndSmsIntro: "Email and SMS sent to Students from the office's own accounts.",
  noneSent:
    "Nothing sent yet. Send an email or SMS with Send email or SMS, or from a Student's page.",
  listFailed: "Email & SMS couldn't be loaded. Try again.",
  sentCount: (count: number) => `${String(count)} sent`,
  sentBy: (name: string) => `By ${name}`,
  sent: "Sent",
  failed: "Failed",
  sendEmailOrSms: "Send email or SMS",
  messageTo: (name: string) => `Message ${name}`,
  channel: "Channel",
  message: "Message",
  greeting: "Namaste, ",
  smsLength: (characters: number, parts: number) =>
    `${String(characters)} ${characters === 1 ? "character" : "characters"}, ${String(parts)} SMS`,
  emailLength: (characters: number) =>
    `${String(characters)} ${characters === 1 ? "character" : "characters"}`,
  sendsTo: (to: string) => `Goes to ${to}.`,
  noEmailAddress: "This Student has no email address.",
  smsChosen: "SMS is chosen because this Student has no email address.",
  send: "Send",
  sending: "Sending…",
  wasSent: (channel: string) => `${channel} sent`,
  sendFailed: (reason: string) => `Failed: ${reason}`,
  couldntSend: "The message couldn't be sent. Try again.",
  emailAndSms: "Email and SMS",
  emailAndSmsHelp: "Email and SMS go out from the office's own accounts.",
  smsCompany: "SMS company",
  senderName: "Sender name",
  senderHint: "The name Sparrow SMS approved for you, up to 11 letters and numbers.",
  apiToken: "API token",
  secretHint: "Kept secret. It can't be read back after saving.",
  savedSecretHint: "Saved and kept secret. Leave it empty to keep it, or paste a new one.",
  emailServer: "Email server",
  emailServerPlaceholder: "smtp.zoho.com",
  emailPort: "Port",
  emailUsername: "Email username",
  emailPassword: "Email password",
  sendFrom: "Send from",
  sendFromPlaceholder: "info@youroffice.com",
  save: "Save",
  saved: "Email and SMS settings saved",
  saveFailed: "The settings couldn't be saved. Try again.",
  loadFailed: "The Email and SMS settings couldn't be loaded. Try again.",
  sendTestSms: "Send me a test SMS",
  testSmsSent: (to: string) => `Test SMS sent to ${to}`,
  testSmsFailed: (reason: string) => `Test SMS failed: ${reason}`,
  testSmsCouldnt: "The test SMS couldn't be sent. Try again.",
  smsReady: "SMS is set up",
  smsNotReady: "SMS is not set up",
  emailReady: "Email is set up",
  emailNotReady: "Email is not set up",
  sms: "SMS",
  email: "Email",
  newBulkMessage: "New bulk message",
  sendTo: "Send to",
  stageOption: (stage: string) => `Students in Stage: ${stage}`,
  classOption: (name: string) => `Class: ${name}`,
  studentCount: (count: number) => `${String(count)} ${count === 1 ? "Student" : "Students"}`,
  counting: "Counting…",
  next: "Next",
  messageThisList: "Message this list",
  messageStudents: (count: number) =>
    `Message ${String(count)} ${count === 1 ? "Student" : "Students"}`,
  fromListFilters: "From the current Student list filters.",
  messageTheClass: "Message the class",
  inThisClass: (count: number) =>
    `${String(count)} ${count === 1 ? "Student" : "Students"} in this class.`,
  sendToCount: (count: number) => (count > 1 ? `Send to ${String(count)}` : "Send"),
  oneByOne: "Sent one by one through your provider. You'll see which ones failed.",
  nobodyToSendTo: "No Students to send to.",
  tooManyStudents: (max: number) =>
    `Message at most ${String(max)} Students at once. Narrow the list first.`,
  countFailed: "The Students couldn't be counted. Try again.",
  sendingFinished: "Sending finished",
  oneFailureNeverStops: "One failure never stops the rest.",
  failedLine: (name: string, reason: string) => `${name} — ${reason}`,
  done: "Done",
} as const;
