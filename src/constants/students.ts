/** How a Student first came to the Consultancy (GLOSSARY: Source); values match the API. */
export const Source = {
  WalkIn: "walk_in",
  PhoneCall: "phone_call",
  Facebook: "facebook",
  Website: "website",
  Referral: "referral",
  SubAgent: "sub_agent",
  EventFair: "event_fair",
  Other: "other",
} as const;

export type Source = (typeof Source)[keyof typeof Source];

export const SOURCES = Object.values(Source);

export const SOURCE_LABELS: Record<Source, string> = {
  walk_in: "Walk-in",
  phone_call: "Phone call",
  facebook: "Facebook",
  website: "Website",
  referral: "Referral",
  sub_agent: "Sub-agent",
  event_fair: "Event/Fair",
  other: "Other",
};

/** The country a visitor wants to study in; values match the API. */
export const Country = {
  Australia: "australia",
  Uk: "uk",
  Canada: "canada",
  Usa: "usa",
  NewZealand: "new_zealand",
  Japan: "japan",
  Other: "other",
} as const;

export type Country = (typeof Country)[keyof typeof Country];

export const COUNTRIES = Object.values(Country);

export const COUNTRY_LABELS: Record<Country, string> = {
  australia: "Australia",
  uk: "UK",
  canada: "Canada",
  usa: "USA",
  new_zealand: "New Zealand",
  japan: "Japan",
  other: "Other",
};

/** The highest qualification a visitor has finished; values match the API. */
export const Qualification = {
  See: "see",
  PlusTwo: "plus_two",
  Diploma: "diploma",
  Bachelor: "bachelor",
  Master: "master",
} as const;

export type Qualification = (typeof Qualification)[keyof typeof Qualification];

export const QUALIFICATIONS = Object.values(Qualification);

export const QUALIFICATION_LABELS: Record<Qualification, string> = {
  see: "SEE",
  plus_two: "+2",
  diploma: "Diploma",
  bachelor: "Bachelor",
  master: "Master",
};

/** The Student list's counsellor filter: anyone, me, nobody yet, or a Staff id. */
export const CounsellorFilter = { Any: "", Me: "me", None: "none" } as const;

export const STUDENTS_PER_PAGE = 25;

/** An English test a Student has taken; values match the API. */
export const EnglishTest = {
  Ielts: "ielts",
  Pte: "pte",
  Toefl: "toefl",
  Duolingo: "duolingo",
} as const;

export type EnglishTest = (typeof EnglishTest)[keyof typeof EnglishTest];

export const ENGLISH_TESTS = Object.values(EnglishTest);

export const ENGLISH_TEST_LABELS: Record<EnglishTest, string> = {
  ielts: "IELTS",
  pte: "PTE",
  toefl: "TOEFL",
  duolingo: "Duolingo",
};

/** What a History entry records; values match the API. Later issues add more. */
export const HistoryKind = {
  NoteEdited: "note_edited",
  StageChanged: "stage_changed",
  CounsellorAssigned: "counsellor_assigned",
  Transferred: "transferred",
  PaymentRecorded: "payment_recorded",
  PaymentEdited: "payment_edited",
  PaymentDeleted: "payment_deleted",
  FeeAdded: "fee_added",
  FeeEdited: "fee_edited",
  FeeDeleted: "fee_deleted",
  OfferLetterAdded: "offer_letter_added",
  ChosenOfferChanged: "chosen_offer_changed",
  /** The Bin (issue 79): after names what, detail is why it was put there. */
  DocumentBinned: "document_binned",
  DocumentTakenOut: "document_taken_out",
  DocumentRestored: "document_restored",
  DocumentDeletedFromBin: "document_deleted_from_bin",
  DocumentDeleted: "document_deleted",
  /** Who did each action Staff Progress counts (issue 83). Before and after are Statuses. */
  ApplicationStatusChanged: "application_status_changed",
  VisaStatusChanged: "visa_status_changed",
  /** After is the Task's title. */
  TaskDone: "task_done",
  /** After is the Document Type; detail is why it was rejected. */
  DocumentVerified: "document_verified",
  DocumentRejected: "document_rejected",
  /** Before and after are moments (empty for none); detail is the appointment. */
  VisaDateChanged: "visa_date_changed",
} as const;

