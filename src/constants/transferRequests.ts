/** Where a Transfer Request is; values match the API's `status` (spec 44a-44e). */
export const TransferRequestStatus = {
  Waiting: "waiting",
  Approved: "approved",
  Declined: "declined",
  Cancelled: "cancelled",
  Closed: "closed",
} as const;

export type TransferRequestStatus =
  (typeof TransferRequestStatus)[keyof typeof TransferRequestStatus];

export const TRANSFER_REQUEST_STATUSES = Object.values(TransferRequestStatus);

/** Which requests the list shows; values match the API's `box`. */
export const TransferBox = {
  WaitingForMe: "waiting_for_me",
  Sent: "sent",
  All: "all",
} as const;

export type TransferBox = (typeof TransferBox)[keyof typeof TransferBox];

/** The longest reason for asking, or for declining. */
export const TRANSFER_REASON_MAX_LENGTH = 500;

/** How often the menu asks how many requests wait for my answer. */
export const TRANSFER_COUNT_REFRESH_MS = 60_000;

/** Everything Transfer Requests say on screen. Glossary: Transfer Request, never "claim". */
export const TRANSFER_TEXT = {
  title: "Transfer requests",
  intro:
    "A counsellor asks to take over a Student. The Student's counsellor or an Admin answers. Front Desk answers for Students without a counsellor.",
  boxesLabel: "Which requests",
  boxes: {
    waiting_for_me: "Waiting for me",
    sent: "Sent by me",
    all: "Everyone",
  } satisfies Record<TransferBox, string>,
  empty: {
    waiting_for_me: "Nothing is waiting for your answer.",
    sent: "You haven't asked for any Students. Open a Student who isn't yours and choose “Ask to take this Student”.",
    all: "No transfer requests yet.",
  } satisfies Record<TransferBox, string>,
  loadFailed: "We couldn't load the transfer requests. Please try again.",
  statuses: {
    waiting: "Waiting",
    approved: "Approved",
    declined: "Declined",
    cancelled: "Cancelled",
    closed: "Closed",
  } satisfies Record<TransferRequestStatus, string>,
  noCounsellor: "no counsellor",
  askedToTakeOver: (asker: string, from: string, when: string) =>
    `${asker} asked to take over from ${from}, ${when}`,
  outcome: (status: string, by: string | null, when: string) =>
    `${status}${by === null ? "" : ` by ${by}`}, ${when}`,
  quoted: (text: string) => `“${text}”`,
  /** The menu count's meaning for screen readers. */
  waitingCount: (count: number) =>
    count === 1 ? "1 request waiting for you" : `${String(count)} requests waiting for you`,
  // The profile's banner and button.
  ask: "Ask to take this Student",
  askTitle: (student: string) => `Ask to take ${student}`,
  askIntroAssigned: (student: string, counsellor: string, firstName: string) =>
    `${student} is with ${counsellor}. ${counsellor} and the Admins will get a notification. If they approve, ${firstName} becomes your Student.`,
  askIntroUnassigned: (student: string, firstName: string) =>
    `${student} has no counsellor yet. Front Desk and the Admins will get a notification. If they approve, ${firstName} becomes your Student.`,
  askReasonLabel: "Why should you take this Student?",
  askReasonPlaceholder: "For example, her sister is my Student and the family wants one counsellor",
  askReasonHint: "Required. Seen by whoever answers.",
  send: "Send request",
  sent: (who: string) => `Request sent. ${who} and the Admins have been told.`,
  frontDesk: "Front Desk",
  bannerMine: (when: string, answerer: string) =>
    `You asked to take this Student on ${when}. Waiting for ${answerer} to answer.`,
  bannerTheirs: (when: string) => ` asked to take this Student on ${when}:`,
  bannerWaitingFor: (answerer: string) => `Waiting for ${answerer}.`,
  answerer: (counsellor: string | null) =>
    counsellor === null ? "Front Desk or an Admin" : `${counsellor} or an Admin`,
  approve: "Approve",
  decline: "Decline",
  cancel: "Cancel request",
  cancelTitle: "Cancel this request?",
  cancelBody: (counsellor: string | null) =>
    counsellor === null
      ? "Front Desk and the Admins are no longer asked to hand over this Student."
      : `${counsellor} is no longer asked to hand over this Student.`,
  approveTitle: "Approve this request?",
  approveMoves: (student: string, from: string | null, to: string) =>
    from === null ? `${student} moves to ${to}.` : `${student} moves from ${from} to ${to}.`,
  approveAfter: (firstName: string) =>
    `After that only ${firstName} and the Admins can change this Student.`,
  approveRecorded:
    "The Transfer is recorded in the Student's Activity, naming who asked and who approved.",
  approveAndTransfer: "Approve and transfer",
  approved: (student: string, to: string) => `${student} is now with ${to}`,
  declineTitle: (asker: string) => `Decline ${asker}'s request?`,
  declineStays: (student: string, counsellor: string | null) =>
    counsellor === null
      ? `${student} stays without a counsellor.`
      : `${student} stays with ${counsellor}.`,
  declineReasonLabel: "Reason (optional)",
  declineReasonPlaceholder: "For example, let's talk after her PTE result",
  declineReasonHint: (firstName: string) => `${firstName} will see it.`,
  declined: "Request declined",
  cancelled: "Request cancelled",
  changeFailed: "We couldn't save that. Please try again.",
  notWaiting: "This request has already been answered. Refresh the page to see the answer.",
} as const;
