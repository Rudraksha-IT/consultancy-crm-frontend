"use client";

import clsx from "clsx";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import type { CourseEditField } from "@/lib/api";
import { canDelete, type CourseDraft } from "@/lib/catalogue";

import { ArchiveToggle } from "./ArchiveToggle";
import { IntakePicker } from "./IntakePicker";
import { COURSE_LEVEL_OPTIONS } from "./options";
import { RequiredDocuments } from "./RequiredDocuments";
import type { OptionalTypesState } from "./useOptionalDocumentTypes";

export type CourseRowErrors = Partial<Record<CourseEditField, string[]>>;

type CourseEditRowProps = {
  course: CourseDraft;
  types: OptionalTypesState;
  errors: CourseRowErrors;
  onChange: (change: Partial<CourseDraft>) => void;
  /** Ask, then mark it to be deleted on Save. */
  onAskDelete: () => void;
  /** Take a new Course off the page. */
  onRemoveNew: () => void;
};

/**
 * One Course on a University's edit page: name, level, Intakes on the month grid, Required
 * documents, and Archive or Restore; once saved as archived also Delete, unless an Application
 * uses it (issue 92).
 */
export function CourseEditRow(props: CourseEditRowProps) {
  const { course, types, errors, onChange } = props;
  return (
    <li
      aria-label={course.name.trim() || CATALOGUE_TEXT.newCourse}
      className={clsx(
        "rounded-control grid min-w-0 gap-5 border p-4",
        course.isDeleted ? "border-bad bg-fill" : "border-rule",
      )}
    >
      {/* A Course marked deleted can't be changed until Undo, which stays outside. */}
      <fieldset
        disabled={course.isDeleted}
        className={clsx("grid min-w-0 gap-5", course.isDeleted && "opacity-40")}
      >
        <div className="tablet:grid-cols-2 grid gap-5">
          <TextField
            label={CATALOGUE_TEXT.courseName}
            name={`${course.key}-name`}
            autoComplete="off"
            value={course.name}
            onChange={(name) => {
              onChange({ name });
            }}
            errors={errors.name}
          />
          <SelectField
            label={CATALOGUE_TEXT.level}
            name={`${course.key}-level`}
            options={COURSE_LEVEL_OPTIONS}
            value={course.level}
            onChange={(level) => {
              onChange({ level });
            }}
            errors={errors.level}
          />
        </div>
        <IntakePicker
          label={CATALOGUE_TEXT.intakes}
          intakes={course.intakes}
          onChange={(intakes) => {
            onChange({ intakes });
          }}
          isDisabled={course.isDeleted}
          errors={errors.intakes}
        />
        <RequiredDocuments
          name={`${course.key}-documents`}
          types={types}
          ticked={course.documents}
          onChange={(documents) => {
            onChange({ documents });
          }}
          errors={errors.documents}
        />
      </fieldset>
      {course.id === null ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={props.onRemoveNew}>
            {CATALOGUE_TEXT.removeNewCourse}
          </Button>
        </div>
      ) : (
        <StoredCourseActions {...props} />
      )}
    </li>
  );
}

/** What it is (archived, or to be deleted) and Archive or Restore, and Delete. */
function StoredCourseActions({ course, onChange, onAskDelete }: CourseEditRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <CourseNote course={course} />
      <span className="flex flex-wrap items-center gap-3">
        {!course.isDeleted && (
          <ArchiveToggle
            isArchived={course.archived}
            words={COURSE_WORDS}
            onToggle={() => {
              onChange({ archived: !course.archived });
            }}
          />
        )}
        {course.savedArchived && (
          <DeleteCourse course={course} onChange={onChange} onAskDelete={onAskDelete} />
        )}
      </span>
    </div>
  );
}

const COURSE_WORDS = {
  archive: CATALOGUE_TEXT.archiveCourse,
  restore: CATALOGUE_TEXT.restoreCourse,
};

function CourseNote({ course }: { course: CourseDraft }) {
  if (course.isDeleted) {
    return <span className="text-small text-bad">{CATALOGUE_TEXT.willBeDeleted}</span>;
  }
  if (!course.archived) return <span />;
  return (
    <span className="text-small text-ink-2 flex flex-wrap items-center gap-2">
      <Chip hasDot={false}>{CATALOGUE_TEXT.archived}</Chip>
      {CATALOGUE_TEXT.courseArchivedNote}
    </span>
  );
}

type DeleteCourseProps = Pick<CourseEditRowProps, "course" | "onChange" | "onAskDelete">;

/**
 * Delete (asking first), Undo once marked, or disabled with why: it keeps Course Files, or an
 * Application uses it.
 */
function DeleteCourse({ course, onChange, onAskDelete }: DeleteCourseProps) {
  if (course.isDeleted) {
    return (
      <Button
        size="sm"
        icon="restore"
        onClick={() => {
          onChange({ isDeleted: false });
        }}
      >
        {CATALOGUE_TEXT.undo}
      </Button>
    );
  }
  if (!canDelete(course)) {
    return (
      <>
        <Button variant="ghost" size="sm" icon="trash" isDisabled>
          {CATALOGUE_TEXT.deleteCourse}
        </Button>
        <span className="text-small text-ink-2">
          {course.fileCount > 0
            ? CATALOGUE_TEXT.keepsFiles(course.fileCount)
            : CATALOGUE_TEXT.usedBy(course.applications)}
        </span>
      </>
    );
  }
  return (
    <Button variant="danger" size="sm" icon="trash" onClick={onAskDelete}>
      {CATALOGUE_TEXT.deleteCourse}
    </Button>
  );
}
