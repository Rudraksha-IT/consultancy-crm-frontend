import { z } from "zod";

import { API_PATHS } from "@/constants/api";
import type { TransferBox } from "@/constants/transferRequests";

import { getJson, postJson } from "./client";
import { toFieldErrors } from "./fieldErrors";
import { TransferRequestSchema, type TransferRequest } from "./transferRequestTypes";

/** The form's field names and the API's. */
const REASON_API_FIELDS = { reason: "reason" } as const;

/** One page of a box of requests, and how many wait for my answer (the menu's count). */
export const TransferRequestPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    waiting_for_me_count: z.number().int().nonnegative(),
    results: z.array(TransferRequestSchema),
  })
  .transform((page) => ({
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    waitingForMeCount: page.waiting_for_me_count,
    requests: page.results,
  }));

export type TransferRequestPage = z.infer<typeof TransferRequestPageSchema>;

const CountSchema = z.object({ count: z.number().int().nonnegative() });

/** One page of the requests waiting for me, sent by me, or (Admins) everyone's (spec 44c-44d). */
export function fetchTransferRequests(
  box: TransferBox,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<TransferRequestPage> {
  const query = new URLSearchParams({ box, page: String(page) });
  return getJson(
    `${API_PATHS.transferRequests}?${query.toString()}`,
    TransferRequestPageSchema,
    fetchFn,
  );
}

/** How many requests wait for my answer: the menu's count. */
export async function fetchTransferRequestCount(fetchFn: typeof fetch = fetch): Promise<number> {
  const answer = await getJson(API_PATHS.transferRequestCount, CountSchema, fetchFn);
  return answer.count;
}

/**
 * Ask to take a Student who isn't mine, with the reason (spec 44a). Rejects with
 * `InvalidFieldsError` for a refused reason, and `ApiRequestError` otherwise (409: someone asked
 * already).
 */
export async function askToTakeStudent(
  studentId: number,
  reason: string,
  fetchFn: typeof fetch = fetch,
): Promise<TransferRequest> {
  try {
    return await postJson(
      API_PATHS.studentTransferRequests(studentId),
      { reason },
      TransferRequestSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, REASON_API_FIELDS) ?? error;
  }
}

/** Approve: the Student is Transferred to whoever asked (spec 44b). */
export function approveTransferRequest(
  id: number,
  fetchFn: typeof fetch = fetch,
): Promise<TransferRequest> {
  return postJson(API_PATHS.transferRequestApprove(id), {}, TransferRequestSchema, fetchFn);
}

/** Decline, with an optional reason the asker sees (spec 44b). */
export async function declineTransferRequest(
  id: number,
  reason: string,
  fetchFn: typeof fetch = fetch,
): Promise<TransferRequest> {
  try {
    return await postJson(
      API_PATHS.transferRequestDecline(id),
      { reason },
      TransferRequestSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, REASON_API_FIELDS) ?? error;
  }
}

/** Cancel my own request while it waits (spec 44c). */
export function cancelTransferRequest(
  id: number,
  fetchFn: typeof fetch = fetch,
): Promise<TransferRequest> {
  return postJson(API_PATHS.transferRequestCancel(id), {}, TransferRequestSchema, fetchFn);
}
