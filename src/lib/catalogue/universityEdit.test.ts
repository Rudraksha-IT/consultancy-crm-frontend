import { uid } from "@/test/ids";
import type { University } from "@/lib/api";

import {
  checkDraft,
  draftOf,
  newCourseDraft,
  rowKeysSent,
  toEditInput,
  type UniversityDraft,
} from "./universityEdit";

const UNIVERSITY: University = {
  id: uid(1),
  name: "Deakin University",
  country: "australia",
  archived: false,
  courses: [
    {
      id: uid(11),
      universityId: uid(1),
      name: "Master of IT",
      level: "master",
      intakes: ["2027-03"],
      archived: false,
      documents: [{ id: uid(21), name: "CV" }],
      applications: 2,
      files: [],
      fileCount: 0,
    },
    {
      id: uid(12),
      universityId: uid(1),
      name: "Old diploma",
      level: "diploma",
      intakes: [],
      archived: true,
      documents: [],
      applications: 0,
      files: [],
      fileCount: 0,
    },
  ],
};

function at<T>(list: readonly T[], index: number): T {
  const found = list[index];
  if (found === undefined) throw new Error(`Nothing at ${String(index)}`);
  return found;
}

function draft(): UniversityDraft {
  return draftOf(UNIVERSITY);
}

describe("draftOf", () => {
  it("starts from what is stored, remembering what was saved as archived", () => {
    const started = draft();

    expect(started).toMatchObject({
      name: "Deakin University",
      country: "australia",
      archived: false,
      savedArchived: false,
    });
    expect(started.courses[0]).toMatchObject({
      id: uid(11),
      name: "Master of IT",
      documents: [uid(21)],
      applications: 2,
      savedArchived: false,
      isDeleted: false,
    });
    expect(started.courses[1]).toMatchObject({ id: uid(12), savedArchived: true });
  });
});

describe("toEditInput", () => {
  it("sends every course still on the page and the ids of those marked deleted", () => {
    const changed = draft();
    changed.courses[1] = { ...at(changed.courses, 1), isDeleted: true };
    changed.courses.push({
      ...newCourseDraft("n1"),
      name: " Bachelor of IT ",
      intakes: ["2027-07"],
    });

    expect(toEditInput({ ...changed, name: "  Deakin  " })).toEqual({
      name: "Deakin",
      country: "australia",
      archived: false,
      courses: [
        {
          id: uid(11),
          name: "Master of IT",
          level: "master",
          intakes: ["2027-03"],
          archived: false,
          documents: [uid(21)],
        },
        {
          id: null,
          name: "Bachelor of IT",
          level: "bachelor",
          intakes: ["2027-07"],
          archived: false,
          documents: [],
        },
      ],
      deletedCourses: [uid(12)],
    });
  });

  it("keeps the place of each course sent, for the server's row errors", () => {
    const changed = draft();
    changed.courses[0] = { ...at(changed.courses, 0), isDeleted: true };

    expect(rowKeysSent(changed)).toEqual([at(changed.courses, 1).key]);
  });
});

describe("checkDraft", () => {
  it("finds nothing wrong with what is stored", () => {
    expect(checkDraft(draft())).toEqual({ fields: {}, rows: {} });
  });

  it("asks for names and an intake on every active course", () => {
    const changed = draft();
    changed.courses.push(newCourseDraft("n1"));
    const blank = { ...changed, name: " " };

    expect(checkDraft(blank)).toEqual({
      fields: { name: ["Enter the university's name."] },
      rows: {
        n1: {
          name: ["Enter the course's name."],
          intakes: ["Add at least one intake, or archive the course."],
        },
      },
    });
  });

  it("lets an archived course or one marked deleted have no intakes", () => {
    const changed = draft();
    changed.courses[0] = { ...at(changed.courses, 0), intakes: [], archived: true };

    expect(checkDraft(changed)).toEqual({ fields: {}, rows: {} });
  });

  it("refuses two courses with one name, whatever the case", () => {
    const changed = draft();
    changed.courses.push({ ...newCourseDraft("n1"), name: "master of it", intakes: ["2027-07"] });

    expect(checkDraft(changed).rows).toEqual({
      n1: { name: ["This university already has a course with this name."] },
    });
  });
});
