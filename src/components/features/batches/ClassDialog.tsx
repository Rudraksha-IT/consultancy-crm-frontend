"use client";

import Link from "next/link";
import { useState, type SubmitEvent } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { StudentFinder, type StudentChoice } from "@/components/features/tasks/StudentFinder";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { useToast } from "@/components/ui/useToast";
import { BATCH_TEXT } from "@/constants/batches";
import { MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import {
  addStudentToBatch,
  InvalidFieldsError,
  removeStudentFromBatch,
  type Batch,
  type BatchMember,
  type BatchWithStudents,
} from "@/lib/api";

import { ADD_LABELS } from "./finderLabels";
import { useBatch, type Loaded } from "./useBatchData";

type ClassDialogProps = {
  /** The class as the list showed it; its Students are loaded when the dialog opens. */
  batch: Batch;
  onClose: () => void;
  /** Who is in it changed, so lists should load again. */
  onChanged: () => void;
};

/** Who is in a class, with adding and removing Students for Admins and Counsellors (spec 84). */
export function ClassDialog({ batch, onClose, onChanged }: ClassDialogProps) {
  const [version, setVersion] = useState(0);
  const state = useBatch(batch.id, version);
  const loaded = state.status === "loaded" ? state.data : null;
  const changed = () => {
    setVersion((current) => current + 1);
    onChanged();
  };

  return (
    <Dialog
      isOpen
      isWide
      title={loaded?.name ?? batch.name}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          {BATCH_TEXT.done}
        </Button>
      }
    >
      <ClassDialogBody state={state} onChanged={changed} />
    </Dialog>
  );
}

type BodyProps = { state: Loaded<BatchWithStudents>; onChanged: () => void };

function ClassDialogBody({ state, onChanged }: BodyProps) {
  if (state.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (state.status !== "loaded") return <Banner tone="problem">{BATCH_TEXT.classFailed}</Banner>;
  const batch = state.data;
  return (
    <>
      <ClassFacts batch={batch} />
      <Members batch={batch} onChanged={onChanged} />
      {batch.canChange && <AddStudent batch={batch} onAdded={onChanged} />}
    </>
  );
}

function ClassFacts({ batch }: { batch: Batch }) {
  const dates = useDates();
  return (
    <div className="text-secondary text-ink-2 flex flex-wrap gap-x-5 gap-y-1">
      <span className="inline-flex items-center gap-2">
        <Icon name="clock" size="sm" />
        {batch.timeSlot}
      </span>
      <span className="inline-flex items-center gap-2">
        <Icon name="badge" size="sm" />
        {batch.teacher.name}
      </span>
      <span>{BATCH_TEXT.dates(dates.date(batch.startsOn), dates.date(batch.endsOn))}</span>
    </div>
  );
}

type MembersProps = { batch: BatchWithStudents; onChanged: () => void };

/** The class's Students, each with their attendance; a Teacher sees names only, without links. */
function Members({ batch, onChanged }: MembersProps) {
  const { staff } = useCurrentStaff();
  const { showToast } = useToast();
  const [removing, setRemoving] = useState<BatchMember | null>(null);
  const linksStudents = staff.role !== Role.Teacher;

  async function remove(member: BatchMember): Promise<void> {
    await removeStudentFromBatch(batch.id, member.id);
    setRemoving(null);
    showToast(BATCH_TEXT.removed);
    onChanged();
  }

  return (
    <>
      <Panel>
        {batch.students.length === 0 ? (
          <EmptyState>{BATCH_TEXT.nobodyInClass}</EmptyState>
        ) : (
          <RowList label={BATCH_TEXT.student}>
            {batch.students.map((member) => (
              <RowItem
                key={member.id}
                title={
                  linksStudents ? (
                    <Link
                      href={ROUTES.student(member.id)}
                      className="text-accent min-h-control inline-flex items-center hover:underline"
                    >
                      {member.name}
                    </Link>
                  ) : (
                    member.name
                  )
                }
                meta={
                  member.attendedPercent === null
                    ? BATCH_TEXT.noAttendance
                    : BATCH_TEXT.attended(member.attendedPercent)
                }
                right={
                  batch.canChange && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRemoving(member);
                      }}
                    >
                      {BATCH_TEXT.remove}{" "}
                      <span className="sr-only">{BATCH_TEXT.removeStudent(member.name)}</span>
                    </Button>
                  )
                }
              />
            ))}
          </RowList>
        )}
      </Panel>
      {removing !== null && (
        <ConfirmDialog
          title={BATCH_TEXT.removeTitle(removing.name, batch.name)}
          actionLabel={BATCH_TEXT.remove}
          onClose={() => {
            setRemoving(null);
          }}
          onConfirm={() => remove(removing)}
          failureOf={() => BATCH_TEXT.removeFailed}
        >
          {BATCH_TEXT.removeBody}
        </ConfirmDialog>
      )}
    </>
  );
}

type AddStudentProps = { batch: BatchWithStudents; onAdded: () => void };

/** Find a Student and add them to the class. */
function AddStudent({ batch, onAdded }: AddStudentProps) {
  const { showToast } = useToast();
  const [student, setStudent] = useState<StudentChoice | null>(null);
  const [errors, setErrors] = useState<readonly string[] | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (student === null) {
      setErrors([BATCH_TEXT.chooseStudentFirst]);
      return;
    }
    setIsSaving(true);
    setErrors(undefined);
    try {
      await addStudentToBatch(batch.id, student.id);
      showToast(BATCH_TEXT.added(student.name, batch.name));
      setStudent(null);
      onAdded();
    } catch (error) {
      setErrors(
        error instanceof InvalidFieldsError && error.fieldErrors.studentId !== undefined
          ? error.fieldErrors.studentId
          : [MESSAGES.saveFailed],
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <StudentFinder
        value={student}
        onChange={setStudent}
        errors={errors}
        labels={ADD_LABELS}
        isRequired
        excludesLost
      />
      <div>
        <Button type="submit" icon="plus" isLoading={isSaving} loadingLabel={MESSAGES.loading}>
          {BATCH_TEXT.addToClass}
        </Button>
      </div>
    </form>
  );
}
