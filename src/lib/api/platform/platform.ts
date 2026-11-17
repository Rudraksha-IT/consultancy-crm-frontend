import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";
import { ConsultancyStatus } from "@/constants/consultancyStatus";
import type { SwitchableModule } from "@/constants/modules";
import type { ThemeConfig } from "@/lib/theme";

import { getJson, postJson, postWithoutBody, putJson } from "../core/client";
import {
  ApiRequestError,
  InvalidCredentialsError,
  InvalidFieldsError,
  isNotLoggedInFailure,
  NotLoggedInError,
} from "../core/errors";
import {
  ConsultancyOverviewSchema,
  FieldErrorsSchema,
  NEW_CONSULTANCY_API_FIELDS,
  PlatformAdminAnswerSchema,
  type ConsultancyOverview,
  type Credentials,
  type NewConsultancy,
  type NewConsultancyField,
  type PlatformAdmin,
} from "../core/types";
import { TwoFactorStepAnswerSchema, type TwoFactorStep } from "../auth/twoFactor";

/** A Platform Admin's change of a Consultancy's Status (issue 42); dates are "YYYY-MM-DD". */
export type StatusChange = {
  status: ConsultancyStatus;
  reason: string;
  /** For Active: the last day paid for. */
  paidUntil?: string;
  /** For Evaluation (extending it): its last day. */
  evaluationEndsAt?: string;
};

/** The fields a refused Status change names; `detail` is a refusal of the change as a whole. */
export type StatusChangeField = "status" | "reason" | "paidUntil" | "evaluationEndsAt" | "detail";

const STATUS_CHANGE_API_FIELDS = {
  status: "status",
  reason: "reason",
  paidUntil: "paid_until",
  evaluationEndsAt: "evaluation_ends_at",
  detail: "detail",
} as const satisfies Record<StatusChangeField, string>;

const RefusedChangeSchema = z.object({ detail: z.string().min(1) });

/** The date each Status needs, if any: its field here and in the API. */
const STATUS_DATE_FIELDS: Partial<
  Record<ConsultancyStatus, { field: "paidUntil" | "evaluationEndsAt"; apiField: string }>
> = {
  active: { field: "paidUntil", apiField: "paid_until" },
  evaluation: { field: "evaluationEndsAt", apiField: "evaluation_ends_at" },
};

const NEW_CONSULTANCY_FIELDS = Object.keys(NEW_CONSULTANCY_API_FIELDS).filter(
  (field): field is NewConsultancyField => field in NEW_CONSULTANCY_API_FIELDS,
);

/** A login's outcome: logged in, or (two-step login, issue 61) the number or setup next. */
export type PlatformLoginOutcome =
  { kind: "loggedIn"; admin: PlatformAdmin } | { kind: "twoFactor"; step: TwoFactorStep };

const PlatformLoginAnswerSchema = z.union([
  PlatformAdminAnswerSchema.transform((admin) => ({ kind: "loggedIn" as const, admin })),
  TwoFactorStepAnswerSchema.transform((step) => ({ kind: "twoFactor" as const, step })),
]);

/** Log a Platform Admin in on the Platform subdomain. */
export async function logInToPlatform(
  credentials: Credentials,
  fetchFn: typeof fetch = fetch,
): Promise<PlatformLoginOutcome> {
  try {
    return await postJson(API_PATHS.platformLogin, credentials, PlatformLoginAnswerSchema, fetchFn);
  } catch (error) {
    throw isRefusedInput(error) ? new InvalidCredentialsError() : error;
  }
}

/** End the current Platform Admin session. */
export function logOutOfPlatform(fetchFn: typeof fetch = fetch): Promise<void> {
  return postWithoutBody(API_PATHS.platformLogout, fetchFn);
}

/** The Platform Admin logged in on the Platform subdomain. */
export async function fetchPlatformAdmin(fetchFn: typeof fetch = fetch): Promise<PlatformAdmin> {
  try {
    return await getJson(API_PATHS.platformMe, PlatformAdminAnswerSchema, fetchFn);
  } catch (error) {
    throw isNotLoggedInFailure(error) ? new NotLoggedInError() : error;
  }
}

/** Every Consultancy, whatever its Status, ordered by name. */
export function fetchConsultancies(fetchFn: typeof fetch = fetch): Promise<ConsultancyOverview[]> {
  return getJson(API_PATHS.platformConsultancies, z.array(ConsultancyOverviewSchema), fetchFn);
}

/**
 * Start creating a Consultancy: the API answers at once (202) with the office `setting_up`, and
 * a background job builds it (issue 60). Its Admins are added afterwards (issue 64).
 * Rejects with `InvalidFieldsError` when the API refuses some of the input.
 */
