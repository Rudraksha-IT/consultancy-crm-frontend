import { z } from "zod";

import { TRANSFER_REQUEST_STATUSES } from "@/constants/transferRequests";

const PersonSchema = z.object({ id: z.number().int(), name: z.string().min(1) });

/** One Transfer Request as the API answers it, with what the viewer may do (spec 44a-44e). */
export const TransferRequestSchema = z
  .object({
    id: z.number().int(),
    student: PersonSchema,
    asked_by: PersonSchema,
    reason: z.string().min(1),
    asked_at: z.iso.datetime({ offset: true }),
    status: z.enum(TRANSFER_REQUEST_STATUSES),
    /** The Student's counsellor now; null when they have none. */
    counsellor: PersonSchema.nullable(),
    answered_by: z.object({ name: z.string().min(1), is_platform_admin: z.boolean() }).nullable(),
    answer_reason: z.string(),
    answered_at: z.iso.datetime({ offset: true }).nullable(),
    /** Who the Student was taken from on approval; empty if they had no counsellor. */
    taken_from: z.string(),
    can_answer: z.boolean(),
    can_cancel: z.boolean(),
  })
  .transform((request) => ({
    id: request.id,
    student: request.student,
    askedBy: request.asked_by,
    reason: request.reason,
    askedAt: request.asked_at,
    status: request.status,
    counsellor: request.counsellor,
    answeredBy:
      request.answered_by === null
        ? null
        : {
            name: request.answered_by.name,
            isPlatformAdmin: request.answered_by.is_platform_admin,
          },
    answerReason: request.answer_reason,
    answeredAt: request.answered_at,
    takenFrom: request.taken_from,
    canAnswer: request.can_answer,
    canCancel: request.can_cancel,
  }));

export type TransferRequest = z.infer<typeof TransferRequestSchema>;
