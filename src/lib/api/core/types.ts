import { z } from "zod";

import { APPLICATION_STATUSES, OFFER_KINDS } from "@/constants/applications";
import { VISA_STATUSES } from "@/constants/visas";
import { COURSE_LEVELS } from "@/constants/catalogue";
import {
  CONSULTANCY_STATUSES,
  ConsultancyStatus,
  SETUP_STATES,
} from "@/constants/consultancyStatus";
import { DATE_DISPLAYS } from "@/constants/dates";
import { MODULES } from "@/constants/modules";
import { PRIORITIES } from "@/constants/priority";
import { COLOUR_MODE_CHOICES } from "@/constants/mySettings";
import { OFFICE_DETAILS_LIMITS } from "@/constants/officeDetails";
import { ROLES } from "@/constants/roles";
import { Stage } from "@/constants/stages";
import {
  COUNTRIES,
  ENGLISH_TESTS,
  GENDERS,
  HISTORY_KINDS,
  MARITAL_STATUSES,
  PASSPORT_WARNINGS,
  PROVINCES,
  QUALIFICATIONS,
  SOURCES,
  TARGET_LEVELS,
} from "@/constants/students";
import { PASSWORD_RULE_IDS, type PasswordRuleId } from "@/lib/password";
import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { CourseFileSchema } from "../catalogue/courseFileTypes";
import { LinkedDocumentSchema, NamedFileSchema } from "../documents/documentsTypes";
import { TransferRequestSchema } from "../students/transferRequestTypes";

/** Where the office logo is served from: only ever our own logo address (issue 39). */
const LOGO_URL = /^\/api\/consultancy\/logo\/[0-9]{1,10}\/$/;

/** The office logo, in frontend naming. */
export const LogoSchema = z
  .object({ url: z.string().regex(LOGO_URL), show_name: z.boolean() })
  .transform(({ url, show_name }) => ({ url, showName: show_name }));

export type OfficeLogo = z.infer<typeof LogoSchema>;

/** The logo, or null for the initials; an answer that isn't our logo also shows the initials. */
const OptionalLogoSchema = LogoSchema.nullable().catch(null);

/** The office's details as stored (spec stories 11-16), in frontend naming. */
export const OfficeDetailsSchema = z
  .object({
    contact_email: z.string().max(OFFICE_DETAILS_LIMITS.contactEmail),
    phone: z.string().max(OFFICE_DETAILS_LIMITS.phone),
    address_line1: z.string().max(OFFICE_DETAILS_LIMITS.addressLine),
    address_line2: z.string().max(OFFICE_DETAILS_LIMITS.addressLine),
    website: z.string().max(OFFICE_DETAILS_LIMITS.website),
  })
  .transform(({ contact_email, address_line1, address_line2, ...rest }) => ({
    contactEmail: contact_email,
    addressLine1: address_line1,
    addressLine2: address_line2,
    ...rest,
  }));

export type OfficeDetails = z.infer<typeof OfficeDetailsSchema>;

export const NO_OFFICE_DETAILS: OfficeDetails = {
  contactEmail: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  website: "",
};

/** The longest Status message shown; a longer one is not ours and is dropped. */
const STATUS_MESSAGE_MAX_LENGTH = 300;

/**
 * The Consultancy Status as Staff are shown it (issue 42). The server enforces it; here it only
 * decides a banner, so an unknown value shows none rather than breaking the screen.
 */
const ShownStatusSchema = z.enum(CONSULTANCY_STATUSES).catch(ConsultancyStatus.Active);
const StatusMessageSchema = z.string().min(1).max(STATUS_MESSAGE_MAX_LENGTH).nullable().catch(null);
export const MomentSchema = z.iso.datetime({ offset: true });
/** A host name, maybe with a port, that the browser may be sent to; nothing else is accepted. */
export const HostSchema = z
  .string()
  .regex(/^[a-z0-9.-]+(?::[0-9]{1,5})?$/)
  .max(255);

export const ConsultancySchema = z
  .object({
    name: z.string().min(1),
    logo: OptionalLogoSchema,
    status: ShownStatusSchema,
    status_message: StatusMessageSchema,
  })
  .transform(({ status_message, ...rest }) => ({ ...rest, statusMessage: status_message }));

