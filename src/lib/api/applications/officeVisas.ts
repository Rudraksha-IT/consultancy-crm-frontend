import { z } from "zod";

import { RecordIdSchema } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import { COURSE_LEVELS } from "@/constants/catalogue";
import { COUNTRIES } from "@/constants/students";
import { APPOINTMENTS, VISA_STATUSES } from "@/constants/visas";
import { visaListQuery, type VisaFilters } from "@/lib/visas";

import { getJson } from "../core/client";
import { APPOINTMENT_AT } from "../core/types";

const INTAKE = z.string().regex(/^20[0-9]{2}-(0[1-9]|1[0-2])$/);
const COUNT = z.number().int().nonnegative();

/** One row of the office-wide Visas list (spec 62b), in frontend naming. */
const OfficeVisaSchema = z
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
    status: z.enum(VISA_STATUSES),
    next_appointment: z.object({ kind: z.enum(APPOINTMENTS), at: APPOINTMENT_AT }).nullable(),
    started_on: z.iso.date(),
    documents: z.object({ done: COUNT, total: COUNT, rejected: COUNT, waiting: COUNT }),
    assigned_counsellor: z.object({ id: z.number().int(), name: z.string() }).nullable(),
  })
  .transform(({ next_appointment, started_on, assigned_counsellor, ...rest }) => ({
    ...rest,
    nextAppointment: next_appointment,
    startedOn: started_on,
    assignedCounsellor: assigned_counsellor,
  }));

export type OfficeVisa = z.infer<typeof OfficeVisaSchema>;

const OfficeVisaPageSchema = z
  .object({
    count: COUNT,
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(OfficeVisaSchema),
  })
  .transform(({ count, page, page_size, results }) => ({
    count,
    page,
    pageSize: page_size,
    visas: results,
  }));

export type OfficeVisaPage = z.infer<typeof OfficeVisaPageSchema>;

/** The Intakes and countries the office's Visas use, for the list's filters. */
const VisaFilterChoicesSchema = z.object({
  intakes: z.array(INTAKE),
  countries: z.array(z.enum(COUNTRIES)),
});

export type VisaFilterChoices = z.infer<typeof VisaFilterChoicesSchema>;

/**
 * One page of every Visa in the office matching the filters. `today` ("YYYY-MM-DD") is where the
 * "next 7 days" appointment choice starts.
 */
export function fetchVisas(
  filters: VisaFilters,
  page: number,
  today: string,
  fetchFn: typeof fetch = fetch,
): Promise<OfficeVisaPage> {
  const path = `${API_PATHS.visas}${visaListQuery(filters, page, today)}`;
  return getJson(path, OfficeVisaPageSchema, fetchFn);
}

/** What the list's Intake and country filters can offer. */
export function fetchVisaFilterChoices(fetchFn: typeof fetch = fetch): Promise<VisaFilterChoices> {
  return getJson(API_PATHS.visaFilterChoices, VisaFilterChoicesSchema, fetchFn);
}
