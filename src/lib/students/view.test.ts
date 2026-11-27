import { studentsViewFrom } from "./view";

describe("studentsViewFrom", () => {
  it("reads a stored view", () => {
    expect(studentsViewFrom("list")).toBe("list");
    expect(studentsViewFrom("board")).toBe("board");
  });

  it.each([null, "", "LIST", "calendar", "<script>alert(1)</script>", "{}"])(
    "gives the Board for %j",
    (stored) => {
      expect(studentsViewFrom(stored)).toBe("board");
    },
  );
});
