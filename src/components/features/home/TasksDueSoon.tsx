"use client";

import Link from "next/link";
import { useState } from "react";

import { TaskList } from "@/components/features/tasks/TaskList";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Loading";
import { HOME_TEXT, TASKS_SHOWN } from "@/constants/home";
import { ROUTES } from "@/constants/routes";
import { TaskView } from "@/constants/tasks";
import { fetchMyTasks, type Task } from "@/lib/api";
import { todayIso } from "@/lib/dates";
import { groupTasksByWhen, lastDueSoonDay, tasksDueSoon } from "@/lib/home";

import { useLoaded, type Loaded } from "./useLoaded";

type TasksDueSoonProps = {
  /** Teachers see them grouped Overdue, Today, Next two days; everyone else as one list. */
  isGrouped: boolean;
};

// Only "To do" Tasks due by the last day shown, in the server's order: overdue first, then by
// priority, then by due date (spec 79a). The office's own day decides overdue and today.
async function loadDueSoon(): Promise<Task[]> {
  const today = todayIso();
  const page = await fetchMyTasks(TaskView.Mine, 1, { dueBy: lastDueSoonDay(today) });
  return tasksDueSoon(page.tasks, today);
}

/** My open tasks overdue, due today or in the next two days (spec 22a, 79). */
export function TasksDueSoon({ isGrouped }: TasksDueSoonProps) {
  const [version, setVersion] = useState(0);
  const state = useLoaded(loadDueSoon, version);
  const reload = () => {
    setVersion((current) => current + 1);
  };

  return (
    <Section
      title={HOME_TEXT.tasksDueSoon}
      aside={
        <Link href={ROUTES.tasks} className="min-h-control inline-flex items-center">
          {HOME_TEXT.seeAllTasks}
        </Link>
      }
    >
      <TasksBody state={state} isGrouped={isGrouped} onChanged={reload} />
    </Section>
  );
}

type TasksBodyProps = { state: Loaded<Task[]>; isGrouped: boolean; onChanged: () => void };

function TasksBody({ state, isGrouped, onChanged }: TasksBodyProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") return <Banner tone="problem">{HOME_TEXT.tasksFailed}</Banner>;
  if (state.data.length === 0) {
    return (
      <Panel>
        <EmptyState>{HOME_TEXT.nothingDueSoon}</EmptyState>
      </Panel>
    );
  }
  if (isGrouped) return <TaskGroups tasks={state.data} onChanged={onChanged} />;
  return (
    <Panel>
      <TaskList tasks={state.data.slice(0, TASKS_SHOWN)} showsStudent onChanged={onChanged} />
    </Panel>
  );
}

function TaskGroups({ tasks, onChanged }: { tasks: Task[]; onChanged: () => void }) {
  return (
    <div className="grid gap-6">
      {groupTasksByWhen(tasks).map((group) => (
        <div key={group.when} className="grid gap-3">
          <h3 className="text-body text-ink-2 font-semibold">
            {HOME_TEXT.groupTitle(HOME_TEXT.whenLabels[group.when], group.tasks.length)}
          </h3>
          <Panel>
            <TaskList tasks={group.tasks} showsStudent onChanged={onChanged} />
          </Panel>
        </div>
      ))}
    </div>
  );
}