export async function createConsultancy(
  consultancy: NewConsultancy,
  fetchFn: typeof fetch = fetch,
): Promise<ConsultancyOverview> {
  try {
    return await postJson(
      API_PATHS.platformConsultancies,
      toApiFields(consultancy),
      ConsultancyOverviewSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error) ?? error;
  }
}

/** Try again: set up an office whose setup failed; it comes back `setting_up` (issue 60). */
export function retryConsultancySetup(
  id: number,
  fetchFn: typeof fetch = fetch,
): Promise<ConsultancyOverview> {
  return postJson(
    API_PATHS.platformConsultancyRetrySetup(id),
    {},
    ConsultancyOverviewSchema,
    fetchFn,
  );
}

/**
 * Change a Consultancy's Status with a reason. Rejects with `InvalidFieldsError` naming the
 * refused fields, or `detail` when the change itself is refused (e.g. "Terminated is final").
 */
export async function changeConsultancyStatus(
  id: number,
  change: StatusChange,
  fetchFn: typeof fetch = fetch,
): Promise<ConsultancyOverview> {
  try {
    return await postJson(
      API_PATHS.platformConsultancyStatus(id),
      statusChangeBody(change),
      ConsultancyOverviewSchema,
      fetchFn,
    );
  } catch (error) {
    throw toStatusChangeErrors(error) ?? error;
  }
}

/** Switch each of a Consultancy's switchable Modules on (true) or off (false). */
export function updateModules(
  id: number,
  switches: Record<SwitchableModule, boolean>,
  fetchFn: typeof fetch = fetch,
): Promise<ConsultancyOverview> {
  return putJson(
    API_PATHS.platformConsultancyModules(id),
    switches,
    ConsultancyOverviewSchema,
    fetchFn,
  );
}

/** Choose an office's colours (its Theme); only a Platform Admin can. */
export function updateConsultancyTheme(
  id: number,
  theme: ThemeConfig,
  fetchFn: typeof fetch = fetch,
): Promise<ConsultancyOverview> {
  return putJson(API_PATHS.platformConsultancyTheme(id), theme, ConsultancyOverviewSchema, fetchFn);
}

function isRefusedInput(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === HTTP_STATUS.badRequest;
}

function toApiFields(consultancy: NewConsultancy): Record<string, unknown> {
  // A paid-until date is sent only for an office starting Active (the API refuses it otherwise).
  const sent = NEW_CONSULTANCY_FIELDS.filter(
    (field) => field !== "paidUntil" || consultancy.status === ConsultancyStatus.Active,
  );
  return {
    ...Object.fromEntries(
      sent.map((field) => [NEW_CONSULTANCY_API_FIELDS[field], consultancy[field]]),
    ),
    theme: consultancy.theme,
  };
}

/** The change in API naming, with only the date its Status needs, and never an empty one. */
function statusChangeBody(change: StatusChange): Record<string, string> {
  const body = { status: change.status, reason: change.reason };
  const date = STATUS_DATE_FIELDS[change.status];
  if (date === undefined) return body;
  const value = change[date.field];
  return value === undefined || value === "" ? body : { ...body, [date.apiField]: value };
}

function toStatusChangeErrors(error: unknown): InvalidFieldsError<StatusChangeField> | null {
  if (!isRefusedInput(error)) return null;
  const refused = RefusedChangeSchema.safeParse(error.body);
  if (refused.success) {
    return new InvalidFieldsError<StatusChangeField>({ detail: [refused.data.detail] });
  }
  const parsed = FieldErrorsSchema.safeParse(error.body);
  if (!parsed.success) return null;
  const apiErrors = parsed.data;
  const fields = Object.keys(STATUS_CHANGE_API_FIELDS).filter(
    (field): field is StatusChangeField => field in STATUS_CHANGE_API_FIELDS,
  );
  return new InvalidFieldsError<StatusChangeField>(
    Object.fromEntries(
      fields.flatMap((field) => {
        const messages = apiErrors[STATUS_CHANGE_API_FIELDS[field]];
        return messages === undefined ? [] : [[field, messages]];
      }),
    ),
  );
}

function toFieldErrors(error: unknown): InvalidFieldsError<NewConsultancyField> | null {
  if (!isRefusedInput(error)) return null;
  const parsed = FieldErrorsSchema.safeParse(error.body);
  if (!parsed.success) return null;
  const apiErrors = parsed.data;
  const fieldErrors = Object.fromEntries(
    NEW_CONSULTANCY_FIELDS.flatMap((field) => {
      const messages = apiErrors[NEW_CONSULTANCY_API_FIELDS[field]];
      return messages === undefined ? [] : [[field, messages]];
    }),
  );
  return new InvalidFieldsError<NewConsultancyField>(fieldErrors);
}
