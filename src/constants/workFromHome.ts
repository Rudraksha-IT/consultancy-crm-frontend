/**
 * Work From Home dates (spec 131-133, issue 87). Shown as "Work from home", never "WFH".
 * Admins clock in from any network; other Staff only on Approved dates.
 */

/** Where a set of dates is; values match the API. Only Approved dates give permission. */
export const WorkFromHomeStatus = {
  Waiting: "waiting",
  Approved: "approved",
  Declined: "declined",
  Cancelled: "cancelled",
  Ended: "ended",
} as const;

export type WorkFromHomeStatus = (typeof WorkFromHomeStatus)[keyof typeof WorkFromHomeStatus];

export const WORK_FROM_HOME_STATUSES = Object.values(WorkFromHomeStatus);

/** The longest reason the server keeps. */
export const WORK_FROM_HOME_REASON_MAX = 200;

/** The tab on an employee's page, in the address (`?tab=wfh`). */
export const WORK_FROM_HOME_TAB = "wfh";

export const WORK_FROM_HOME_TEXT = {
  title: "Work from home",
  tab: "Work from home",
  // Asking (any Staff member but an Admin)
  askOnClock: "Work from home",
  askForDates: "Ask for dates",
  askTitle: "Ask to work from home",
  askIntro:
    "An Admin approves or declines it. On approved dates you can clock in from any network.",
  sendRequest: "Send request",
  requestSent: "Request sent",
  // Setting directly (Admins)
  setDates: "Set dates",
  setTitle: (name: string) => `Work from home for ${name}`,
  setIntro: "Set by you, so no approval is needed. They are told.",
  saveDates: "Save dates",
  datesSaved: "Dates saved",
  // The form
  from: "From",
  to: "To",
  toHint: "Leave empty for no end date.",
  reason: "Reason",
  reasonPlaceholder: "For example, waiting for a plumber",
  required: "Required.",
  sayWhy: "Say why.",
  reasonTooLong: `Use at most ${String(WORK_FROM_HOME_REASON_MAX)} characters.`,
  chooseStart: "Choose the first day.",
  endBeforeStart: "The end date must be on or after the start date.",
  // The list
  dates: (from: string, to: string | null) => {
    if (to === null) return `${from} onwards, no end date`;
    return from === to ? from : `${from} to ${to}`;
  },
  asked: (at: string) => `Asked ${at}`,
  setBy: (name: string, at: string) => `Set by ${name}, ${at}`,
  answeredBy: (status: string, name: string) => `. ${status} by ${name}`,
  statuses: {
    waiting: "Waiting",
    approved: "Approved",
    declined: "Declined",
    cancelled: "Cancelled",
    ended: "Ended",
  } satisfies Record<WorkFromHomeStatus, string>,
  empty: "No work from home dates yet.",
  myFoot: "On approved dates you can clock in from any network.",
  personFoot: (firstName: string) =>
    `On these dates ${firstName} can clock in from any network. Those days show "Home" in Working hours. No address is kept.`,
  adminNeedsNone: "Admins can clock in from any network, so they never need Work from home dates.",
  loadFailed: "The work from home dates couldn't be loaded. Try again later.",
  changeFailed: "That didn't work. Try again.",
  // Answering, ending and cancelling
  approve: "Approve",
  decline: "Decline",
  approved: "Approved",
  declined: "Declined",
  endIt: "End it",
  endTitle: "End these work from home dates today?",
  endBody: "From tomorrow they can only clock in from the office network.",
  endsToday: "Ends today",
  ended: "Ended",
  cancel: "Cancel",
  cancelTitle: "Cancel this request?",
  cancelBody: "The Admins are no longer asked to approve these dates.",
  cancelRequest: "Cancel request",
  cancelled: "Request cancelled",
  // The Home clock and its refusal
  adminAnywhere: "Admins can clock in anywhere",
  workingFromHome: "Working from home today",
  askInstead: "Working from home? Ask an Admin for Work from home dates first.",
  askToWorkFromHome: "Ask to work from home",
  // Working hours
  homeTag: "Home",
  homeLabel: "worked from home",
  // Home: waiting on an Admin
  requestsWaiting: "Work from home requests",
} as const;