export type Consultancy = z.infer<typeof ConsultancySchema>;

/** The "current Staff and Consultancy context" from `/api/context/`, in frontend naming. */
export const StaffContextSchema = z
  .object({
    staff: z.object({
      id: RecordIdSchema,
      name: z.string(),
      email: z.string(),
      role: z.enum(ROLES),
      colour_mode: z.enum(COLOUR_MODE_CHOICES),
    }),
    consultancy: z
      .object({
        name: z.string().min(1),
        logo: OptionalLogoSchema,
        status: ShownStatusSchema,
        status_message: StatusMessageSchema,
        evaluation_ends_at: MomentSchema.nullable().catch(null),
        // Damaged or missing details show as none, so "add the contact email first" shows.
        office_details: OfficeDetailsSchema.catch(NO_OFFICE_DETAILS),
        has_contact_email: z.boolean().catch(false),
      })
      .transform(
        ({ status_message, evaluation_ends_at, office_details, has_contact_email, ...rest }) => ({
          ...rest,
          statusMessage: status_message,
          evaluationEndsAt: evaluation_ends_at,
          officeDetails: office_details,
          hasContactEmail: has_contact_email && office_details.contactEmail !== "",
        }),
      ),
    modules: z.array(z.enum(MODULES)),
    date_display: z.enum(DATE_DISPLAYS),
    // Swipe between pages (asked 2026-11-16): off unless the server clearly says it is on.
    page_swipe: z.boolean().catch(false),
    // Set while a Platform Admin is inside the office as themselves (issue 27); null for Staff.
    support_access: z
      .object({ platform_admin_name: z.string().min(1), platform_host: HostSchema })
      .nullable(),
  })
  .transform(
    ({ date_display, page_swipe, support_access, staff: { colour_mode, ...staff }, ...rest }) => ({
      ...rest,
      staff,
      supportAccess:
        support_access === null
          ? null
          : {
              platformAdminName: support_access.platform_admin_name,
              platformHost: support_access.platform_host,
            },
      dateDisplay: date_display,
      pageSwipe: page_swipe,
      // The person's own light/dark choice (issue 38), saved for them on every device.
      colourMode: colour_mode,
    }),
  );

/**
 * The session context. `pageSwipe` is always set from the server; a context built elsewhere may
 * leave it out, which means off.
 */
export type StaffContext = Omit<z.infer<typeof StaffContextSchema>, "pageSwipe"> & {
  pageSwipe?: boolean;
};

/** The login answer as the browser gets it: the context only (the tokens stay on the server). */
export const LoginAnswerSchema = z.object({ context: StaffContextSchema });

/** An answer with nothing to use but a message (shown nowhere: the screen has its own words). */
export const DetailAnswerSchema = z.object({ detail: z.string() });

/** The rules a refused password breaks; names this screen doesn't know are dropped. */
export const UnmetRulesAnswerSchema = z.object({
  unmet_rules: z.array(z.string()).transform((names) => names.filter(isPasswordRuleId)),
});

export type ResetCode = { email: string; code: string };
export type PasswordReset = ResetCode & { password: string };

export type Credentials = {
  email: string;
  password: string;
};

/** A member of the team running the product, from the Platform endpoints. */
export const PlatformAdminSchema = z.object({
  id: RecordIdSchema,
  name: z.string(),
  email: z.string(),
});

export type PlatformAdmin = z.infer<typeof PlatformAdminSchema>;

export const PlatformAdminAnswerSchema = z
  .object({ platform_admin: PlatformAdminSchema })
  .transform(({ platform_admin }) => platform_admin);

/** One Consultancy as the Platform lists it, in frontend naming. */
export const ConsultancyOverviewSchema = z
  .object({
    id: RecordIdSchema,
    name: z.string(),
    subdomain: z.string(),
    host: z.string(),
    status: z.enum(CONSULTANCY_STATUSES),
    status_reason: z.string(),
    evaluation_ends_at: MomentSchema.nullable(),
    paid_until: z.iso.date().nullable(),
    modules: z.array(z.enum(MODULES)),
    setup_state: z.enum(SETUP_STATES),
  })
  .transform(({ status_reason, evaluation_ends_at, paid_until, setup_state, ...rest }) => ({
    ...rest,
    statusReason: status_reason,
    evaluationEndsAt: evaluation_ends_at,
    paidUntil: paid_until,
    setupState: setup_state,
  }));

