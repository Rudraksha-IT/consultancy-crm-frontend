import { z } from "zod";

import { API_PATHS } from "@/constants/api";
import { Stage } from "@/constants/stages";

import { getJson } from "../core/client";

const ID = z.number().int().positive();

/** A Student for someone who may open their profile (everyone but Teachers). */
const FoundStudentSchema = z
  .object({
    kind: z.literal("student"),
    id: ID,
    name: z.string(),
    phone: z.string(),
    stage: z.enum(Stage),
    assigned_counsellor: z.object({ id: ID, name: z.string() }).nullable(),
  })
  .transform(({ assigned_counsellor, ...rest }) => ({
    ...rest,
    assignedCounsellor: assigned_counsellor,
  }));

/** A Student found by their Teacher: only the name and the class they're in (spec 22). */
const FoundClassStudentSchema = z.object({
  kind: z.literal("class_student"),
  id: ID,
  name: z.string(),
  batch: z.object({ id: ID, name: z.string() }),
});

const FoundBatchSchema = z
  .object({ id: ID, name: z.string(), time_slot: z.string() })
  .transform(({ time_slot, ...rest }) => ({ ...rest, timeSlot: time_slot }));

const SearchResultsSchema = z
  .object({
    students: z.array(z.union([FoundStudentSchema, FoundClassStudentSchema])).max(5),
    student_count: z.number().int().nonnegative(),
    batches: z.array(FoundBatchSchema).max(5),
  })
  .transform(({ student_count, ...rest }) => ({ ...rest, studentCount: student_count }));

export type FoundStudent = z.infer<typeof FoundStudentSchema>;
export type FoundClassStudent = z.infer<typeof FoundClassStudentSchema>;
export type FoundBatch = z.infer<typeof FoundBatchSchema>;
export type SearchResults = z.infer<typeof SearchResultsSchema>;

/** The fewest and most characters the search takes (the API refuses anything else). */
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;

/**
 * At most 5 Students and 5 classes the person may see matching `text` (spec 29a). Pass a
 * `fetchFn` bound to an AbortSignal to cancel an older search.
 */
export function searchEverything(
  text: string,
  fetchFn: typeof fetch = fetch,
): Promise<SearchResults> {
  const path = `${API_PATHS.search}?${new URLSearchParams({ q: text }).toString()}`;
  return getJson(path, SearchResultsSchema, fetchFn);
}
