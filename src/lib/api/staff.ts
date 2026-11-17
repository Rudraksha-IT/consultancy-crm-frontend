import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";
import type { Role } from "@/constants/roles";

import { getJson, patchJson, postJson, sendWithoutBody } from "./client";
import { ApiRequestError, TooManyCodesError } from "./errors";
import { toFieldErrors } from "./fieldErrors";
import {
  AssignedStudentSchema,
  CounsellorChoiceSchema,
  EmployeeSchema,
  NEW_EMPLOYEE_API_FIELDS,
  type AssignedStudent,
  type CounsellorChoice,
  type Employee,
  type NewEmployee,
} from "./types";

/** Every employee of the office, invited and departed included (Admins only). */
export function fetchEmployees(fetchFn: typeof fetch = fetch): Promise<Employee[]> {
  return getJson(API_PATHS.employees, z.array(EmployeeSchema), fetchFn);
}

/**
 * Add an employee as invited; the API emails them a Code to join with.
 * Rejects with `InvalidFieldsError` when the API refuses some of the input.
 */
export async function inviteEmployee(
  employee: NewEmployee,
  fetchFn: typeof fetch = fetch,
): Promise<Employee> {
  try {
    return await postJson(API_PATHS.employees, toApiFields(employee), EmployeeSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, NEW_EMPLOYEE_API_FIELDS) ?? error;
  }
}

/** Give an employee a new Role. */
export function changeEmployeeRole(
  id: number,
  role: Role,
  fetchFn: typeof fetch = fetch,
): Promise<Employee> {
  return patchJson(API_PATHS.employee(id), { role }, EmployeeSchema, fetchFn);
}

/** Deactivate someone who has left: they can't log in and their logins end at once. */
export function deactivateEmployee(id: number, fetchFn: typeof fetch = fetch): Promise<Employee> {
  return postJson(API_PATHS.employeeDeactivate(id), {}, EmployeeSchema, fetchFn);
}

/**
 * Email someone who hasn't joined yet a new Code. Rejects with `TooManyCodesError` when too many
 * were sent in the last hour.
 */
export async function resendInvite(id: number, fetchFn: typeof fetch = fetch): Promise<Employee> {
  try {
    return await postJson(API_PATHS.employeeInvite(id), {}, EmployeeSchema, fetchFn);
  } catch (error) {
    const isLimit =
      error instanceof ApiRequestError && error.status === HTTP_STATUS.tooManyRequests;
    throw isLimit ? new TooManyCodesError() : error;
  }
}

/** Cancel the invite of someone who hasn't joined yet; their Code stops working. */
export function cancelInvite(id: number, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.employeeInvite(id), fetchFn);
}

/**
 * Switch someone's two-step login on or off (issue 62); either way they are signed out. Admins
 * and Platform Admins only, and never their own (that is in My settings).
 */
export function setEmployeeTwoFactor(
  id: number,
  required: boolean,
  fetchFn: typeof fetch = fetch,
): Promise<Employee> {
  return patchJson(API_PATHS.employeeTwoFactor(id), { required }, EmployeeSchema, fetchFn);
}

/**
 * Reset the two-step login of someone who lost their phone (issue 62): their app and recovery
 * codes are removed and they are signed out everywhere.
 */
export function resetEmployeeTwoFactor(
  id: number,
  fetchFn: typeof fetch = fetch,
): Promise<Employee> {
  return postJson(API_PATHS.employeeTwoFactorReset(id), {}, EmployeeSchema, fetchFn);
}

/** Who can be picked as an Assigned Counsellor: active Counsellors and Admins. */
export function fetchCounsellorChoices(fetchFn: typeof fetch = fetch): Promise<CounsellorChoice[]> {
  return getJson(API_PATHS.counsellorChoices, z.array(CounsellorChoiceSchema), fetchFn);
}

function toApiFields(employee: NewEmployee): Record<string, string> {
  return {
    [NEW_EMPLOYEE_API_FIELDS.name]: employee.name,
    [NEW_EMPLOYEE_API_FIELDS.mobile]: employee.mobile,
    [NEW_EMPLOYEE_API_FIELDS.email]: employee.email,
    [NEW_EMPLOYEE_API_FIELDS.jobTitle]: employee.jobTitle,
    [NEW_EMPLOYEE_API_FIELDS.role]: employee.role,
    [NEW_EMPLOYEE_API_FIELDS.joinedOn]: employee.joinedOn,
  };
}

/** The Students someone still counsels (not Lost, no granted Visa), to Transfer before they leave. */
export function fetchAssignedStudents(
  staffId: number,
  fetchFn: typeof fetch = fetch,
): Promise<AssignedStudent[]> {
  return getJson(
    API_PATHS.employeeAssignedStudents(staffId),
    z.array(AssignedStudentSchema),
    fetchFn,
  );
}
