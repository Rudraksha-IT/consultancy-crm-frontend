/** Where a Visa currently is (GLOSSARY: Visa Status); values match the API (issue 75). */
export const VisaStatus = {
  Applied: "applied",
  Granted: "granted",
  Refused: "refused",
} as const;

export type VisaStatus = (typeof VisaStatus)[keyof typeof VisaStatus];

/** Every Visa Status: a Visa exists once it is sent to the embassy, so it starts as Applied. */
export const VISA_STATUSES = Object.values(VisaStatus);

export const VISA_STATUS_LABELS: Record<VisaStatus, string> = {
  applied: "Applied",
  granted: "Granted",
  refused: "Refused",
};

/** What a visa letter can say (spec 116); values match the API's `result`. */
export const VISA_RESULTS = [VisaStatus.Granted, VisaStatus.Refused] as const;

export type VisaResult = (typeof VISA_RESULTS)[number];

/** A Visa's appointments (spec 62a); dates on the Visa, not Statuses. Values match the API. */
export const Appointment = {
  Biometrics: "biometrics",
  Medical: "medical",
  Interview: "interview",
} as const;

export type Appointment = (typeof Appointment)[keyof typeof Appointment];

/** The appointments in the order they usually happen. */
export const APPOINTMENTS = Object.values(Appointment);

export const APPOINTMENT_LABELS: Record<Appointment, string> = {
  biometrics: "Biometrics",
  medical: "Medical",
  interview: "Interview",
};

/** The words of a Student's Visas (prototype `#student-2`, Applications tab, Visa block). */
export const VISA_TEXT = {
  title: "Visa",
  none: "No visa yet. Choose an offer first, then prepare the papers and apply.",
  /** No visa yet, with a Chosen Offer (issue 76). */
  prepareFor: (university: string) =>
    `Prepare the visa papers for ${university}. When the visa is sent to the embassy, mark it as applied.`,
  apply: "Visa applied",
  /** What screen readers hear for the button, so each row's button is told apart. */
  applyFor: (university: string) => `Visa applied for ${university}`,
  applied: (university: string) => `Visa applied for ${university}`,
  appliedOn: (date: string) => `Applied ${date}`,
  statusOf: (university: string) => `Status of ${university} visa`,
  statusSaved: (university: string, status: string) => `${university} visa: ${status}`,
  /** An appointment on the card, e.g. "Biometrics: 4 Nov 2026 at 10:30 AM". */
  appointmentOn: (appointment: string, when: string) => `${appointment}: ${when}`,
  addDates: "Add dates",
  changeDates: "Change dates",
  addDatesFor: (university: string) => `Add dates for the ${university} visa`,
  changeDatesFor: (university: string) => `Change dates for the ${university} visa`,
  datesTitle: (name: string) => `Visa dates for ${name}`,
  dateOf: (appointment: string) => `${appointment} date`,
  timeOf: (appointment: string) => `${appointment} time`,
  datesNote: (counsellor: string | null) =>
    `Each date shows on the Visas list and on ${counsellor === null ? "the counsellor's" : `${counsellor}'s`} Home in the week before. Leave a date empty to remove it.`,
  saveDates: "Save dates",
  dayNeeded: (appointment: string) => `Pick a day for the ${appointment.toLowerCase()}.`,
  timeNeeded: (appointment: string) => `Pick a time for the ${appointment.toLowerCase()}.`,
  pastDay: "Pick today or a later day.",
  datesSaved: "Visa dates saved",
  /** Upload visa letter (spec 116; prototype visaLetter). */
  uploadLetter: "Upload visa letter",
  uploadLetterFor: (university: string) => `Upload visa letter for the ${university} visa`,
  letterTitle: "Upload the visa letter",
  letter: "The letter",
  letterHint: "Saved in Documents, linked to this visa.",
  whatItSays: "What does it say?",
  resultNeeded: "Choose Granted or Refused.",
  statusFollows: "The visa's status changes to match.",
  refusedGoesBack:
    "Refused takes the Student back to Offer, or to Counselling if no offers are left.",
  statusStays: (status: string) =>
    `The visa stays ${status}. To change it, set its status by hand.`,
  saveLetter: "Save",
  letterSaved: "Visa letter saved",
} as const;

/** A Visa appointment's day and time as written on screen, e.g. "4 Nov 2026 at 2:00 PM". */
export const appointmentWhen = (day: string, time: string) => `${day} at ${time}`;

/** How the office-wide Visas list is ordered; values match the API's `sort`. */
export const VisaSort = {
  /** Appointments from today on first, then no date yet, then past ones. */
  Upcoming: "upcoming",
  AppointmentSoonest: "appointment",
  AppointmentLatest: "-appointment",
} as const;

export type VisaSort = (typeof VisaSort)[keyof typeof VisaSort];

export const VISA_SORTS = Object.values(VisaSort);

export const DEFAULT_VISA_SORT: VisaSort = VisaSort.Upcoming;

export const VISA_SORT_LABELS: Record<VisaSort, string> = {
  upcoming: "Appointments coming up first",
  appointment: "Earliest appointment first",
  "-appointment": "Latest appointment first",
};

/** The appointment filter: any time, the next 7 or 30 days from today, or no date yet. */
export const AppointmentWhen = {
  Any: "",
  NextWeek: "next_7",
  NextMonth: "next_30",
  None: "none",
} as const;

export type AppointmentWhen = (typeof AppointmentWhen)[keyof typeof AppointmentWhen];

export const APPOINTMENT_WHENS = Object.values(AppointmentWhen);

/** How many days ahead each "next" choice looks; today counts as the first. */
export const APPOINTMENT_DAYS_AHEAD: Partial<Record<AppointmentWhen, number>> = {
  next_7: 7,
  next_30: 30,
};

export const APPOINTMENT_WHEN_LABELS: Record<AppointmentWhen, string> = {
  "": "Appointments: any time",
  next_7: "Appointment in the next 7 days",
  next_30: "Appointment in the next 30 days",
  none: "No appointment yet",
};

/** The words of the office-wide Visas page (prototype `#visas`, issues 48 and 75). */
export const VISA_LIST_TEXT = {
  filters: "Filter the list",
  title: "Visas",
  subtitle: "Every visa, waiting or decided. Appointments coming up are at the top.",
  status: "Visa status",
  anyStatus: "Any status",
  country: "Country",
  anyCountry: "Any country",
  intake: "Intake",
  anyIntake: "Any intake",
  counsellor: "Counsellor",
  anyCounsellor: "Any counsellor",
  myStudents: "My Students",
  appointment: "Appointment",
  nextAppointment: "Next appointment",
  sort: "Sort",
  student: "Student",
  goingTo: "Going to",
  documents: "Documents",
  noAppointment: "No appointment yet",
  notAssigned: "Not assigned",
  universityAndCourse: (university: string, course: string) => `${university}, ${course}`,
  count: (count: number) => `${String(count)} visa${count === 1 ? "" : "s"}`,
  loading: "Loading visas…",
  failed: "We couldn't load the visas. Refresh the page to try again.",
  noneMatch: "No visas match. Try clearing a filter.",
  none: "No visas yet. Mark one as applied from a Student's page once it is sent to the embassy.",
} as const;
