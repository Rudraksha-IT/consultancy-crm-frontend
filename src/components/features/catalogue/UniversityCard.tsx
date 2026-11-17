import clsx from "clsx";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Chip } from "@/components/ui/Chip";
import { DataCell, DataRow, DataTable } from "@/components/ui/DataTable";
import { Panel } from "@/components/ui/Panel";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { ROUTES } from "@/constants/routes";
import type { Course, University } from "@/lib/api";

import { IntakeChips } from "./IntakePicker";
import { countryLabel, levelLabel } from "./options";

export type CardActions = {
  onAddCourse: (university: University) => void;
  onAddIntake: (course: Course) => void;
  onRemoveIntake: (course: Course, intake: string) => void;
};

type UniversityCardProps = CardActions & { university: University };

const HEAD = "text-small text-ink-2 bg-fill px-4 py-3 text-left font-semibold";
const CELL = "border-rule border-t px-4 py-3 align-middle";

/**
 * One University as a card with all its Courses in a table, never folded away: Course, level,
 * Intakes as chips (with × and "Add intake") and Required documents (issue 92). The card has
 * only Edit; archiving is on the edit page.
 */
export function UniversityCard({ university, ...actions }: UniversityCardProps) {
  const country = countryLabel(university.country);
  return (
    <section aria-labelledby={`university-${String(university.id)}`} className="min-w-0">
      <Panel>
        <header className="border-rule flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b px-6 py-4">
          <div className="grid min-w-0 gap-1">
            <h2
              id={`university-${String(university.id)}`}
              className="text-section-title text-ink flex flex-wrap items-center gap-2 break-words"
            >
              {university.name}
              {university.archived && <Chip hasDot={false}>{CATALOGUE_TEXT.archived}</Chip>}
            </h2>
            <p className="text-secondary text-ink-2">{CATALOGUE_TEXT.countryLine(country)}</p>
          </div>
          <ButtonLink href={ROUTES.catalogueEdit(university.id)} icon="edit" size="sm">
            <span aria-hidden="true">{CATALOGUE_TEXT.edit}</span>
            <span className="sr-only">
              {CATALOGUE_TEXT.editUniversityAndCourses(university.name)}
            </span>
          </ButtonLink>
        </header>
        <CourseTable university={university} {...actions} />
        {!university.archived && (
          <div className="border-rule bg-fill border-t px-6 py-3">
            <Button
              icon="plus"
              size="sm"
              onClick={() => {
                actions.onAddCourse(university);
              }}
            >
              <span aria-hidden="true">{CATALOGUE_TEXT.addCourse}</span>
              <span className="sr-only">{`${CATALOGUE_TEXT.addCourse} to ${university.name}`}</span>
            </Button>
          </div>
        )}
      </Panel>
    </section>
  );
}

function CourseTable({ university, ...actions }: UniversityCardProps) {
  if (university.courses.length === 0) {
    return <p className="text-ink-2 px-6 py-4">{CATALOGUE_TEXT.noCourses}</p>;
  }
  return (
    // Fits the card at every width: Intakes and documents wrap (asked 2026-11-17: tables never
    // scroll sideways). On a phone each Course is a card with every column.
    <div className="relative min-w-0">
      <DataTable>
        <caption className="sr-only">
          {CATALOGUE_TEXT.courseCount(university.courses.length)}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>
              {CATALOGUE_TEXT.course}
            </th>
            <th scope="col" className={HEAD}>
              {CATALOGUE_TEXT.level}
            </th>
            <th scope="col" className={HEAD}>
              {CATALOGUE_TEXT.intakes}
            </th>
            <th scope="col" className={HEAD}>
              {CATALOGUE_TEXT.requiredDocuments}
            </th>
          </tr>
        </thead>
        <tbody>
          {university.courses.map((course) => (
            <CourseRow
              key={course.id}
              course={course}
              isEditable={!university.archived && !course.archived}
              {...actions}
            />
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}

type CourseRowProps = Omit<CardActions, "onAddCourse"> & { course: Course; isEditable: boolean };

/** The Course's Intakes as chips; × and "Add intake" while it and its University are active. */
function IntakeCell({ course, isEditable, onAddIntake, onRemoveIntake }: CourseRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <IntakeChips
        intakes={course.intakes}
        emptyText={CATALOGUE_TEXT.noIntakes}
        removeLabel={(intake) => CATALOGUE_TEXT.removeIntakeFrom(intake, course.name)}
        onRemove={
          isEditable
            ? (intake) => {
                onRemoveIntake(course, intake);
              }
            : undefined
        }
      />
      {isEditable && (
        <Button
          variant="ghost"
          size="sm"
          icon="plus"
          onClick={() => {
            onAddIntake(course);
          }}
        >
          <span aria-hidden="true">{CATALOGUE_TEXT.addIntake}</span>
          <span className="sr-only">{CATALOGUE_TEXT.addIntakeFor(course.name)}</span>
        </Button>
      )}
    </div>
  );
}

function CourseRow({ course, isEditable, onAddIntake, onRemoveIntake }: CourseRowProps) {
  const documents = course.documents.map((document) => document.name).join(", ");
  return (
    <DataRow className={clsx(course.archived && "text-ink-2")}>
      <th scope="row" className={clsx(CELL, "text-left font-semibold")}>
        <span className="flex flex-wrap items-center gap-2">
          {course.name}
          {course.archived && <Chip hasDot={false}>{CATALOGUE_TEXT.archived}</Chip>}
        </span>
      </th>
      <DataCell label={CATALOGUE_TEXT.level} className={CELL}>
        {levelLabel(course.level)}
      </DataCell>
      <DataCell label={CATALOGUE_TEXT.intakes} className={CELL}>
        <IntakeCell
          course={course}
          isEditable={isEditable}
          onAddIntake={onAddIntake}
          onRemoveIntake={onRemoveIntake}
        />
      </DataCell>
      <DataCell label={CATALOGUE_TEXT.requiredDocuments} className={clsx(CELL, "text-secondary")}>
        {documents === "" ? (
          <span className="text-ink-2">{CATALOGUE_TEXT.onlyCountryList}</span>
        ) : (
          documents
        )}
      </DataCell>
    </DataRow>
  );
}
