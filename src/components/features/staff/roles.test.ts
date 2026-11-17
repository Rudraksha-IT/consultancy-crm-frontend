import { isRole, roleOptions } from "./roles";

describe("roleOptions", () => {
  it("leaves Teacher out while classes are off", () => {
    expect(roleOptions(["students"]).map((o) => o.label)).toEqual([
      "Admin",
      "Counsellor",
      "Front Desk",
    ]);
  });

  it("offers Teacher while classes are on", () => {
    expect(roleOptions(["batches"]).map((o) => o.value)).toContain("teacher");
  });

  it("keeps a Teacher's own Role selectable", () => {
    expect(roleOptions([], "teacher").map((o) => o.value)).toContain("teacher");
  });
});

describe("isRole", () => {
  it("accepts only the API's Role values", () => {
    expect(isRole("front_desk")).toBe(true);
    expect(isRole("Front Desk")).toBe(false);
  });
});