export type HistoryKind = (typeof HistoryKind)[keyof typeof HistoryKind];

export const HISTORY_KINDS = Object.values(HistoryKind);

export const HISTORY_KIND_LABELS: Record<HistoryKind, string> = {
  note_edited: "Note edited",
  stage_changed: "Stage changed",
  counsellor_assigned: "Counsellor assigned",
  transferred: "Transferred",
  payment_recorded: "Payment recorded",
  payment_edited: "Payment changed",
  payment_deleted: "Payment deleted",
  fee_added: "Fee added",
  fee_edited: "Fee changed",
  fee_deleted: "Fee deleted",
  offer_letter_added: "Offer letter added",
  chosen_offer_changed: "Chosen offer changed",
  document_binned: "Put in the Bin",
  document_taken_out: "Taken out of the Bin",
  document_restored: "Restored from the Bin",
  document_deleted_from_bin: "Deleted for good from the Bin",
  document_deleted: "Deleted",
  application_status_changed: "Application status changed",
  visa_status_changed: "Visa status changed",
  task_done: "Task done",
  document_verified: "Checked and correct",
  document_rejected: "Rejected",
  visa_date_changed: "Visa date changed",
};

/** How many History entries the API sends per page. */
export const HISTORY_PER_PAGE = 50;

/** A Student's gender (spec 35a); values match the API, "" is not given. */
export const Gender = {
  Female: "female",
  Male: "male",
  Other: "other",
  PreferNotToSay: "prefer_not_to_say",
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

export const GENDERS = Object.values(Gender);

export const GENDER_LABELS: Record<Gender, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

/** A Student's marital status (spec 35a); values match the API, "" is not given. */
export const MaritalStatus = {
  Single: "single",
  Married: "married",
  Divorced: "divorced",
  Widowed: "widowed",
} as const;

export type MaritalStatus = (typeof MaritalStatus)[keyof typeof MaritalStatus];

export const MARITAL_STATUSES = Object.values(MaritalStatus);

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  single: "Single",
  married: "Married",
  divorced: "Divorced",
  widowed: "Widowed",
};

/** The level of study a Student aims for (spec 35e); values match the API, "" is not decided. */
export const TargetLevel = {
  Diploma: "diploma",
  Bachelor: "bachelor",
  Master: "master",
  Phd: "phd",
} as const;

export type TargetLevel = (typeof TargetLevel)[keyof typeof TargetLevel];

export const TARGET_LEVELS = Object.values(TargetLevel);

export const TARGET_LEVEL_LABELS: Record<TargetLevel, string> = {
  diploma: "Diploma",
  bachelor: "Bachelor",
  master: "Master",
  phd: "PhD",
};

/** Nepal's seven provinces (spec 35d); values match the API. */
export const Province = {
  Koshi: "koshi",
  Madhesh: "madhesh",
  Bagmati: "bagmati",
  Gandaki: "gandaki",
  Lumbini: "lumbini",
  Karnali: "karnali",
  Sudurpashchim: "sudurpashchim",
} as const;

export type Province = (typeof Province)[keyof typeof Province];

export const PROVINCES = Object.values(Province);

export const PROVINCE_LABELS: Record<Province, string> = {
  koshi: "Koshi",
  madhesh: "Madhesh",
  bagmati: "Bagmati",
  gandaki: "Gandaki",
  lumbini: "Lumbini",
  karnali: "Karnali",
  sudurpashchim: "Sudurpashchim",
};

/** Why a passport needs attention, computed by the API from its expiry date (spec 35c). */
export const PassportWarning = { Expired: "expired", ExpiresSoon: "expires_soon" } as const;

export type PassportWarning = (typeof PassportWarning)[keyof typeof PassportWarning];

export const PASSPORT_WARNINGS = Object.values(PassportWarning);

/** The most jobs a Student can have on their profile (spec 35e). */
export const MAX_JOBS = 20;