export type ConsultancyOverview = z.infer<typeof ConsultancyOverviewSchema>;

/**
 * What a Platform Admin enters to start a new Consultancy. `subdomain` is only the front part of
 * its address; the backend adds its PRODUCT_DOMAIN. No Admin: Admins are added once it is set up
 * (issue 64).
 */
export type NewConsultancy = {
  name: string;
  subdomain: string;
  /** Where replies to the office's emails go (spec 119); required. */
  contactEmail: string;
  /** Evaluation (14 days), or Active paid up to `paidUntil` ("YYYY-MM-DD"). */
  status: typeof ConsultancyStatus.Evaluation | typeof ConsultancyStatus.Active;
  paidUntil: string;
};

export type NewConsultancyField = keyof NewConsultancy;

/** The API's field names for each `NewConsultancy` field. */
export const NEW_CONSULTANCY_API_FIELDS = {
  name: "name",
  subdomain: "subdomain",
  contactEmail: "contact_email",
  status: "status",
  paidUntil: "paid_until",
} as const satisfies Record<NewConsultancyField, string>;

/** Field errors as DRF returns them for a refused form: field name to messages. */
export const FieldErrorsSchema = z.record(z.string(), z.array(z.string()));

function isPasswordRuleId(name: string): name is PasswordRuleId {
  return PASSWORD_RULE_IDS.some((id) => id === name);
}

/** Where a Staff member's account is; values match the API. */
export const StaffStatus = {
  Invited: "invited",
  Active: "active",
  Deactivated: "deactivated",
} as const;

export type StaffStatus = (typeof StaffStatus)[keyof typeof StaffStatus];

/** One employee as the Employees page shows them, in frontend naming. */
export const EmployeeSchema = z
  .object({
    id: RecordIdSchema,
    name: z.string(),
    email: z.string(),
    mobile: z.string(),
    job_title: z.string(),
    role: z.enum(ROLES),
    joined_on: z.iso.date(),
    status: z.enum(StaffStatus),
    // Two-step login (issue 62): on or off, and whether their app is set up; never the secret.
    two_factor_required: z.boolean(),
    two_factor_set_up: z.boolean(),
  })
  .transform(({ job_title, joined_on, two_factor_required, two_factor_set_up, ...rest }) => ({
    ...rest,
    jobTitle: job_title,
    joinedOn: joined_on,
    twoFactorRequired: two_factor_required,
    twoFactorSetUp: two_factor_set_up,
  }));

export type Employee = z.infer<typeof EmployeeSchema>;

/** What an Admin enters to add an employee; they choose their own password later. */
export type NewEmployee = {
  name: string;
  mobile: string;
  email: string;
  jobTitle: string;
  role: string;
  joinedOn: string;
};

export type NewEmployeeField = keyof NewEmployee;

/** The API's field names for each `NewEmployee` field. */
export const NEW_EMPLOYEE_API_FIELDS = {
  name: "name",
  mobile: "mobile",
  email: "email",
  jobTitle: "job_title",
  role: "role",
  joinedOn: "joined_on",
} as const satisfies Record<NewEmployeeField, string>;

/** Someone who can be picked as an Assigned Counsellor: a Counsellor or an Admin. */
export const CounsellorChoiceSchema = z.object({
  id: RecordIdSchema,
  name: z.string(),
  role: z.enum(ROLES),
});

export type CounsellorChoice = z.infer<typeof CounsellorChoiceSchema>;

const AssignedCounsellorSchema = z.object({ id: RecordIdSchema, name: z.string() }).nullable();

const StudentRowFields = {
  id: RecordIdSchema,
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  country: z.enum(COUNTRIES),
  source: z.enum(SOURCES),
  stage: z.enum(Stage),
  /** How urgently their case needs attention (tickets 10, 11). */
  priority: z.enum(PRIORITIES),
  assigned_counsellor: AssignedCounsellorSchema,
};

