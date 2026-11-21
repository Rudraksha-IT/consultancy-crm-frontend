import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import { INBOX_MESSAGE_MAX_LENGTH } from "@/constants/inbox";

import { getJson, postJson } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import { MomentSchema } from "../core/types";

/** The form's field names and the API's. */
const SEND_API_FIELDS = { text: "text" } as const;

const IdSchema = RecordIdSchema;
const TextSchema = z.string().max(INBOX_MESSAGE_MAX_LENGTH);

/** Who a conversation is with. */
const InboxPersonSchema = z
  .object({ id: IdSchema, name: z.string(), job_title: z.string(), has_left: z.boolean() })
  .transform((person) => ({
    id: person.id,
    name: person.name,
    jobTitle: person.job_title,
    hasLeft: person.has_left,
  }));

export type InboxPerson = z.infer<typeof InboxPersonSchema>;

const InboxMessageSchema = z
  .object({ id: IdSchema, text: TextSchema, from_me: z.boolean(), sent_at: MomentSchema })
  .transform((message) => ({
    id: message.id,
    text: message.text,
    fromMe: message.from_me,
    sentAt: message.sent_at,
  }));

export type InboxMessage = z.infer<typeof InboxMessageSchema>;

const ConversationsSchema = z.object({
  conversations: z.array(
    z
      .object({
        person: InboxPersonSchema,
        last: z.object({ text: TextSchema, from_me: z.boolean(), sent_at: MomentSchema }),
        unread: z.boolean(),
      })
      .transform((one) => ({
        person: one.person,
        last: { text: one.last.text, fromMe: one.last.from_me, sentAt: one.last.sent_at },
        unread: one.unread,
      })),
  ),
});

export type InboxConversation = z.infer<typeof ConversationsSchema>["conversations"][number];

const ThreadSchema = z
  .object({
    person: InboxPersonSchema,
    can_write: z.boolean(),
    messages: z.array(InboxMessageSchema),
    more: z.boolean(),
  })
  .transform((thread) => ({
    person: thread.person,
    canWrite: thread.can_write,
    messages: thread.messages,
    hasMore: thread.more,
  }));

export type InboxThread = z.infer<typeof ThreadSchema>;

const CheckSchema = z.object({
  unread: z.number().int().nonnegative(),
  latest: IdSchema.nullable(),
});

/** The 30-second check: conversations with unread messages, and the newest message's id. */
export type InboxCheck = z.infer<typeof CheckSchema>;

const PeopleSchema = z.object({
  people: z.array(
    z
      .object({ id: IdSchema, name: z.string(), job_title: z.string() })
      .transform((person) => ({ id: person.id, name: person.name, jobTitle: person.job_title })),
  ),
});

export type InboxContact = z.infer<typeof PeopleSchema>["people"][number];

/** One small request: how many conversations have unread messages, and the newest id. */
export function fetchInboxCheck(fetchFn: typeof fetch = fetch): Promise<InboxCheck> {
  return getJson(API_PATHS.inboxCheck, CheckSchema, fetchFn);
}

/** My conversations, newest first. */
export async function fetchConversations(
  fetchFn: typeof fetch = fetch,
): Promise<InboxConversation[]> {
  const answer = await getJson(API_PATHS.inbox, ConversationsSchema, fetchFn);
  return answer.conversations;
}

/** Everyone active in the office except me, by name: who I can start a conversation with. */
export async function fetchInboxPeople(fetchFn: typeof fetch = fetch): Promise<InboxContact[]> {
  const answer = await getJson(API_PATHS.inboxPeople, PeopleSchema, fetchFn);
  return answer.people;
}

/** The conversation with one person, oldest first. Opening it marks their messages read. */
export function fetchConversation(
  personId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<InboxThread> {
  return getJson(API_PATHS.inboxConversation(personId), ThreadSchema, fetchFn);
}

/**
 * Send a message. Rejects with `InvalidFieldsError` for a refused text, and `ApiRequestError`
 * otherwise (403: they have left, or the office is read-only).
 */
export async function sendInboxMessage(
  personId: RecordId,
  text: string,
  fetchFn: typeof fetch = fetch,
): Promise<InboxMessage> {
  try {
    return await postJson(
      API_PATHS.inboxConversation(personId),
      { text },
      InboxMessageSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, SEND_API_FIELDS) ?? error;
  }
}
