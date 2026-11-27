"use client";

import type { RecordId } from "@/lib/recordId";
import { useId, useState, type SubmitEvent } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { useTaskCount } from "@/components/features/shell/taskCount";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { Banner } from "@/components/ui/Banner";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { DateField } from "@/components/ui/DateField";
import { LABEL_CLASSES } from "@/components/ui/Field";
import { DetailList } from "@/components/ui/DetailList";
import { SegmentedChoice } from "@/components/ui/SegmentedChoice";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { MESSAGES } from "@/constants/messages";
import { ROLE_LABELS, Role } from "@/constants/roles";
import { TASK_PRIORITIES, TASK_TEXT, TaskPriority } from "@/constants/tasks";
import { createTask, type Task } from "@/lib/api";
import { todayIso } from "@/lib/dates";

import { StudentFinder, type StudentChoice } from "./StudentFinder";
import { useTaskAssignees, type AssigneesState } from "./useTaskAssignees";

type NewTaskDialogProps = {
  /** Opened from a Student's profile: the Task is about them, and goes to their counsellor. */
  student?: { id: RecordId; name: string; counsellorId: RecordId | null };
  onClose: () => void;
  onCreated: (task: Task) => void;
};

const PRIORITY_OPTIONS = TASK_PRIORITIES.map((priority) => ({
  value: priority,
  label: TASK_TEXT.priorityLabels[priority],
}));

/**
 * Create a Task for anyone in the office, optionally about a Student, with a priority (spec
 * 77-78, 77a). A Task I give myself can be "Only me" (77b): then it's for me and about no Student,
 * so those two choices step aside. Not offered from a profile (the Task is about that Student) or
 * to a Platform Admin, who has no Tasks of their own in the office.
 */
export function NewTaskDialog({ student, onClose, onCreated }: NewTaskDialogProps) {
  const formId = useId();
  const { staff, supportAccess } = useCurrentStaff();
  const dates = useDates();
  const { showToast } = useToast();
  const assignees = useTaskAssignees();
  const { refresh: refreshCount } = useTaskCount();
  const [dueOn, setDueOn] = useState(tomorrowIso);
  const choices = useTaskChoices(student, staff.id);
  const { isSaving, fieldErrors, failure, save } = useFormSave(taskFailure);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save(async () => {
      const task = await createTask({
        title: readField(form, "title"),
        dueOn,
        ...choices.chosen(),
      });
      const isMine = task.assignee.id === staff.id;
      showToast(isMine ? TASK_TEXT.created : TASK_TEXT.givenTo(task.assignee.name));
      refreshCount();
      onCreated(task);
    });
  }

  return (
    <SaveDialog
      title={TASK_TEXT.dialogTitle}
      formId={formId}
      saveLabel={TASK_TEXT.create}
      saveIcon="plus"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-5">
        <TextField
          label={TASK_TEXT.whatNeedsDoing}
          name="title"
          placeholder={TASK_TEXT.titlePlaceholder}
          errors={fieldErrors.title}
        />
        <div className="tablet:grid-cols-2 grid gap-5">
          <DateField
            label={TASK_TEXT.due}
            name="dueOn"
            display={dates.display}
            min={todayIso()}
            value={dueOn}
            onChange={setDueOn}
            errors={fieldErrors.dueOn}
          />
          <WhoFor choices={choices} assignees={assignees} errors={fieldErrors.assigneeId} />
        </div>
        {!choices.isOnlyMe && (
          <AboutStudent
            fixed={student}
            isTeacher={staff.role === Role.Teacher}
            value={choices.about}
            onChange={choices.setAbout}
            errors={fieldErrors.studentId}
          />
        )}
        <PriorityChoice value={choices.priority} onChange={choices.setPriority} />
        {student === undefined && supportAccess === null && (
          <CheckboxField
            label={TASK_TEXT.onlyMeChoice}
            name="onlyMe"
            isChecked={choices.isOnlyMe}
            onChange={choices.setIsOnlyMe}
          />
        )}
      </form>
    </SaveDialog>
  );
}

type TaskChoices = ReturnType<typeof useTaskChoices>;

