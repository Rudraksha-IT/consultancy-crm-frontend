/** Why someone was notified; values match the API's `kind` (spec 80). */
export const NotificationKind = {
  Assigned: "assigned",
  DueToday: "due_today",
  Overdue: "overdue",
  /** Someone asked to take a Student I may answer for (issue 57). */
  TransferAsked: "transfer_asked",
  TransferApproved: "transfer_approved",
  TransferDeclined: "transfer_declined",
  /** (Admins) Someone put a Document or a file in the Bin (issue 79). */
  BinAdded: "bin_added",
  /** An Admin restored, or deleted for good, what I put in the Bin. */
  BinRestored: "bin_restored",
  BinDeleted: "bin_deleted",
  /** (Admins) Someone asked for Work From Home dates (issue 87). */
  WorkFromHomeAsked: "work_from_home_asked",
  /** An Admin approved, declined or set my Work From Home dates. */
  WorkFromHomeApproved: "work_from_home_approved",
  WorkFromHomeDeclined: "work_from_home_declined",
  WorkFromHomeSet: "work_from_home_set",
} as const;

export type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind];

export const NOTIFICATION_KINDS = Object.values(NotificationKind);

/** How often the bell asks for new notifications. Due Tasks are noticed when it asks. */
export const NOTIFICATIONS_REFRESH_MS = 60_000;

export const NOTIFICATION_TEXT = {
  title: "Notifications",
  /** The bell's name, with how many are unread. */
  bellLabel: (unread: number) =>
    unread === 0 ? "Notifications" : `Notifications, ${String(unread)} unread`,
  /** The number on the bell; anything over 99 shows as "99+". */
  badge: (unread: number) => (unread > 99 ? "99+" : String(unread)),
  markAllRead: "Mark all as read",
  openStudent: "Open Student",
  /** Opens where Work From Home dates are: the person's tab (Admins) or My working hours. */
  open: "Open",
  unread: "Unread",
  nothingNew: "Nothing new.",
  loadFailed: "We couldn't load your notifications. Please try again.",
  /** What a Bin notification is about: "page-2.pdf of Passport (Sita Gurung)". */
  binItem: (item: string, student: string) => `${item} (${student})`,
  /** After "put …": where, and why. */
  inTheBinBecause: (reason: string) => ` in the Bin: ${reason}`,
  markFailed: "We couldn't mark them as read. Please try again.",
  /** What happened, from who did it and what it's about (a Task's title or a Student's name). */
  message: {
    assigned: (by: string, title: string) => `${by} assigned you a Task: ${title}`,
    due_today: (_by: string, title: string) => `Task due today: ${title}`,
    overdue: (_by: string, title: string) => `Task overdue: ${title}`,
    transfer_asked: (by: string, student: string) => `${by} asked to take ${student}`,
    transfer_approved: (by: string, student: string) =>
      `${by} approved your request: ${student} is now your Student`,
    transfer_declined: (by: string, student: string) =>
      `${by} declined your request for ${student}`,
    bin_added: (by: string, item: string) => `${by} put ${item}`,
    bin_restored: (by: string, item: string) => `${by} restored ${item} from the Bin`,
    bin_deleted: (by: string, item: string) => `${by} deleted ${item} for good from the Bin`,
    work_from_home_asked: (by: string, dates: string) => `${by} asked to work from home: ${dates}`,
    work_from_home_approved: (by: string, dates: string) =>
      `${by} approved your work from home dates: ${dates}`,
    work_from_home_declined: (by: string, dates: string) =>
      `${by} declined your work from home dates: ${dates}`,
    work_from_home_set: (by: string, dates: string) =>
      `${by} set work from home dates for you: ${dates}`,
  } satisfies Record<NotificationKind, (by: string, about: string) => string>,
} as const;
