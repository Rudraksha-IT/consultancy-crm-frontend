"use client";

import type { RecordId } from "@/lib/recordId";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { TASK_TEXT } from "@/constants/tasks";

import { NewTaskDialog } from "./NewTaskDialog";
import { TaskPanelBody } from "./TasksPage";
import { useTaskPage } from "./useTaskPage";

type StudentTasksProps = {
  student: { id: RecordId; name: string; counsellorId: RecordId | null };
  /** A Task was added or ticked, so the tab's count can change. */
  onChanged: () => void;
};

/** A Student's open Tasks, on their profile's Tasks tab (spec 82). */
export function StudentTasks({ student, onChanged }: StudentTasksProps) {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const state = useTaskPage({ studentId: student.id }, page, version);
  const reload = () => {
    setVersion((current) => current + 1);
    onChanged();
  };

  return (
    <Section
      title={TASK_TEXT.openTasks}
      aside={
        <Button
          icon="plus"
          onClick={() => {
            setIsCreating(true);
          }}
        >
          {TASK_TEXT.addTask}
        </Button>
      }
    >
      <Panel>
        <TaskPanelBody
          state={state}
          emptyText={TASK_TEXT.nothingOpen}
          showsStudent={false}
          onPage={setPage}
          onChanged={reload}
        />
      </Panel>
      {isCreating && (
        <NewTaskDialog
          student={student}
          onClose={() => {
            setIsCreating(false);
          }}
          onCreated={() => {
            setIsCreating(false);
            reload();
          }}
        />
      )}
    </Section>
  );
}