/** Who it's for, which Student, its priority and whether it's "Only me". */
function useTaskChoices(student: NewTaskDialogProps["student"], myId: RecordId) {
  const [assigneeId, setAssigneeId] = useState(student?.counsellorId ?? myId);
  const [about, setAbout] = useState<StudentChoice | null>(student ?? null);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Normal);
  const [isOnlyMe, setIsOnlyMe] = useState(false);
  return {
    assigneeId,
    setAssigneeId,
    about,
    setAbout,
    priority,
    setPriority,
    isOnlyMe,
    setIsOnlyMe,
    /** What to send: an "Only me" Task is for me and about no Student, whatever was picked. */
    chosen: () => ({
      assigneeId: isOnlyMe ? myId : assigneeId,
      studentId: isOnlyMe ? null : (about?.id ?? null),
      priority,
      isOnlyMe,
    }),
  };
}

type WhoForProps = {
  choices: TaskChoices;
  assignees: AssigneesState;
  errors?: readonly string[] | undefined;
};

/** "Assign to": the list, or "You" for an "Only me" Task. */
function WhoFor({ choices, assignees, errors }: WhoForProps) {
  if (choices.isOnlyMe) {
    return (
      <div className="grid content-start gap-2">
        <span className={LABEL_CLASSES}>{TASK_TEXT.assignTo}</span>
        <span className="min-h-control text-body text-ink flex items-center">{TASK_TEXT.you}</span>
      </div>
    );
  }
  return (
    <AssigneeField
      assignees={assignees}
      value={choices.assigneeId}
      onChange={choices.setAssigneeId}
      errors={errors}
    />
  );
}

type PriorityChoiceProps = { value: TaskPriority; onChange: (value: TaskPriority) => void };

/** High, Normal or Low, as the prototype's segmented choice under a visible "Priority". */
function PriorityChoice({ value, onChange }: PriorityChoiceProps) {
  return (
    <div className="grid gap-2">
      <span aria-hidden="true" className={LABEL_CLASSES}>
        {TASK_TEXT.priority}
      </span>
      <SegmentedChoice
        label={TASK_TEXT.priority}
        name="priority"
        options={PRIORITY_OPTIONS}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

type AssigneeFieldProps = {
  assignees: AssigneesState;
  value: string;
  onChange: (value: string) => void;
  errors?: readonly string[] | undefined;
};

/** "Assign to": every active Staff member with their Role, or why the list didn't load. */
function AssigneeField({ assignees, value, onChange, errors }: AssigneeFieldProps) {
  if (assignees.status === "failed") {
    return <Banner tone="problem">{TASK_TEXT.assigneesFailed}</Banner>;
  }
  if (assignees.status === "loading") return null;
  return (
    <SelectField
      label={TASK_TEXT.assignTo}
      name="assignee"
      options={assignees.people.map((person) => ({
        value: person.id,
        label: TASK_TEXT.personWithRole(person.name, ROLE_LABELS[person.role]),
      }))}
      value={value}
      onChange={onChange}
      errors={errors}
    />
  );
}

type AboutStudentProps = {
  fixed: NewTaskDialogProps["student"];
  isTeacher: boolean;
  value: StudentChoice | null;
  onChange: (student: StudentChoice | null) => void;
  errors?: readonly string[] | undefined;
};

/** The Student it's about: fixed from a profile, chosen otherwise, never for Teachers. */
function AboutStudent({ fixed, isTeacher, value, onChange, errors }: AboutStudentProps) {
  if (fixed !== undefined) {
    return <DetailList items={[{ label: TASK_TEXT.about, value: fixed.name }]} />;
  }
  if (isTeacher) return null;
  return <StudentFinder value={value} onChange={onChange} errors={errors} />;
}

/** Tomorrow in the browser's own calendar day, where a new Task is due by default. */
function tomorrowIso(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return todayIso(tomorrow);
}

/** Why a Task wasn't created, when it wasn't about the fields (the form never links a Student
 * for a Teacher, so a refusal means something changed meanwhile). */
function taskFailure(): string {
  return MESSAGES.saveFailed;
}
