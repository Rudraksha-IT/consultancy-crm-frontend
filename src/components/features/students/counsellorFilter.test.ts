import { Role } from "@/constants/roles";
import type { CounsellorChoice } from "@/lib/api";

import { canBeAssignedStudents, counsellorFilterOptions } from "./counsellorFilter";

const CHOICES: CounsellorChoice[] = [
  { id: 5, name: "Bikash Thapa", role: "counsellor" },
  { id: 1, name: "Asha Admin", role: "admin" },
];

const LABELS = { any: "Any counsellor", me: "Assigned to me" };

describe("counsellorFilterOptions", () => {
  it("lists every Counsellor after Any and Assigned to me", () => {
    expect(counsellorFilterOptions(CHOICES, true, LABELS)).toEqual([
      { value: "", label: "Any counsellor" },
      { value: "me", label: "Assigned to me" },
      { value: "5", label: "Bikash Thapa" },
      { value: "1", label: "Asha Admin" },
    ]);
  });

  it("leaves out Assigned to me for someone who can't be assigned, and still lists everyone", () => {
    expect(counsellorFilterOptions(CHOICES, false, LABELS)).toEqual([
      { value: "", label: "Any counsellor" },
      { value: "5", label: "Bikash Thapa" },
      { value: "1", label: "Asha Admin" },
    ]);
  });

  it("offers No counsellor yet before the names when it is given", () => {
    const options = counsellorFilterOptions(CHOICES, true, {
      ...LABELS,
      none: "No counsellor yet",
    });

    expect(options.map(({ value }) => value)).toEqual(["", "me", "none", "5", "1"]);
  });

  it("offers only the fixed choices until the Counsellors have loaded", () => {
    expect(counsellorFilterOptions([], true, LABELS)).toHaveLength(2);
  });
});

describe("canBeAssignedStudents", () => {
  it.each([
    [Role.Admin, true],
    [Role.Counsellor, true],
    [Role.FrontDesk, false],
    [Role.Teacher, false],
  ])("is %s → %s", (role, expected) => {
    expect(canBeAssignedStudents(role)).toBe(expected);
  });
});
