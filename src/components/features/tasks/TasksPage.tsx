"use client";

import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Loading } from "@/components/ui/Loading";
import {
  TASK_PRIORITIES,
  TASK_TEXT,
  TASK_VIEWS,
  TaskView,
  type TaskPriority,
} from "@/constants/tasks";

import { NewTaskDialog } from "./NewTaskDialog";
import { TaskList } from "./TaskList";
import { useTaskPage, type TaskPageState } from "./useTaskPage";

const VIEW_OPTIONS = TASK_VIEWS.map((view) => ({ value: view, label: TASK_TEXT.viewLabels[view] }));
const ANY_PRIORITY = "";
const PRIORITY_OPTIONS = [
  { value: ANY_PRIORITY, label: TASK_TEXT.anyPriority },
  ...TASK_PRIORITIES.map((priority) => ({
    value: priority,
    label: TASK_TEXT.priorityLabels[priority],
  })),
];

function priorityFrom(value: string): TaskPriority | undefined {
  return TASK_PRIORITIES.find((priority) => priority === value);
}

function emptyTextFor(view: TaskView, priority: TaskPriority | undefined): string {
  if (priority !== undefined) return TASK_TEXT.emptyFiltered;
  return view === TaskView.Mine ? TASK_TEXT.emptyMine : TASK_TEXT.emptyOther;
}

/** My Tasks, for every Role (spec 77-81): to do, given to others, and done, by priority. */
export function TasksPage() {
  const [view, setView] = useState<TaskView>(TaskView.Mine);
  const [priority, setPriority] = useState<TaskPriority | undefined>(undefined);
  const [page, setPage] = useState(1);
  // Bumped after a Task is created or ticked, so the list loads again.
  const [version, setVersion] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const state = useTaskPage({ view, priority }, page, version);
  const reload = () => {
    setVersion((current) => current + 1);
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        title={TASK_TEXT.title}
        subtitle={TASK_TEXT.intro}
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              setIsCreating(true);
            }}
          >
            {TASK_TEXT.newTask}
          </Button>
        }
      />
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SegmentedControl
            label={TASK_TEXT.whichTasks}
            options={VIEW_OPTIONS}
            value={view}
            onChange={(chosen) => {
              setView(chosen);
              setPage(1);
            }}
          />
          <FilterSelect
            label={TASK_TEXT.priority}
            isLabelShown
            value={priority ?? ANY_PRIORITY}
            options={PRIORITY_OPTIONS}
            onChange={(chosen) => {
              setPriority(priorityFrom(chosen));
              setPage(1);
            }}
          />
        </div>
        <Panel>
          <TaskPanelBody
            state={state}
            emptyText={emptyTextFor(view, priority)}
            showsStudent
            onPage={setPage}
            onChanged={reload}
          />
        </Panel>
      </div>
      {isCreating && (
        <NewTaskDialog
          onClose={() => {
            setIsCreating(false);
          }}
          onCreated={() => {
            setIsCreating(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

type TaskPanelBodyProps = {
  state: TaskPageState;
  emptyText: string;
  showsStudent: boolean;
  onPage: (page: number) => void;
  onChanged: () => void;
};

/** A panel's Tasks: loading, a failure, nothing, or the rows and the pager. */
export function TaskPanelBody({
  state,
  emptyText,
  showsStudent,
  onPage,
  onChanged,
}: TaskPanelBodyProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") {
    return (
      <div className="px-gutter py-5">
        <Banner tone="problem">{TASK_TEXT.listFailed}</Banner>
      </div>
    );
  }
  const { page } = state;
  if (page.count === 0) return <EmptyState>{emptyText}</EmptyState>;
  return (
    <>
      <TaskList tasks={page.tasks} showsStudent={showsStudent} onChanged={onChanged} />
      <Pager
        summary={TASK_TEXT.tasksCount(page.count)}
        count={page.count}
        page={page.page}
        pageSize={page.pageSize}
        onPage={onPage}
      />
    </>
  );
}
