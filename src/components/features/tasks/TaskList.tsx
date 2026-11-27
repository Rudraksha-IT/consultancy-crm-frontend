"use client";

import type { RecordId } from "@/lib/recordId";
import clsx from "clsx";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { useTaskCount } from "@/components/features/shell/taskCount";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/useToast";
import { HTTP_STATUS } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { TASK_TEXT, TaskPriority, TaskTiming } from "@/constants/tasks";
import { ApiRequestError, setTaskDone, type Task, updatingOr } from "@/lib/api";
import { localDayIso } from "@/lib/dates";

type TaskListProps = {
  tasks: readonly Task[];
  /** Off on a Student's profile, where every Task is about them. */
  showsStudent: boolean;
  /** A Task was ticked or unticked: the list should load again. */
  onChanged: () => void;
  /**
   * "desk": in Home's narrow column (from 1280, UI revamp 07) a row has a set height whatever its
   * text: the title on at most two lines, then one line of who with the date at its end.
   */
  look?: TaskLook;
};

export type TaskLook = "list" | "desk";

/** The desk look, part by part. Every class starts at 1280: below it the row is the usual one. */
const DESK = {
  row: "desk:py-1",
  // The tick box stands beside both lines.
  box: "desk:row-span-2",
  // The text's box is dropped, so the title, who and when are placed on the row's own grid.
  text: "desk:contents",
  title:
    "desk:text-body desk:col-span-2 desk:col-start-2 desk:row-start-1 desk:line-clamp-2 desk:pt-2.5",
  tags: "desk:hidden",
  meta: "desk:text-small desk:min-h-control desk:col-start-2 desk:row-start-2 desk:-mt-2 desk:min-w-0 desk:flex-nowrap desk:whitespace-nowrap",
  due: "desk:text-small desk:min-h-control desk:col-start-3 desk:row-start-2 desk:-mt-2 desk:py-0",
} as const;

/** The classes of one part of a row in this look. */
function desk(look: TaskLook, part: keyof typeof DESK): string | false {
  return look === "desk" && DESK[part];
}

/** Tasks as rows: a tick box, the title, who and what it's about, and when it's due (spec 79). */
export function TaskList({ tasks, showsStudent, onChanged, look = "list" }: TaskListProps) {
  return (
    <ul className="divide-rule divide-y">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          showsStudent={showsStudent}
          onChanged={onChanged}
          look={look}
        />
      ))}
    </ul>
  );
}

type TaskRowProps = {
  task: Task;
  showsStudent: boolean;
  onChanged: () => void;
  look: TaskLook;
};

function TaskRow({ task, showsStudent, onChanged, look }: TaskRowProps) {
  const checkboxId = useId();
  const { isBusy, toggle } = useToggle(task, onChanged);
  return (
    <li
      data-row=""
      data-look={look}
      className={clsx(
        "pr-gutter grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 py-2",
        // The 20px box sits in a 44px square: this keeps it the sheet's padding from the side.
        "max-phone:pl-0.5 pl-1.5",
        "phone:grid-cols-[auto_minmax(0,1fr)_auto]",
        desk(look, "row"),
        task.timing === TaskTiming.Overdue && "bg-bad-tint",
      )}
    >
      {/* The whole 44px square ticks it, not only the small box. */}
      <label
        htmlFor={checkboxId}
        className={clsx("size-control grid cursor-pointer place-items-center", desk(look, "box"))}
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={task.isDone}
          disabled={!task.canMarkDone || isBusy}
          aria-label={
            task.isDone ? TASK_TEXT.markNotDone(task.title) : TASK_TEXT.markDone(task.title)
          }
          onChange={toggle}
          className="accent-accent size-5 cursor-pointer disabled:cursor-not-allowed"
        />
      </label>
      <div className={clsx("grid min-w-0 gap-1 py-2.5", desk(look, "text"))}>
        <label
          htmlFor={checkboxId}
          className={clsx(
            // Task titles a step lighter than other names (owner, 2026-11-25).
            "text-name font-medium break-words",
            desk(look, "title"),
            task.isDone && "text-ink-3 line-through",
          )}
        >
          {task.title}
        </label>
        <TaskTags task={task} look={look} />
        <TaskMeta task={task} showsStudent={showsStudent} look={look} />
      </div>
      <Due task={task} look={look} />
    </li>
  );
}

/** Tick or untick the Task, saying so in a toast. */
function useToggle(task: Task, onChanged: () => void) {
  const { showToast } = useToast();
  const { refresh: refreshCount } = useTaskCount();
  const [isBusy, setIsBusy] = useState(false);

  async function save(done: boolean): Promise<void> {
    setIsBusy(true);
    try {
      await setTaskDone(task.id, done);
      showToast(done ? TASK_TEXT.done : TASK_TEXT.reopened);
      onChanged();
      refreshCount();
    } catch (error) {
      const isRefused = error instanceof ApiRequestError && error.status === HTTP_STATUS.forbidden;
      showToast(isRefused ? TASK_TEXT.cantTick : updatingOr(error, TASK_TEXT.tickFailed));
    } finally {
      setIsBusy(false);
    }
  }

  return {
    isBusy,
    toggle: () => {
      void save(!task.isDone);
    },
  };
}

