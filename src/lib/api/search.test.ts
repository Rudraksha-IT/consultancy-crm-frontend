import { searchEverything } from "./search";
import { jsonResponse } from "./test-helpers";

const STUDENT = {
  kind: "student",
  id: 2,
  name: "Sita Karki",
  phone: "9841234567",
  stage: "counselling",
  assigned_counsellor: { id: 5, name: "Bikash Thapa" },
};

function answering(body: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(body, status));
}

describe("searchEverything", () => {
  it("sends the text as q and names the results in frontend terms", async () => {
    const fetchFn = answering({
      students: [
        STUDENT,
        { kind: "class_student", id: 3, name: "Sita Rai", batch: { id: 7, name: "IELTS Morning" } },
      ],
      student_count: 9,
      batches: [{ id: 7, name: "IELTS Morning", time_slot: "7:00-8:30 AM" }],
    });

    const found = await searchEverything("sita & co", fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/search/?q=sita+%26+co");
    expect(found).toEqual({
      students: [
        {
          kind: "student",
          id: 2,
          name: "Sita Karki",
          phone: "9841234567",
          stage: "counselling",
          assignedCounsellor: { id: 5, name: "Bikash Thapa" },
        },
        { kind: "class_student", id: 3, name: "Sita Rai", batch: { id: 7, name: "IELTS Morning" } },
      ],
      studentCount: 9,
      batches: [{ id: 7, name: "IELTS Morning", timeSlot: "7:00-8:30 AM" }],
    });
  });

  it.each([
    [
      "an unknown stage",
      { students: [{ ...STUDENT, stage: "won" }], student_count: 1, batches: [] },
    ],
    [
      "an unknown kind",
      { students: [{ ...STUDENT, kind: "staff" }], student_count: 1, batches: [] },
    ],
    ["a missing count", { students: [], batches: [] }],
    ["more than five", { students: Array(6).fill(STUDENT), student_count: 6, batches: [] }],
  ])("refuses an answer with %s", async (_, body) => {
    await expect(searchEverything("sita", answering(body))).rejects.toThrow();
  });

  it("fails on a refused search", async () => {
    await expect(
      searchEverything("sita", answering({ detail: "Too many searches." }, 429)),
    ).rejects.toMatchObject({ status: 429 });
  });
});
