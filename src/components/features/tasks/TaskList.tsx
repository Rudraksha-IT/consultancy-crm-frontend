"use client";

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
};

/** Tasks as rows: a tick box, the title, who and what it's about, and when it's due (spec 79). */
export function TaskList({ tasks, showsStudent, onChanged }: TaskListProps) {
  return (
    <ul className="divide-rule divide-y">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} showsStudent={showsStudent} onChanged={onChanged} />
      ))}
    </ul>
  );
}

type TaskRowProps = { task: Task; showsStudent: boolean; onChanged: () => void };

function TaskRow({ task, showsStudent, onChanged }: TaskRowProps) {
  const checkboxId = useId();
  const { isBusy, toggle } = useToggle(task, onChanged);
  return (
    <li
      className={clsx(
        "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 py-2 pr-6 pl-3",
        "phone:grid-cols-[auto_minmax(0,1fr)_auto]",
        task.timing === TaskTiming.Overdue && "bg-bad-tint",
      )}
    >
      {/* The whole 44px square ticks it, not only the small box. */}
      <label htmlFor={checkboxId} className="size-control grid cursor-pointer place-items-center">
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
      <div className="grid min-w-0 gap-1 py-2.5">
        <label
          htmlFor={checkboxId}
          className={clsx(
            "text-body font-semibold break-words",
            task.isDone && "text-ink-3 line-through",
          )}
        >
          {task.title}
        </label>
        <TaskTags task={task} />
        <TaskMeta task={task} showsStudent={showsStudent} />
      </div>
      <Due task={task} />
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
function TaskTags({ task }: { task: Task }) {
  const tags = [PRIORITY_TAGS[task.priority], task.isOnlyMe ? ONLY_ME_TAG : undefined].filter(
    (tag) => tag !== undefined,
  );
  if (tags.length === 0) return null;
  return (
    <p className="flex flex-wrap gap-2">
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
function TaskMeta({ task, showsStudent }: { task: Task; showsStudent: boolean }) {
  const { staff } = useCurrentStaff();
  const parts = metaParts(task, staff.id, showsStudent);
  if (parts.length === 0) return null;
  const hasStudent = showsStudent && task.student !== null;
  return (
    <p
      className={clsx(
        "text-secondary text-ink-2 flex flex-wrap items-center gap-x-4",
        !hasStudent && "max-phone:hidden",
      )}
    >
      {parts}
    </p>
  );
}

function metaParts(task: Task, myId: number, showsStudent: boolean): ReactNode[] {
  const student = showsStudent ? task.student : null;
  const parts: ReactNode[] = [];
  if (student !== null) parts.push(<StudentLink key="student" student={student} />);
  if (task.assignee.id !== myId) {
    parts.push(
      <span key="for" className="max-phone:hidden">
        {TASK_TEXT.forPerson(task.assignee.name)}
      </span>,
    );
  }
  if (!isGivenBy(task, [task.assignee.id, myId])) {
    parts.push(
      <span key="from" className="max-phone:hidden">
        {TASK_TEXT.fromPerson(task.createdBy.name)}
      </span>,
    );
  }
  return parts;
}

/** Whether one of `ids` gave the Task. */
function isGivenBy(task: Task, ids: readonly number[]): boolean {
  return ids.includes(task.createdBy.id);
}

function StudentLink({ student }: { student: { id: number; name: string } }) {
  return (
    <Link
      href={ROUTES.student(student.id)}
      className="text-accent min-h-control inline-flex items-center font-semibold underline"
    >
      {student.name}
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
function Due({ task }: { task: Task }) {
  const dates = useDates();
  return (
    <span
      className={clsx(
        "text-secondary phone:col-start-3 phone:py-2.5 col-start-2 inline-flex items-center gap-1.5 pb-2.5 whitespace-nowrap",
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
