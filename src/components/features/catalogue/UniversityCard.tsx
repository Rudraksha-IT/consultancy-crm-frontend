import clsx from "clsx";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Chip } from "@/components/ui/Chip";
import { Panel } from "@/components/ui/Panel";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { ROUTES } from "@/constants/routes";
import type { Course, University } from "@/lib/api";

import { CourseFilesCell } from "./CourseFilesCell";
import { IntakeChips } from "./IntakePicker";
import { countryLabel, levelLabel } from "./options";

export type CardActions = {
  onAddCourse: (university: University) => void;
  onAddIntake: (course: Course) => void;
  onRemoveIntake: (course: Course, intake: string) => void;
  /** A Course File was added, renamed or deleted: load the Catalogue again in place. */
  onChanged: () => void;
};

type UniversityCardProps = CardActions & { university: University };

/**
 * One University as a card with all its Courses, never folded away: each Course's level, Intakes
 * as chips (with × and "Add intake"), Required documents and Course Files (issue 92, ticket 10).
 * The card has only Edit; archiving is on the edit page.
 */
export function UniversityCard({ university, ...actions }: UniversityCardProps) {
  const country = countryLabel(university.country);
  return (
    <section aria-labelledby={`university-${university.id}`} className="min-w-0">
      <Panel>
        <header className="border-rule flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b px-6 py-4">
          <div className="grid min-w-0 gap-1">
            <h2
              id={`university-${university.id}`}
              className="text-section-title text-ink flex flex-wrap items-center gap-2 break-words"
            >
              {university.name}
              {university.archived && <Chip hasDot={false}>{CATALOGUE_TEXT.archived}</Chip>}
            </h2>
            <p className="text-secondary text-ink-2">{CATALOGUE_TEXT.countryLine(country)}</p>
          </div>
          <ButtonLink href={ROUTES.universityEdit(university.id)} icon="edit" size="sm">
            <span aria-hidden="true">{CATALOGUE_TEXT.edit}</span>
            <span className="sr-only">
              {CATALOGUE_TEXT.editUniversityAndCourses(university.name)}
            </span>
          </ButtonLink>
        </header>
        <CourseRows university={university} {...actions} />
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

/**
 * The Courses as stacked rows, never a table that scrolls sideways (ticket 10): name and level,
 * then Intakes, Required documents and Course Files side by side, wrapping on narrow screens.
 */
function CourseRows({ university, ...actions }: UniversityCardProps) {
  if (university.courses.length === 0) {
    return <p className="text-ink-2 px-6 py-4">{CATALOGUE_TEXT.noCourses}</p>;
  }
  return (
    <ul aria-label={CATALOGUE_TEXT.courseCount(university.courses.length)} className="min-w-0">
      {university.courses.map((course) => (
        <CourseRow
          key={course.id}
          course={course}
          isEditable={!university.archived && !course.archived}
          {...actions}
        />
      ))}
    </ul>
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

const FACTS = "tablet:grid-cols-3 grid gap-x-6 gap-y-3";

function CourseRow(props: CourseRowProps) {
  const { course, isEditable, onChanged } = props;
  const documents = course.documents.map((document) => document.name).join(", ");
  return (
    <li
      className={clsx(
        "border-rule phone:px-6 grid min-w-0 gap-3 border-t px-4 py-4",
        course.archived && "text-ink-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-body text-ink font-semibold break-words">{course.name}</h3>
        <Chip hasDot={false}>{levelLabel(course.level)}</Chip>
        {course.archived && <Chip hasDot={false}>{CATALOGUE_TEXT.archived}</Chip>}
      </div>
      <dl className={FACTS}>
        <Fact label={CATALOGUE_TEXT.intakes}>
          <IntakeCell {...props} />
        </Fact>
        <Fact label={CATALOGUE_TEXT.requiredDocuments}>
          {documents === "" ? (
            <span className="text-ink-2">{CATALOGUE_TEXT.onlyCountryList}</span>
          ) : (
            <span className="text-secondary">{documents}</span>
          )}
        </Fact>
        <Fact label={CATALOGUE_TEXT.courseFiles}>
          <CourseFilesCell course={course} isLive={isEditable} onChanged={onChanged} />
        </Fact>
      </dl>
    </li>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-small text-ink-2 mb-1 font-semibold">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}
