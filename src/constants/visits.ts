/** A Student's first visit, or a later one (GLOSSARY: Visit); values match the API. */
export const VisitKind = { New: "new", FollowUp: "follow_up" } as const;
export type VisitKind = (typeof VisitKind)[keyof typeof VisitKind];
export const VISIT_KINDS = [VisitKind.New, VisitKind.FollowUp] as const;

/** Why a returning Student came in; values match the API. */
export const VisitReason = {
  CounsellingSession: "counselling_session",
  BringingDocuments: "bringing_documents",
  MakingAPayment: "making_a_payment",
  AttendingAClass: "attending_a_class",
  AskingAboutProgress: "asking_about_progress",
  Other: "other",
} as const;
export type VisitReason = (typeof VisitReason)[keyof typeof VisitReason];
export const VISIT_REASONS = Object.values(VisitReason);

export const VISIT_REASON_LABELS: Record<VisitReason, string> = {
  counselling_session: "Counselling session",
  bringing_documents: "Bringing documents",
  making_a_payment: "Making a payment",
  attending_a_class: "Attending a class",
  asking_about_progress: "Asking about progress",
  other: "Other",
};

/** How many matches the returning-visitor search shows, and how many letters it waits for. */
export const RETURNING_MATCHES_SHOWN = 6;
export const RETURNING_SEARCH_MIN_LENGTH = 2;
export const VISIT_DETAILS_MAX_LENGTH = 200;

export const DeskMode = { New: "new", Returning: "returning" } as const;
export type DeskMode = (typeof DeskMode)[keyof typeof DeskMode];

const visitors = (count: number) => String(count);

export const VISIT_TEXT = {
  typeOfVisit: "Type of visit",
  newVisitor: "New visitor",
  returningVisitor: "Returning visitor",
  savedAsNew: (name: string) => `${name} is saved as a new visitor.`,
  openTheirPage: "Open their page",
  clearTheForm: "Clear the form",
  findTheVisitor: "Find the visitor",
  findPlaceholder: "Type their name or mobile number",
  startTyping: "Start typing to see matches.",
  noOneMatches: "No one matches. Check the spelling, or switch to New visitor.",
  searchFailed: "We couldn't search the Students. Please try again.",
  matches: "Matching Students",
  pick: (name: string) => `Choose ${name}`,
  chooseSomeoneElse: "Choose someone else",
  noCounsellorYet: "No counsellor yet",
  progressLabel: (name: string) => `How far along ${name} is`,
  lastVisit: (when: string, purpose: string) => `Last visit ${when}: ${purpose}`,
  visitorFailed: "We couldn't load this Student. Please try again.",
  whyHere: "Why are they here today?",
  details: "Details",
  detailsPlaceholder: "For example, brought passport copy",
  saveVisit: "Save visit",
  visitSaved: "Visit saved",
  saveVisitFailed: "We couldn't save the visit. Please try again.",
  todaysVisitors: "Today's visitors",
  todaysCount: visitors,
  todayFailed: "We couldn't load today's visitors. Please try again.",
  noVisitorsYet: "No visitors yet today.",
  newVisitorChip: "New visitor",
  followUpChip: "Follow-up",
  noteLine: "Note",
  firstVisit: (purpose: string) => `First visit: ${purpose}`,
  visitedTheOffice: (purpose: string) => `Visited the office: ${purpose}`,
} as const;
