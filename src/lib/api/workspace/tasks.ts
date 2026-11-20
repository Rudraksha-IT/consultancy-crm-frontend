import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import { ROLES } from "@/constants/roles";
import { TASK_PRIORITIES, TASK_TIMINGS, type TaskPriority, type TaskView } from "@/constants/tasks";

import { getJson, patchJson, postJson } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";

const PersonSchema = z.object({ id: z.number().int(), name: z.string() });
const StudentRefSchema = z.object({ id: RecordIdSchema, name: z.string() });

/** One Task as the API answers it (spec 77-82). `due_on` is AD, "YYYY-MM-DD". */
export const TaskSchema = z
  .object({
    id: z.number().int(),
    title: z.string().min(1),
    due_on: z.iso.date(),
    priority: z.enum(TASK_PRIORITIES),
    /** Seen by its owner alone (spec 77b). */
    only_me: z.boolean(),
    timing: z.enum(TASK_TIMINGS),
    is_done: z.boolean(),
    done_at: z.iso.datetime({ offset: true }).nullable(),
    assignee: PersonSchema,
    created_by: PersonSchema,
    /** Never sent to Teachers, who don't see Students. */
    student: StudentRefSchema.nullable(),
    can_mark_done: z.boolean(),
  })
  .transform((task) => ({
    id: task.id,
    title: task.title,
    dueOn: task.due_on,
    priority: task.priority,
    isOnlyMe: task.only_me,
    timing: task.timing,
    isDone: task.is_done,
    doneAt: task.done_at,
    assignee: task.assignee,
    createdBy: task.created_by,
    student: task.student,
    canMarkDone: task.can_mark_done,
  }));

export type Task = z.infer<typeof TaskSchema>;

/** One page of Tasks. */
export const TaskPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(TaskSchema),
  })
  .transform((page) => ({
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    tasks: page.results,
  }));

export type TaskPage = z.infer<typeof TaskPageSchema>;

/** Someone a Task can be given to: any active Staff member. */
export const TaskAssigneeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  role: z.enum(ROLES),
});

export type TaskAssignee = z.infer<typeof TaskAssigneeSchema>;

/** A Task as the New Task form sends it. */
export type NewTask = {
  title: string;
  /** AD, "YYYY-MM-DD". */
  dueOn: string;
  assigneeId: number;
  studentId: RecordId | null;
  priority: TaskPriority;
  /** For me alone: the assignee must be me and there's no Student (spec 77b). */
  isOnlyMe: boolean;
};

const API_FIELDS: Record<keyof NewTask, string> = {
  title: "title",
  dueOn: "due_on",
  assigneeId: "assignee",
  studentId: "student",
  priority: "priority",
  isOnlyMe: "only_me",
};

/** Narrowing a view of my Tasks: one priority, and Tasks due by a day (AD, "YYYY-MM-DD"). */
export type TaskFilters = { priority?: TaskPriority; dueBy?: string };

/**
 * One view of my Tasks (spec 79, 79a): to do (overdue first, then by priority, then soonest),
 * given to others, or done.
 */
export function fetchMyTasks(
  view: TaskView,
  page: number,
  filters: TaskFilters = {},
  fetchFn: typeof fetch = fetch,
): Promise<TaskPage> {
  const query = new URLSearchParams({ view, page: String(page) });
  if (filters.priority !== undefined) query.set("priority", filters.priority);
  if (filters.dueBy !== undefined) query.set("due_by", filters.dueBy);
  return getJson(`${API_PATHS.tasks}?${query.toString()}`, TaskPageSchema, fetchFn);
}

const TaskCountSchema = z.object({ count: z.number().int().nonnegative() });

/** How many of my open Tasks are due today or overdue, for the menu (spec 79a). */
export async function fetchTaskCount(fetchFn: typeof fetch = fetch): Promise<number> {
  const answer = await getJson(API_PATHS.taskCount, TaskCountSchema, fetchFn);
  return answer.count;
}

/** One page of a Student's open Tasks, soonest first (spec 82). */
export function fetchStudentTasks(
  studentId: RecordId,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<TaskPage> {
  const query = new URLSearchParams({ page: String(page) });
  return getJson(
    `${API_PATHS.studentTasks(studentId)}?${query.toString()}`,
    TaskPageSchema,
    fetchFn,
  );
}

/**
 * Create a Task (spec 77-78). Rejects with `InvalidFieldsError` for refused fields, and
 * `ApiRequestError` when not allowed.
 */
export async function createTask(task: NewTask, fetchFn: typeof fetch = fetch): Promise<Task> {
  const body = {
    title: task.title,
    due_on: task.dueOn,
    assignee: task.assigneeId,
    student: task.studentId,
    priority: task.priority,
    only_me: task.isOnlyMe,
  };
  try {
    return await postJson(API_PATHS.tasks, body, TaskSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, API_FIELDS) ?? error;
  }
}

/** Mark a Task done, or not done again (spec 81). */
export function setTaskDone(
  taskId: number,
  done: boolean,
  fetchFn: typeof fetch = fetch,
): Promise<Task> {
  return patchJson(API_PATHS.task(taskId), { done }, TaskSchema, fetchFn);
}

/** Who a Task can be given to, by name. */
export function fetchTaskAssignees(fetchFn: typeof fetch = fetch): Promise<TaskAssignee[]> {
  return getJson(API_PATHS.taskAssignees, z.array(TaskAssigneeSchema), fetchFn);
}
