import { Role } from "@/constants/roles";
import { CounsellorFilter, type Country } from "@/constants/students";
import {
  DEFAULT_VISA_SORT,
  APPOINTMENT_DAYS_AHEAD,
  AppointmentWhen,
  type VisaSort,
  type VisaStatus,
} from "@/constants/visas";
import { addDaysIso } from "@/lib/dates";

/** The office-wide Visas list's filters and order; "" means any (spec 62b). */
export type VisaFilters = {
  status: VisaStatus | "";
  /** The country of the Visa's University. */
  country: Country | "";
  /** The Intake month of the Visa's Application, "YYYY-MM". */
  intake: string;
  /** "", "me" or a Staff id: whose Students. */
  counsellor: string;
  appointment: AppointmentWhen;
  sort: VisaSort;
};

/** Where the list starts: a Counsellor sees their own Students' Visas, others everyone. */
export function defaultVisaFilters(role: Role): VisaFilters {
  return {
    status: "",
    country: "",
    intake: "",
    counsellor: role === Role.Counsellor ? CounsellorFilter.Me : CounsellorFilter.Any,
    appointment: AppointmentWhen.Any,
    sort: DEFAULT_VISA_SORT,
  };
}

/**
 * The query string the API's Visas list takes for these filters and page ("" if none). `today`
 * ("YYYY-MM-DD") is where "the next 7 days" starts.
 */
export function visaListQuery(filters: VisaFilters, page: number, today: string): string {
  const sent: [string, string][] = [
    ...filterValues(filters),
    ...appointmentValues(filters.appointment, today),
    ["sort", filters.sort === DEFAULT_VISA_SORT ? "" : filters.sort],
    ["page", page > 1 ? String(page) : ""],
  ];
  const query = new URLSearchParams(sent.filter(([, value]) => value !== "")).toString();
  return query === "" ? "" : `?${query}`;
}

/** Whether any filter narrows the list (the order doesn't). */
export function hasAnyVisaFilter(filters: VisaFilters): boolean {
  return [...filterValues(filters), ["appointment", filters.appointment]].some(
    ([, value]) => value !== "",
  );
}

function filterValues(filters: VisaFilters): [string, string][] {
  return [
    ["status", filters.status],
    ["country", filters.country],
    ["intake", filters.intake],
    ["counsellor", filters.counsellor],
  ];
}

function appointmentValues(appointment: AppointmentWhen, today: string): [string, string][] {
  if (appointment === AppointmentWhen.None) return [["has_appointment", "false"]];
  const days = APPOINTMENT_DAYS_AHEAD[appointment];
  if (days === undefined) return [];
  return [
    ["appointment_from", today],
    ["appointment_to", addDaysIso(today, days - 1)],
  ];
}