type Tag = { key: string; tone: ChipTone; icon: IconName; word: string };

const PRIORITY_TAGS: Partial<Record<TaskPriority, Tag>> = {
  [TaskPriority.High]: { key: "high", tone: "bad", icon: "arrowUp", word: TASK_TEXT.highPriority },
  [TaskPriority.Low]: { key: "low", tone: "muted", icon: "arrowDown", word: TASK_TEXT.lowPriority },
};
const ONLY_ME_TAG: Tag = { key: "only-me", tone: "muted", icon: "lock", word: TASK_TEXT.onlyMe };

/** High or Low priority and "Only me", each a word with a line icon (spec 77a, 77b). Normal
 * shows nothing, as most Tasks are. */
function TaskTags({ task, look }: { task: Task; look: TaskLook }) {
  const tags = [PRIORITY_TAGS[task.priority], task.isOnlyMe ? ONLY_ME_TAG : undefined].filter(
    (tag) => tag !== undefined,
  );
  if (tags.length === 0) return null;
  return (
    <p className={clsx("flex flex-wrap gap-2", desk(look, "tags"))}>
      {tags.map((tag) => (
        <Chip key={tag.key} tone={tag.tone} icon={tag.icon}>
          {tag.word}
        </Chip>
      ))}
    </p>
  );
}

/**
 * The Student it's about, who it's for (if not me), and who gave it (if not them or me). On a
 * phone only the Student stays; who it's for and from are dropped.
 */
function TaskMeta({
  task,
  showsStudent,
  look,
}: {
  task: Task;
  showsStudent: boolean;
  look: TaskLook;
}) {
  const { staff } = useCurrentStaff();
  const parts = metaParts(task, staff.id, showsStudent);
  if (parts.length === 0) return null;
  const hasStudent = showsStudent && task.student !== null;
  return (
    <p
      className={clsx(
        "text-secondary text-ink-2 flex flex-wrap items-center gap-x-4",
        desk(look, "meta"),
        !hasStudent && "max-phone:hidden",
      )}
    >
      {parts}
    </p>
  );
}

function metaParts(task: Task, myId: RecordId, showsStudent: boolean): ReactNode[] {
  const student = showsStudent ? task.student : null;
  const parts: ReactNode[] = [];
  if (student !== null) parts.push(<StudentLink key="student" student={student} />);
  if (task.assignee.id !== myId) {
    parts.push(
      <span key="for" className="max-phone:hidden desk:shrink-8 truncate">
        {TASK_TEXT.forPerson(task.assignee.name)}
      </span>,
    );
  }
  if (!isGivenBy(task, [task.assignee.id, myId])) {
    parts.push(
      <span key="from" className="max-phone:hidden desk:shrink-8 truncate">
        {TASK_TEXT.fromPerson(task.createdBy.name)}
      </span>,
    );
  }
  return parts;
}

/** Whether one of `ids` gave the Task. */
function isGivenBy(task: Task, ids: readonly RecordId[]): boolean {
  return ids.includes(task.createdBy.id);
}

function StudentLink({ student }: { student: { id: RecordId; name: string } }) {
  return (
    <Link
      href={ROUTES.student(student.id)}
      className="text-accent min-h-control inline-flex min-w-0 items-center font-semibold underline"
    >
      <span className="truncate">{student.name}</span>
    </Link>
  );
}

const DUE_CLASSES: Record<TaskTiming, string> = {
  overdue: "text-bad font-semibold",
  today: "text-warn font-semibold",
  upcoming: "text-ink-2",
  done: "text-ink-2",
};

/** "Overdue" (red), "Today" (amber) or the due date; a done Task shows the day it was done. */
function Due({ task, look }: { task: Task; look: TaskLook }) {
  const dates = useDates();
  return (
    <span
      data-task-due=""
      className={clsx(
        "text-secondary phone:col-start-3 phone:py-2.5 col-start-2 inline-flex items-center gap-1.5 pb-2.5 whitespace-nowrap",
        desk(look, "due"),
        DUE_CLASSES[task.timing],
      )}
    >
      <Icon name="clock" size="sm" />
      {dueText(task, dates.date)}
    </span>
  );
}

function dueText(task: Task, date: (iso: string) => string): string {
  if (task.timing === TaskTiming.Overdue) return TASK_TEXT.overdue;
  if (task.timing === TaskTiming.Today) return TASK_TEXT.today;
  const doneDay = task.doneAt === null ? null : localDayIso(task.doneAt);
  return doneDay === null ? date(task.dueOn) : TASK_TEXT.doneOn(date(doneDay));
}
