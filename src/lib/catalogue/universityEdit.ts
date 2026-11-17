import { CATALOGUE_TEXT, CourseLevel } from "@/constants/catalogue";
import type { CourseEditInput, University, UniversityEditInput } from "@/lib/api";

/** One Course as the edit page holds it while it is being changed (issue 92). */
export type CourseDraft = {
  /** Stays the same while the row is on the page, also for a new Course. */
  key: string;
  /** Null for a Course added on this page. */
  id: number | null;
  name: string;
  level: string;
  intakes: string[];
  archived: boolean;
  /** Archived as stored: only such a Course can be deleted. */
  savedArchived: boolean;
  documents: number[];
  /** How many Applications use it; such a Course can't be deleted. */
  applications: number;
  /** Marked to be deleted on Save, with Undo until then. */
  isDeleted: boolean;
};

export type UniversityDraft = {
  name: string;
  country: string;
  archived: boolean;
  savedArchived: boolean;
  courses: CourseDraft[];
};

type Messages = Partial<Record<"name" | "intakes", string[]>>;

/** What the page finds wrong before sending: by University field, and by Course row key. */
export type DraftProblems = {
  fields: Partial<Record<"name", string[]>>;
  rows: Record<string, Messages>;
};

/** The edit page's start: the University and its Courses as stored. */
export function draftOf(university: University): UniversityDraft {
  return {
    name: university.name,
    country: university.country,
    archived: university.archived,
    savedArchived: university.archived,
    courses: university.courses.map((course) => ({
      key: `course-${String(course.id)}`,
      id: course.id,
      name: course.name,
      level: course.level,
      intakes: [...course.intakes],
      archived: course.archived,
      savedArchived: course.archived,
      documents: course.documents.map((document) => document.id),
      applications: course.applications,
      isDeleted: false,
    })),
  };
}

/** A Course added on the page: no name yet, Bachelor, no Intakes or documents. */
export function newCourseDraft(key: string): CourseDraft {
  return {
    key,
    id: null,
    name: "",
    level: CourseLevel.Bachelor,
    intakes: [],
    archived: false,
    savedArchived: false,
    documents: [],
    applications: 0,
    isDeleted: false,
  };
}

/** Whether a Course may be deleted: saved as archived and used by no Application. */
export function canDelete(course: CourseDraft): boolean {
  return course.id !== null && course.savedArchived && course.applications === 0;
}

/** What Save sends: every Course still on the page, and the ids of those marked deleted. */
export function toEditInput(draft: UniversityDraft): UniversityEditInput {
  const kept = draft.courses.filter((course) => !course.isDeleted);
  return {
    name: draft.name.trim(),
    country: draft.country,
    archived: draft.archived,
    courses: kept.map(courseInput),
    deletedCourses: draft.courses.flatMap((course) =>
      course.isDeleted && course.id !== null ? [course.id] : [],
    ),
  };
}

/** The row key of each Course sent, by its place: the server's row errors use the place. */
export function rowKeysSent(draft: UniversityDraft): string[] {
  return draft.courses.filter((course) => !course.isDeleted).map((course) => course.key);
}

/** What to fix before sending: names, an Intake on every active Course, no name twice. */
export function checkDraft(draft: UniversityDraft): DraftProblems {
  const fields = draft.name.trim() === "" ? { name: [CATALOGUE_TEXT.enterUniversityName] } : {};
  const rows: Record<string, Messages> = {};
  const seen = new Set<string>();
  for (const course of draft.courses.filter((each) => !each.isDeleted)) {
    const found = courseProblems(course, seen);
    if (Object.keys(found).length > 0) rows[course.key] = found;
    seen.add(course.name.trim().toLowerCase());
  }
  return { fields, rows };
}

function courseProblems(course: CourseDraft, seen: ReadonlySet<string>): Messages {
  const name = course.name.trim();
  const found: Messages = {};
  if (name === "") found.name = [CATALOGUE_TEXT.enterCourseName];
  else if (seen.has(name.toLowerCase())) found.name = [CATALOGUE_TEXT.courseNameTaken];
  if (course.intakes.length === 0 && !course.archived) found.intakes = [CATALOGUE_TEXT.needsIntake];
  return found;
}

function courseInput(course: CourseDraft): CourseEditInput {
  return {
    id: course.id,
    name: course.name.trim(),
    level: course.level,
    intakes: course.intakes,
    archived: course.archived,
    documents: course.documents,
  };
}