/** One Student as the Student list shows them, in frontend naming. */
export const StudentRowSchema = z
  .object(StudentRowFields)
  .transform(({ assigned_counsellor, ...rest }) => ({
    ...rest,
    assignedCounsellor: assigned_counsellor,
  }));

export type StudentRow = z.infer<typeof StudentRowSchema>;

/** One page of the Student list. */
export const StudentPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(StudentRowSchema),
  })
  .transform(({ count, page, page_size, results }) => ({
    count,
    page,
    pageSize: page_size,
    students: results,
  }));

export type StudentPage = z.infer<typeof StudentPageSchema>;

/** One Student on the Students board: a list row with their next step and document counts. */
export const BoardStudentSchema = z
  .object({
    ...StudentRowFields,
    next_step: z.string(),
    documents: z.object({
      done: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    }),
  })
  .transform(({ assigned_counsellor, next_step, ...rest }) => ({
    ...rest,
    assignedCounsellor: assigned_counsellor,
    nextStep: next_step,
  }));

export type BoardStudent = z.infer<typeof BoardStudentSchema>;

/** One page of a column of the Students board. */
export const BoardStudentPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(BoardStudentSchema),
  })
  .transform(({ count, page, page_size, results }) => ({
    count,
    page,
    pageSize: page_size,
    students: results,
  }));

export type BoardStudentPage = z.infer<typeof BoardStudentPageSchema>;

const StudentFields = {
  ...StudentRowFields,
  highest_qualification: z.enum(QUALIFICATIONS),
  past_degree: z.string(),
  previous_job: z.string(),
  sub_agent_name: z.string(),
  note: z.string(),
  created_at: z.iso.datetime({ offset: true }),
};

type StudentFromApi = z.infer<z.ZodObject<typeof StudentFields>>;

function toStudent(student: StudentFromApi) {
  return {
    id: student.id,
    name: student.name,
    phone: student.phone,
    email: student.email,
    country: student.country,
    source: student.source,
    stage: student.stage,
    priority: student.priority,
    assignedCounsellor: student.assigned_counsellor,
    highestQualification: student.highest_qualification,
    pastDegree: student.past_degree,
    previousJob: student.previous_job,
    subAgentName: student.sub_agent_name,
    note: student.note,
    createdAt: student.created_at,
  };
}

/** A Student with every detail the new-visitor form gave. */
export const StudentSchema = z.object(StudentFields).transform(toStudent);

export type Student = z.infer<typeof StudentSchema>;

/** What the new-visitor form sends, as typed (select values are strings; "" is none). */
export type NewStudent = {
  name: string;
  phone: string;
  email: string;
  country: string;
  source: string;
  subAgentName: string;
  highestQualification: string;
  pastDegree: string;
  previousJob: string;
  note: string;
  /** A Staff id, or "" for "Decide later". */
  assignedCounsellor: string;
};

export type NewStudentField = keyof NewStudent;

/** The API's field names for each `NewStudent` field. */
export const NEW_STUDENT_API_FIELDS = {
  name: "name",
  phone: "phone",
  email: "email",
  country: "country",
  source: "source",
  subAgentName: "sub_agent_name",
  highestQualification: "highest_qualification",
  pastDegree: "past_degree",
  previousJob: "previous_job",
  note: "note",
  assignedCounsellor: "assigned_counsellor",
} as const satisfies Record<NewStudentField, string>;

/** One qualification in a Student's academic history, in frontend naming. */
export const AcademicRecordSchema = z
  .object({
    id: RecordIdSchema,
    level: z.enum(QUALIFICATIONS),
    institution: z.string(),
    finished_year: z.number().int().nullable(),
    result: z.string(),
  })
  .transform(({ finished_year, ...rest }) => ({ ...rest, finishedYear: finished_year }));

export type AcademicRecord = z.infer<typeof AcademicRecordSchema>;

/** One English test result, in frontend naming. The overall score is text, e.g. "6.5". */
export const TestScoreSchema = z
  .object({
    id: RecordIdSchema,
    test: z.enum(ENGLISH_TESTS),
    overall: z.string().regex(/^\d{1,3}\.\d$/),
    taken_on: z.iso.date().nullable(),
    details: z.string(),
  })
  .transform(({ taken_on, ...rest }) => ({ ...rest, takenOn: taken_on }));

