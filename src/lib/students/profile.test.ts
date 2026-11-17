import { Role } from "@/constants/roles";

import { addressText, ageOn, parseStudentId, viewOnlyReason } from "./profile";

describe("viewOnlyReason", () => {
  it("tells a Counsellor who the Student's counsellor is", () => {
    expect(viewOnlyReason(Role.Counsellor, "Bikash Thapa")).toBe(
      "View only. Bikash Thapa is this Student's counsellor. Only they or an Admin can make changes.",
    );
  });

  it("tells a Counsellor when the Lead has no counsellor yet", () => {
    expect(viewOnlyReason(Role.Counsellor, null)).toBe(
      "View only. This Lead has no counsellor yet. Front Desk or an Admin can assign one.",
    );
  });

  it("tells Front Desk they change only unassigned Leads", () => {
    expect(viewOnlyReason(Role.FrontDesk, "Bikash Thapa")).toBe(
      "View only. Front Desk can change only Leads with no counsellor.",
    );
  });

  it.each([Role.Admin, Role.Teacher])("says just view only for %s", (role) => {
    expect(viewOnlyReason(role, null)).toBe("View only.");
  });
});

describe("parseStudentId", () => {
  it.each([
    ["7", 7],
    ["1234567890", 1234567890],
  ])("reads %j as a Student id", (text, id) => {
    expect(parseStudentId(text)).toBe(id);
  });

  it.each(["0", "-1", "07", "abc", "1.5", "", "12345678901", "1e3"])("refuses %j", (text) => {
    expect(parseStudentId(text)).toBeNull();
  });
});

describe("ageOn", () => {
  it.each([
    ["2003-04-12", "2026-11-05", 23],
    ["2003-11-05", "2026-11-05", 23],
    ["2003-11-06", "2026-11-05", 22],
    ["2004-02-29", "2027-02-28", 22],
    ["2004-02-29", "2027-03-01", 23],
  ])("someone born %s is %s years old on %s", (born, today, age) => {
    expect(ageOn(born, today)).toBe(age);
  });
});

describe("addressText", () => {
  const EMPTY = { province: "", district: "", municipality: "", ward: null, street: "" } as const;

  it("writes the parts from the street up to the province", () => {
    expect(
      addressText({
        province: "gandaki",
        district: "Kaski",
        municipality: "Pokhara Metropolitan City",
        ward: 6,
        street: "Lakeside",
      }),
    ).toBe("Lakeside, Ward 6, Pokhara Metropolitan City, Kaski, Gandaki Province");
  });

  it("leaves out the parts not given", () => {
    expect(addressText({ ...EMPTY, district: "Kaski", ward: 4 })).toBe("Ward 4, Kaski");
  });

  it("is empty when nothing is given", () => {
    expect(addressText(EMPTY)).toBe("");
  });
});
