import { z } from "zod";

import { RecordIdSchema } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import { APPLICATION_STATUSES, OFFER_KINDS } from "@/constants/applications";
import { COURSE_LEVELS } from "@/constants/catalogue";
import { COUNTRIES } from "@/constants/students";
import { applicationListQuery, type ApplicationFilters } from "@/lib/applications";

import { getJson } from "../core/client";

const INTAKE = z.string().regex(/^20[0-9]{2}-(0[1-9]|1[0-2])$/);
const YEAR = z.string().regex(/^20[0-9]{2}$/);
const DAY = z.iso.date();

/** One row of the office-wide Applications list (spec 57a), in frontend naming. */
const OfficeApplicationSchema = z
  .object({
    id: RecordIdSchema,
    student: z.object({
      id: RecordIdSchema,
      name: z.string(),
      phone: z.string(),
      email: z.string(),
    }),
    university: z.object({ id: z.number().int(), name: z.string(), country: z.enum(COUNTRIES) }),
    course: z.object({ id: z.number().int(), name: z.string(), level: z.enum(COURSE_LEVELS) }),
    intake: INTAKE,
    status: z.enum(APPLICATION_STATUSES),
    offer_kind: z.enum(OFFER_KINDS).or(z.literal("")),
    assigned_counsellor: z.object({ id: z.number().int(), name: z.string() }).nullable(),
    applied_on: DAY.nullable(),
    added_on: DAY,
  })
  .transform(({ assigned_counsellor, offer_kind, applied_on, added_on, ...rest }) => ({
    ...rest,
    offerKind: offer_kind,
    assignedCounsellor: assigned_counsellor,
    appliedOn: applied_on,
    addedOn: added_on,
  }));

export type OfficeApplication = z.infer<typeof OfficeApplicationSchema>;

const OfficeApplicationPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(OfficeApplicationSchema),
  })
  .transform(({ count, page, page_size, results }) => ({
    count,
    page,
    pageSize: page_size,
    applications: results,
  }));

export type OfficeApplicationPage = z.infer<typeof OfficeApplicationPageSchema>;

/** The Intakes, years and countries the office's Applications use, for the list's filters. */
const ApplicationFilterChoicesSchema = z.object({
  intakes: z.array(INTAKE),
  years: z.array(YEAR),
  countries: z.array(z.enum(COUNTRIES)),
});

export type ApplicationFilterChoices = z.infer<typeof ApplicationFilterChoicesSchema>;

/** One page of every Application in the office matching the search and filters. */
export function fetchApplications(
  filters: ApplicationFilters,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<OfficeApplicationPage> {
  const path = `${API_PATHS.applications}${applicationListQuery(filters, page)}`;
  return getJson(path, OfficeApplicationPageSchema, fetchFn);
}

/** What the list's Intake, year and country filters can offer. */
export function fetchApplicationFilterChoices(
  fetchFn: typeof fetch = fetch,
): Promise<ApplicationFilterChoices> {
  return getJson(API_PATHS.applicationFilterChoices, ApplicationFilterChoicesSchema, fetchFn);
}