export type TestScore = z.infer<typeof TestScoreSchema>;

/** An address in Nepal's format (spec 35d); "" or null for a part not given. */
export const AddressSchema = z.object({
  province: z.enum(PROVINCES).or(z.literal("")),
  district: z.string(),
  municipality: z.string(),
  ward: z.number().int().min(1).max(35).nullable(),
  street: z.string(),
});

export type Address = z.infer<typeof AddressSchema>;

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** One job a Student has had (spec 35e), months as "YYYY-MM"; no end month means still there. */
export const WorkExperienceSchema = z
  .object({
    id: RecordIdSchema,
    employer: z.string(),
    job_title: z.string(),
    started_on: z.string().regex(MONTH),
    ended_on: z.string().regex(MONTH).nullable(),
  })
  .transform(({ job_title, started_on, ended_on, ...rest }) => ({
    ...rest,
    jobTitle: job_title,
    startedOn: started_on,
    endedOn: ended_on,
  }));

export type WorkExperience = z.infer<typeof WorkExperienceSchema>;

const PERCENT_MAX = 100;

/**
 * One Application of a Student: where to, which Intake ("YYYY-MM", AD), its Status and any offer:
 * the day its Offer Letter was added (AD; null for older offers) and the letter (issue 76).
 */
export const ApplicationSchema = z
  .object({
    id: RecordIdSchema,
    university: z.object({ id: RecordIdSchema, name: z.string() }),
    course: z.object({ id: RecordIdSchema, name: z.string(), level: z.enum(COURSE_LEVELS) }),
    intake: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    status: z.enum(APPLICATION_STATUSES),
    offer_kind: z.enum(OFFER_KINDS).or(z.literal("")),
    offered_on: z.iso.date().nullable(),
    offer_letter: z
      .object({ id: RecordIdSchema, files: z.array(NamedFileSchema).nonempty() })
      .nullable(),
    documents: z.array(LinkedDocumentSchema),
    /** The Course's PDF brochures in use (ticket 10). */
    course_files: z.array(CourseFileSchema),
  })
  .transform(({ offered_on, offer_letter, course_files, ...rest }) => ({
    ...rest,
    offeredOn: offered_on,
    offerLetter: offer_letter,
    courseFiles: course_files,
  }));

export type Application = z.infer<typeof ApplicationSchema>;

/** A Visa appointment on the office's own clock, "YYYY-MM-DDTHH:MM" (spec 62a). */
export const APPOINTMENT_AT = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d$/);

/** One Visa: its Application, Status, the day it was applied for (AD) and its appointments. */
export const VisaSchema = z
  .object({
    id: RecordIdSchema,
    application_id: RecordIdSchema,
    university: z.object({ id: RecordIdSchema, name: z.string() }),
    course: z.object({ id: RecordIdSchema, name: z.string(), level: z.enum(COURSE_LEVELS) }),
    status: z.enum(VISA_STATUSES),
    started_on: z.iso.date(),
    biometrics_at: APPOINTMENT_AT.nullable(),
    medical_at: APPOINTMENT_AT.nullable(),
    interview_at: APPOINTMENT_AT.nullable(),
    documents: z.array(LinkedDocumentSchema),
  })
  .transform(
    ({ application_id, started_on, biometrics_at, medical_at, interview_at, ...rest }) => ({
      ...rest,
      applicationId: application_id,
      startedOn: started_on,
      biometricsAt: biometrics_at,
      medicalAt: medical_at,
      interviewAt: interview_at,
    }),
  );

export type Visa = z.infer<typeof VisaSchema>;

/** What the Add Application dialog sends: a Catalogue Course and one of its Intakes. */
export type NewApplication = { courseId: RecordId; intake: string };

/** The Add Application fields, by their API names. */
export const APPLICATION_API_FIELDS = { course: "course", intake: "intake" } as const;

