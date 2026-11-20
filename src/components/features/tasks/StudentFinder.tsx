"use client";

import type { RecordId } from "@/lib/recordId";
import { useEffect, useState } from "react";

import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { Stage } from "@/constants/stages";
import { TASK_TEXT } from "@/constants/tasks";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchStudents } from "@/lib/api";
import { NO_STUDENT_FILTERS } from "@/lib/students";

const SEARCH_DELAY_MS = 300;
const NO_STUDENT = "";

/** A Student a Task can be about, or one to put in a class. */
export type StudentChoice = { id: RecordId; name: string };

/** What the search box, the choice and its empty option are called. */
export type StudentFinderLabels = {
  search: string;
  placeholder: string;
  choice: string;
  none: string;
};

const TASK_LABELS: StudentFinderLabels = {
  search: TASK_TEXT.findStudent,
  placeholder: TASK_TEXT.findStudentPlaceholder,
  choice: TASK_TEXT.aboutStudent,
  none: TASK_TEXT.noStudent,
};

type StudentFinderProps = {
  value: StudentChoice | null;
  onChange: (student: StudentChoice | null) => void;
  errors?: readonly string[] | undefined;
  /** A Task's Student by default. */
  labels?: StudentFinderLabels;
  /** Whether a Student must be chosen (a class's) or may be left out (a Task's). */
  isRequired?: boolean;
  /** Leave Lost Students out of the matches, e.g. for a class they can't join. */
  excludesLost?: boolean;
};

/**
 * Pick a Student: type part of a name or phone, then choose from the matches. Only Students the
 * API finds can be chosen; the choice stays while searching again.
 */
export function StudentFinder({
  value,
  onChange,
  errors,
  labels = TASK_LABELS,
  isRequired = false,
  excludesLost,
}: StudentFinderProps) {
  const [search, setSearch] = useState("");
  const matches = useMatches(
    useDebouncedValue(search.trim(), SEARCH_DELAY_MS),
    excludesLost === true,
  );
  const choices = withChosen(value, matches);
  return (
    <div className="grid gap-5">
      <TextField
        label={labels.search}
        isOptional={!isRequired}
        name="studentSearch"
        type="search"
        placeholder={labels.placeholder}
        value={search}
        onChange={setSearch}
      />
      <SelectField
        label={labels.choice}
        isOptional={!isRequired}
        name="student"
        options={[
          { value: NO_STUDENT, label: labels.none },
          ...choices.map((student) => ({ value: student.id, label: student.name })),
        ]}
        value={value === null ? NO_STUDENT : value.id}
        onChange={(id) => {
          onChange(choices.find((student) => student.id === id) ?? null);
        }}
        errors={errors}
      />
    </div>
  );
}

/** The matches, with the chosen Student first when a newer search no longer finds them. */
function withChosen(value: StudentChoice | null, matches: StudentChoice[]): StudentChoice[] {
  if (value === null || matches.some((student) => student.id === value.id)) return matches;
  return [value, ...matches];
}

/** The first page of Students matching `search`; none until something is typed. */
function useMatches(search: string, excludesLost: boolean): StudentChoice[] {
  const [found, setFound] = useState<{ search: string; students: StudentChoice[] }>({
    search: "",
    students: [],
  });

  useEffect(() => {
    if (search === "") return undefined;
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const page = await fetchStudents({ ...NO_STUDENT_FILTERS, search }, 1);
        const students = page.students
          .filter((student) => !excludesLost || student.stage !== Stage.Lost)
          .map(({ id, name }) => ({ id, name }));
        if (!isCancelled) setFound({ search, students });
      } catch {
        if (!isCancelled) setFound({ search, students: [] });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [search, excludesLost]);

  return search === "" || found.search !== search ? [] : found.students;
}
