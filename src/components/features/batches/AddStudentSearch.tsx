"use client";

import type { RecordId } from "@/lib/recordId";
import { useState } from "react";

import { useStudentMatches, type StudentChoice } from "@/components/features/tasks/StudentFinder";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { BATCH_TEXT } from "@/constants/batches";
import { MESSAGES } from "@/constants/messages";
import { addStudentToBatch, InvalidFieldsError, type BatchWithStudents } from "@/lib/api";

type AddStudentSearchProps = { batch: BatchWithStudents; onAdded: () => void };

/**
 * Type a name or phone; the matching Students are listed under the box, each with its own Add
 * button. Lost Students and those already in the class aren't listed.
 */
export function AddStudentSearch({ batch, onAdded }: AddStudentSearchProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<RecordId | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const matches = useStudentMatches(search, true);
  const inClass = new Set(batch.students.map((member) => member.id));
  const addable = matches?.filter((student) => !inClass.has(student.id)) ?? null;

  async function add(student: StudentChoice): Promise<void> {
    setAdding(student.id);
    setProblem(null);
    try {
      await addStudentToBatch(batch.id, student.id);
      showToast(BATCH_TEXT.added(student.name, batch.name));
      onAdded();
    } catch (error) {
      setProblem(refusalOf(error));
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="grid gap-3">
      <TextField
        label={BATCH_TEXT.findStudent}
        name="studentSearch"
        type="search"
        placeholder={BATCH_TEXT.findStudentPlaceholder}
        value={search}
        onChange={(value) => {
          setSearch(value);
          setProblem(null);
        }}
      />
      {problem !== null && <Banner tone="problem">{problem}</Banner>}
      <Matches
        students={addable}
        adding={adding}
        onAdd={(student) => {
          void add(student);
        }}
      />
    </div>
  );
}

type MatchesProps = {
  students: StudentChoice[] | null;
  adding: RecordId | null;
  onAdd: (student: StudentChoice) => void;
};

/** Nothing before a search has answered; "no match", or a row per Student with Add beside. */
function Matches({ students, adding, onAdd }: MatchesProps) {
  if (students === null) return null;
  if (students.length === 0) return <EmptyState>{BATCH_TEXT.noMatches}</EmptyState>;
  return (
    <RowList label={BATCH_TEXT.findStudent}>
      {students.map((student) => (
        <RowItem
          key={student.id}
          title={student.name}
          keepsRightBesideOnPhone
          right={
            <Button
              size="sm"
              icon="plus"
              isLoading={adding === student.id}
              loadingLabel={MESSAGES.loading}
              isDisabled={adding !== null && adding !== student.id}
              onClick={() => {
                onAdd(student);
              }}
            >
              {BATCH_TEXT.add}{" "}
              <span className="sr-only">{BATCH_TEXT.addStudent(student.name)}</span>
            </Button>
          }
        />
      ))}
    </RowList>
  );
}

/** The server's reason for refusing the Student, or the usual "couldn't save". */
function refusalOf(error: unknown): string {
  const reasons = error instanceof InvalidFieldsError ? error.fieldErrors.studentId : undefined;
  return reasons === undefined ? MESSAGES.saveFailed : reasons.join(" ");
}