/** One Student as their profile shows them, and whether the viewer may change them. */
/** How many required Document Types have a Document that isn't Rejected, of how many. */
export const DocumentProgressSchema = z.object({
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export type DocumentProgress = z.infer<typeof DocumentProgressSchema>;

/** One change in a Student's History, in frontend naming. */
export const HistoryEntrySchema = z
  .object({
    id: RecordIdSchema,
    kind: z.enum(HISTORY_KINDS),
    at: z.iso.datetime({ offset: true }),
    by: z.object({ name: z.string(), is_platform_admin: z.boolean() }),
    before: z.string(),
    after: z.string(),
    detail: z.string(),
  })
  .transform(({ by, ...rest }) => ({
    ...rest,
    by: { name: by.name, isPlatformAdmin: by.is_platform_admin },
  }));

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const StudentProfileSchema = z
  .object({
    ...StudentFields,
    other_countries: z.array(z.enum(COUNTRIES)),
    date_of_birth: z.iso.date().nullable(),
    gender: z.enum(GENDERS).or(z.literal("")),
    marital_status: z.enum(MARITAL_STATUSES).or(z.literal("")),
    nationality: z.string(),
    father_name: z.string(),
    mother_name: z.string(),
    guardian_name: z.string(),
    guardian_relation: z.string(),
    guardian_phone: z.string(),
    passport_number: z.string(),
    passport_place_of_issue: z.string(),
    passport_issue_date: z.iso.date().nullable(),
    passport_expiry_date: z.iso.date().nullable(),
    passport_warning: z.enum(PASSPORT_WARNINGS).nullable(),
    permanent_address: AddressSchema,
    mailing_address: AddressSchema,
    mailing_same_as_permanent: z.boolean(),
    target_level: z.enum(TARGET_LEVELS).or(z.literal("")),
    work_experience: z.array(WorkExperienceSchema),
    preferred_course: z.string(),
    preferred_intake: z.string(),
    academic_records: z.array(AcademicRecordSchema),
    test_scores: z.array(TestScoreSchema),
    lost_reason: z.string(),
    /** Every Stage change, oldest first, for the Activity timeline and the Lost ⓘ (issue 82). */
    stage_changes: z.array(HistoryEntrySchema),
    /** How far along they are and their next step, by the same rule as Home (spec 113). */
    progress: z.object({
      percent: z.number().int().min(0).max(PERCENT_MAX),
      next_step: z.string(),
      is_done: z.boolean(),
    }),
    applications: z.array(ApplicationSchema),
    /** The Application the Student goes ahead with (GLOSSARY: Chosen Offer), if any. */
    chosen_offer_id: RecordIdSchema.nullable(),
    visas: z.array(VisaSchema),
    documents: DocumentProgressSchema,
    /** Moves on with every change to what the Edit details page shows (issue 81). */
    details_version: z.number().int().positive(),
    can_change: z.boolean(),
    /** Anyone who can open the Student may set their Priority (ticket 10). */
    can_set_priority: z.boolean(),
    /** Whether the viewer may open Edit details: their counsellor or an Admin. */
    can_edit_details: z.boolean(),
    can_set_stage: z.boolean(),
    can_assign: z.boolean(),
    can_transfer: z.boolean(),
    can_change_applications: z.boolean(),
    can_change_documents: z.boolean(),
    can_record_payment: z.boolean(),
    can_change_fees: z.boolean(),
    open_tasks: z.number().int().nonnegative(),
    /** Whether the viewer may ask to take this Student (issue 57). */
    can_ask_transfer: z.boolean(),
    /** The Transfer Request waiting for this Student, if any. */
    transfer_request: TransferRequestSchema.nullable(),
  })
  .transform((profile) => ({
    ...toStudent(profile),
    otherCountries: profile.other_countries,
    dateOfBirth: profile.date_of_birth,
    gender: profile.gender,
    maritalStatus: profile.marital_status,
    nationality: profile.nationality,
    fatherName: profile.father_name,
    motherName: profile.mother_name,
    guardianName: profile.guardian_name,
    guardianRelation: profile.guardian_relation,
    guardianPhone: profile.guardian_phone,
    passportNumber: profile.passport_number,
    passportPlaceOfIssue: profile.passport_place_of_issue,
    passportIssueDate: profile.passport_issue_date,
    passportExpiryDate: profile.passport_expiry_date,
    passportWarning: profile.passport_warning,
    permanentAddress: profile.permanent_address,
    mailingAddress: profile.mailing_address,
    mailingSameAsPermanent: profile.mailing_same_as_permanent,
    targetLevel: profile.target_level,
    workExperience: profile.work_experience,
    preferredCourse: profile.preferred_course,
    preferredIntake: profile.preferred_intake,
    academicRecords: profile.academic_records,
    testScores: profile.test_scores,
    lostReason: profile.lost_reason,
    canSetPriority: profile.can_set_priority,
    stageChanges: profile.stage_changes,
    progress: {
      percent: profile.progress.percent,
      nextStep: profile.progress.next_step,
      isDone: profile.progress.is_done,
    },
    detailsVersion: profile.details_version,
    canChange: profile.can_change,
    canEditDetails: profile.can_edit_details,
    canSetStage: profile.can_set_stage,
    canAssign: profile.can_assign,
    canTransfer: profile.can_transfer,
    applications: profile.applications,
    chosenOfferId: profile.chosen_offer_id,
    visas: profile.visas,
    canChangeApplications: profile.can_change_applications,
    documents: profile.documents,
    canChangeDocuments: profile.can_change_documents,
    canRecordPayment: profile.can_record_payment,
    canChangeFees: profile.can_change_fees,
    openTasks: profile.open_tasks,
    canAskTransfer: profile.can_ask_transfer,
    transferRequest: profile.transfer_request,
  }));

export type StudentProfile = z.infer<typeof StudentProfileSchema>;

/** An address as its form gives it (the ward as typed; "" is none). */
export type AddressInput = {
  province: string;
  district: string;
  municipality: string;
  ward: string;
  street: string;
};

/**
 * What a Profile section's form sends, as typed ("" is none; a date is "YYYY-MM-DD"). Each
 * section sends only its own details.
 */
export type StudentDetails = {
  name: string;
  phone: string;
  email: string;
  country: string;
  otherCountries: string[];
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  fatherName: string;
  motherName: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  passportNumber: string;
  passportPlaceOfIssue: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  permanentAddress: AddressInput;
  mailingAddress: AddressInput;
  mailingSameAsPermanent: boolean;
  targetLevel: string;
  highestQualification: string;
  pastDegree: string;
  preferredCourse: string;
  preferredIntake: string;
  source: string;
  subAgentName: string;
};

export type StudentDetailsChange = Partial<StudentDetails>;

/** The API's field names for each `StudentDetails` field. */
export const STUDENT_DETAILS_API_FIELDS = {
  name: "name",
  phone: "phone",
  email: "email",
  country: "country",
  otherCountries: "other_countries",
  dateOfBirth: "date_of_birth",
  gender: "gender",
  maritalStatus: "marital_status",
  nationality: "nationality",
  fatherName: "father_name",
  motherName: "mother_name",
  guardianName: "guardian_name",
  guardianRelation: "guardian_relation",
  guardianPhone: "guardian_phone",
  passportNumber: "passport_number",
  passportPlaceOfIssue: "passport_place_of_issue",
  passportIssueDate: "passport_issue_date",
  passportExpiryDate: "passport_expiry_date",
  permanentAddress: "permanent_address",
  mailingAddress: "mailing_address",
  mailingSameAsPermanent: "mailing_same_as_permanent",
  targetLevel: "target_level",
  highestQualification: "highest_qualification",
  pastDegree: "past_degree",
  preferredCourse: "preferred_course",
  preferredIntake: "preferred_intake",
  source: "source",
  subAgentName: "sub_agent_name",
} as const satisfies Record<keyof StudentDetails, string>;

export type AddressPart = keyof AddressInput;

/**
 * The form's field names, e.g. "permanentAddress.ward" for one part of an address. Refused input
 * is reported under these.
 */
export type StudentDetailsField =
  | Exclude<keyof StudentDetails, "permanentAddress" | "mailingAddress">
  | `${"permanentAddress" | "mailingAddress"}.${AddressPart}`;

/** The API's name for each form field in a refusal; an address part as "permanent_address.ward". */
export const STUDENT_DETAILS_FORM_API_FIELDS = {
  name: "name",
  phone: "phone",
  email: "email",
  country: "country",
  otherCountries: "other_countries",
  dateOfBirth: "date_of_birth",
  gender: "gender",
  maritalStatus: "marital_status",
  nationality: "nationality",
  fatherName: "father_name",
  motherName: "mother_name",
  guardianName: "guardian_name",
  guardianRelation: "guardian_relation",
  guardianPhone: "guardian_phone",
  passportNumber: "passport_number",
  passportPlaceOfIssue: "passport_place_of_issue",
  passportIssueDate: "passport_issue_date",
  passportExpiryDate: "passport_expiry_date",
  "permanentAddress.province": "permanent_address.province",
  "permanentAddress.district": "permanent_address.district",
  "permanentAddress.municipality": "permanent_address.municipality",
  "permanentAddress.ward": "permanent_address.ward",
  "permanentAddress.street": "permanent_address.street",
  "mailingAddress.province": "mailing_address.province",
  "mailingAddress.district": "mailing_address.district",
  "mailingAddress.municipality": "mailing_address.municipality",
  "mailingAddress.ward": "mailing_address.ward",
  "mailingAddress.street": "mailing_address.street",
  mailingSameAsPermanent: "mailing_same_as_permanent",
  targetLevel: "target_level",
  highestQualification: "highest_qualification",
  pastDegree: "past_degree",
  preferredCourse: "preferred_course",
  preferredIntake: "preferred_intake",
  source: "source",
  subAgentName: "sub_agent_name",
} as const satisfies Record<StudentDetailsField, string>;

/** A job as its form gives it (months as "YYYY-MM"; "" for no end month). */
export type WorkExperienceInput = {
  employer: string;
  jobTitle: string;
  startedOn: string;
  endedOn: string;
};

export type WorkExperienceField = keyof WorkExperienceInput;

export const WORK_EXPERIENCE_API_FIELDS = {
  employer: "employer",
  jobTitle: "job_title",
  startedOn: "started_on",
  endedOn: "ended_on",
} as const satisfies Record<WorkExperienceField, string>;

/** A qualification as the form gives it (the year as typed). */
export type AcademicRecordInput = {
  level: string;
  institution: string;
  finishedYear: string;
  result: string;
};

export type AcademicRecordField = keyof AcademicRecordInput;

export const ACADEMIC_RECORD_API_FIELDS = {
  level: "level",
  institution: "institution",
  finishedYear: "finished_year",
  result: "result",
} as const satisfies Record<AcademicRecordField, string>;

/** A test result as the form gives it (the score and date as typed). */
export type TestScoreInput = {
  test: string;
  overall: string;
  takenOn: string;
  details: string;
};

export type TestScoreField = keyof TestScoreInput;

export const TEST_SCORE_API_FIELDS = {
  test: "test",
  overall: "overall",
  takenOn: "taken_on",
  details: "details",
} as const satisfies Record<TestScoreField, string>;

/** A Stage to move to by hand; Lost needs the reason (spec 38-40). */
export type StageChange = { stage: Stage; lostReason?: string };

export type StageChangeField = "stage" | "lostReason";

export const STAGE_CHANGE_API_FIELDS = {
  stage: "stage",
  lostReason: "lost_reason",
} as const satisfies Record<StageChangeField, string>;

/** The one field of assigning or Transferring a Student. */
export const COUNSELLOR_PICK_API_FIELDS = { counsellor: "counsellor" } as const;

/** A Student someone still counsels, listed before they're deactivated (spec 21). */
export const AssignedStudentSchema = z.object({
  id: RecordIdSchema,
  name: z.string(),
  stage: z.enum(Stage),
});

export type AssignedStudent = z.infer<typeof AssignedStudentSchema>;

/** The Note's only field. */
export const NOTE_API_FIELDS = { note: "note" } as const;

/** One page of a Student's History, newest first. */
export const HistoryPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(HistoryEntrySchema),
  })
  .transform(({ count, page, page_size, results }) => ({
    count,
    page,
    pageSize: page_size,
    entries: results,
  }));

export type HistoryPage = z.infer<typeof HistoryPageSchema>;
