import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import { NOTIFICATION_KINDS } from "@/constants/notifications";
import { TRANSFER_REQUEST_STATUSES } from "@/constants/transferRequests";
import { WORK_FROM_HOME_STATUSES } from "@/constants/workFromHome";

import { getJson, patchJson, postJson } from "../core/client";

const StudentRefSchema = z.object({ id: RecordIdSchema, name: z.string() });
/** Who did it; a Platform Admin who answered a Transfer Request has no Staff id. */
const ActorSchema = z.object({ id: RecordIdSchema.nullable(), name: z.string() });

/** One notification as the API answers it (spec 80). */
export const NotificationSchema = z
  .object({
    id: RecordIdSchema,
    kind: z.enum(NOTIFICATION_KINDS),
    created_at: z.iso.datetime({ offset: true }),
    is_read: z.boolean(),
    /** The Task it's about; null for a Transfer Request. */
    task: z
      .object({ id: RecordIdSchema, title: z.string().min(1), due_on: z.iso.date() })
      .nullable(),
    /** Who gave the Task ("assigned"), or who asked or answered a Transfer Request. */
    by: ActorSchema.nullable(),
    /** Never sent to Teachers, who don't see Students. */
    student: StudentRefSchema.nullable(),
    /** The Transfer Request it's about; null for a Task. */
    transfer_request: z
      .object({ id: RecordIdSchema, status: z.enum(TRANSFER_REQUEST_STATUSES) })
      .nullable(),
    /** What was put in, restored from or deleted from the Bin, and why (issue 79). */
    bin: z.object({ item: z.string(), reason: z.string() }).nullable().default(null),
    /** The Work From Home dates asked for, answered or set (issue 87). */
    work_from_home: z
      .object({
        id: RecordIdSchema,
        staff_id: RecordIdSchema,
        starts_on: z.iso.date(),
        ends_on: z.iso.date().nullable(),
        status: z.enum(WORK_FROM_HOME_STATUSES),
      })
      .nullable()
      .default(null),
  })
  .transform((item) => ({
    id: item.id,
    kind: item.kind,
    createdAt: item.created_at,
    isRead: item.is_read,
    task:
      item.task === null
        ? null
        : { id: item.task.id, title: item.task.title, dueOn: item.task.due_on },
    by: item.by,
    student: item.student,
    transferRequest: item.transfer_request,
    bin: item.bin,
    workFromHome:
      item.work_from_home === null
        ? null
        : {
            id: item.work_from_home.id,
            staffId: item.work_from_home.staff_id,
            startsOn: item.work_from_home.starts_on,
            endsOn: item.work_from_home.ends_on,
            status: item.work_from_home.status,
          },
  }));

export type AppNotification = z.infer<typeof NotificationSchema>;

/** The newest page of my notifications and how many are unread. */
export const NotificationPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    unread_count: z.number().int().nonnegative(),
    results: z.array(NotificationSchema),
  })
  .transform((page) => ({
    count: page.count,
    unreadCount: page.unread_count,
    notifications: page.results,
  }));

export type NotificationPage = z.infer<typeof NotificationPageSchema>;

const ReadAllSchema = z.object({ unread_count: z.number().int().nonnegative() });

/** My newest notifications; Tasks that fell due are noticed by asking (spec 80). */
export function fetchNotifications(fetchFn: typeof fetch = fetch): Promise<NotificationPage> {
  return getJson(API_PATHS.notifications, NotificationPageSchema, fetchFn);
}

/** Mark one of my notifications read, or unread again. */
export function setNotificationRead(
  id: RecordId,
  read: boolean,
  fetchFn: typeof fetch = fetch,
): Promise<AppNotification> {
  return patchJson(API_PATHS.notification(id), { read }, NotificationSchema, fetchFn);
}

/** Mark all my notifications read. */
export async function markAllNotificationsRead(fetchFn: typeof fetch = fetch): Promise<void> {
  await postJson(API_PATHS.notificationsReadAll, {}, ReadAllSchema, fetchFn);
}
