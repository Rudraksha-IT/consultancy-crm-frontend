/** Where an Application currently is (GLOSSARY: Application Status); values match the API. */
export const ApplicationStatus = {
  Applied: "applied",
  Offer: "offer",
  Rejected: "rejected",
} as const;

export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

/** Every Application Status (issue 74). */
export const APPLICATION_STATUSES = Object.values(ApplicationStatus);

/** The Statuses Staff set by hand; Offer comes only from adding an offer letter. */
export const STATUSES_BY_HAND = [ApplicationStatus.Applied, ApplicationStatus.Rejected] as const;

export type StatusByHand = (typeof STATUSES_BY_HAND)[number];

/** The Document Type an Offer Letter is kept as, in lower case (the server's own name for it). */
export const OFFER_LETTER_TYPE_NAME = "offer letter";

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  offer: "Offer",
  rejected: "Rejected",
};

/** What a University's offer is (GLOSSARY: Offer Letter); "" when not known. */
export const OfferKind = {
  Conditional: "conditional",
  Unconditional: "unconditional",
} as const;

export type OfferKind = (typeof OfferKind)[keyof typeof OfferKind];

export const OFFER_KINDS = Object.values(OfferKind);

export const OFFER_KIND_LABELS: Record<OfferKind, string> = {
  conditional: "Conditional",
  unconditional: "Unconditional",
};

/** The Offer letters section and the Add offer letter dialog (prototype #student-1; issue 76). */
export const OFFER_TEXT = {
  title: "Offer letters",
  add: "Add offer letter",
  dialogTitle: (name: string) => `Add an offer letter for ${name}`,
  whichApplication: "Which application",
  applicationOption: (university: string, course: string) => `${university}, ${course}`,
  kind: "Kind of offer",
  letter: "The letter",
  letterHint: "Saved in Documents, linked to this application.",
  becomesOffer: "The application becomes Offer.",
  becomesOfferAndMoves: "The application becomes Offer, and the Student moves to Offer.",
  added: (kind: string, university: string) => `${kind} offer from ${university} added`,
  none: "No offers yet. When a university sends one, add the letter here.",
  /** The line under an offer, e.g. "Master of IT, Mar 2027. Conditional offer, 10 Oct 2026." */
  details: (course: string, intake: string, offer: string) => `${course}, ${intake}. ${offer}.`,
  kindOn: (kind: string, day: string) => `${kind} offer, ${day}`,
  kindOnly: (kind: string) => `${kind} offer`,
  plain: "Offer",
  chosen: "Chosen",
  goAhead: "Go ahead with this",
  /** What screen readers hear for the button, so each row's button is told apart. */
  goAheadWith: (university: string) => `Go ahead with ${university}`,
  goingAhead: (university: string) => `Going ahead with ${university}`,
  chooseOne: "Choose the one offer the Student will go ahead with. The others stay as they are.",
  followsChosen: "The visa and statements documents now follow the chosen offer's country.",
  locked: "The visa for the chosen offer is waiting for an answer, so the choice can't change now.",
  lockedShort: "A visa is waiting for the chosen offer",
} as const;

/** An Application's Status as shown: "Offer, conditional" when the kind of offer is known. */
export function applicationStatusText(status: ApplicationStatus, kind: OfferKind | ""): string {
  const label = APPLICATION_STATUS_LABELS[status];
  return status === ApplicationStatus.Offer && kind !== "" ? `${label}, ${kind}` : label;
}

/** The words of a Student's Applications (prototype `#student-1`, Applications tab). */
export const APPLICATION_TEXT = {
  title: "Applications",
  add: "Add application",
  dialogTitle: "Add Application",
  save: "Add Application",
  pickerNote: "Only active Catalogue entries can be picked. Starts as Applied.",
  university: "University",
  course: "Course",
  intake: "Intake",
  chooseUniversity: "Choose a university",
  chooseCourse: "Choose a course",
  chooseIntake: "Choose an intake",
  universityNeeded: "Choose a university.",
  courseNeeded: "Choose a course.",
  intakeNeeded: "Choose an intake.",
  universityOption: (name: string, country: string) => `${name} (${country})`,
  courseOption: (name: string, level: string) => `${name} (${level})`,
  loadingCatalogue: "Loading the Catalogue…",
  catalogueFailed: "We couldn't load the Catalogue. Close this and try again.",
  catalogueEmpty: "The Catalogue has no courses yet. An Admin adds them on the Catalogue page.",
  none: "No applications yet.",
  added: "Application added",
  starting: (course: string, intake: string) => `${course}, starting ${intake}`,
  statusOf: (university: string) => `Status of ${university} application`,
  statusSaved: (university: string, status: string) => `${university} application: ${status}`,
  stageMoved: (stage: string) => `Stage is now ${stage}`,
  stayedLost: "The Student is Lost, so their Stage was not changed.",
} as const;

/** How the office-wide Applications list is ordered; values match the API's `sort`. */
export const ApplicationSort = {
  AppliedNewest: "-applied_on",
  AppliedOldest: "applied_on",
  AddedNewest: "-added_on",
  AddedOldest: "added_on",
  IntakeSoonest: "intake",
  IntakeLatest: "-intake",
} as const;

export type ApplicationSort = (typeof ApplicationSort)[keyof typeof ApplicationSort];

export const APPLICATION_SORTS = Object.values(ApplicationSort);

/** The order the list starts in: newest applied first, those without a day after (prototype). */
export const DEFAULT_APPLICATION_SORT: ApplicationSort = ApplicationSort.AppliedNewest;

export const APPLICATION_SORT_LABELS: Record<ApplicationSort, string> = {
  "-applied_on": "Newest applied first",
  applied_on: "Oldest applied first",
  "-added_on": "Newest added first",
  added_on: "Oldest added first",
  intake: "Soonest intake first",
  "-intake": "Latest intake first",
};

/** The words of the office-wide Applications page (prototype `#applications`, issue 47). */
export const APPLICATION_LIST_TEXT = {
  filters: "Filter the list",
  title: "Applications",
  subtitle: "Every application in the office. Open one to work on it from the Student's page.",
  search: "Search applications",
  searchPlaceholder: "Search by Student or university",
  status: "Status",
  anyStatus: "Any status",
  intake: "Intake",
  anyIntake: "Any intake",
  year: "Intake year",
  anyYear: "Any year",
  country: "Country",
  anyCountry: "Any country",
  counsellor: "Counsellor",
  anyCounsellor: "Any counsellor",
  myStudents: "My Students",
  sort: "Sort",
  student: "Student",
  universityAndCourse: "University and course",
  applied: "Applied date",
  added: "Added",
  notAssigned: "Not assigned",
  notApplied: "Not recorded",
  courseIn: (course: string, country: string) => `${course}, ${country}`,
  rowName: (student: string, university: string) => `${student}, ${university}`,
  count: (count: number) => `${String(count)} application${count === 1 ? "" : "s"}`,
  appliedNote: "Applied date is the day the application was added, recorded automatically.",
  loading: "Loading applications…",
  failed: "We couldn't load the applications. Refresh the page to try again.",
  noneMatch: "No applications match. Try clearing a filter.",
  none: "No applications yet. Add one from a Student's page, on their Applications tab.",
} as const;
