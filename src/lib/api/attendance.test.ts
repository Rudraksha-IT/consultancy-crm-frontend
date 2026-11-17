import { fetchAttendanceDay, fetchStudentClasses, saveAttendanceDay } from "./attendance";
import { InvalidFieldsError } from "./errors";
import { jsonResponse } from "./test-helpers";

const DAY = {
  day: "2026-11-02",
  can_mark: true,
  marks: [
    { student: 8, mark: null },
    { student: 7, mark: "late" },
  ],
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sent(fetchFn: ReturnType<typeof answering>) {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  const sentBody = init?.body;
  const body: unknown = typeof sentBody === "string" ? JSON.parse(sentBody) : null;
  return { path, method: init?.method, body };
}

describe("fetchAttendanceDay", () => {
  it("GETs one class day's marks in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(DAY));

    const day = await fetchAttendanceDay(3, "2026-11-02", fetchFn);

    expect(sent(fetchFn).path).toBe("/api/batches/3/attendance/2026-11-02/");
    expect(day).toEqual({
      day: "2026-11-02",
      canMark: true,
      marks: { 7: "late" },
    });
  });

  it.each([
    ["an unknown mark", { marks: [{ student: 7, mark: "here" }] }],
    ["a student id that isn't a number", { marks: [{ student: "7", mark: "late" }] }],
    ["a day that isn't one", { day: "2 Nov" }],
    ["no can_mark", { can_mark: undefined }],
  ])("refuses an answer with %s", async (_, change) => {
    const fetchFn = answering(jsonResponse({ ...DAY, ...change }));

    await expect(fetchAttendanceDay(3, "2026-11-02", fetchFn)).rejects.toThrow();
  });

  it("refuses to ask for a day that isn't one, without calling the API", async () => {
    const fetchFn = vi.fn<typeof fetch>();

    await expect(fetchAttendanceDay(3, "../../staff", fetchFn)).rejects.toThrow();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("saveAttendanceDay", () => {
  it("PUTs the marks in API naming and returns the saved day", async () => {
    const fetchFn = answering(jsonResponse(DAY));

    const day = await saveAttendanceDay(3, "2026-11-02", { 7: "late", 9: "present" }, fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: "/api/batches/3/attendance/2026-11-02/",
      method: "PUT",
      body: {
        marks: [
          { student: 7, mark: "late" },
          { student: 9, mark: "present" },
        ],
      },
    });
    expect(day.marks).toEqual({ 7: "late" });
  });

  it("names a refused day or marks as field errors", async () => {
    const refused = { day: ["Choose a day from 2026-10-05 to 2026-12-04."] };
    const fetchFn = answering(jsonResponse(refused, 400));

    const error: unknown = await saveAttendanceDay(3, "2026-12-30", {}, fetchFn).catch(
      (caught: unknown) => caught,
    );

    if (!(error instanceof InvalidFieldsError)) throw new Error("expected refused fields");
    expect(error.fieldErrors).toEqual({
      day: ["Choose a day from 2026-10-05 to 2026-12-04."],
    });
  });
});

describe("fetchStudentClasses", () => {
  it("GETs a Student's classes with their recent days", async () => {
    const classes = [
      {
        id: 3,
        name: "IELTS Morning",
        time_slot: "7 AM",
        attended_percent: 50,
        recent_days: [
          { day: "2026-10-30", mark: "present" },
          { day: "2026-11-01", mark: null },
        ],
      },
    ];
    const fetchFn = answering(jsonResponse(classes));

    const answer = await fetchStudentClasses(7, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/students/7/batches/");
    expect(answer).toEqual([
      {
        id: 3,
        name: "IELTS Morning",
        timeSlot: "7 AM",
        attendedPercent: 50,
        recentDays: [
          { day: "2026-10-30", mark: "present" },
          { day: "2026-11-01", mark: null },
        ],
      },
    ]);
  });

  it("refuses a share over 100%", async () => {
    const classes = [{ id: 3, name: "x", time_slot: "7", attended_percent: 120, recent_days: [] }];
    const fetchFn = answering(jsonResponse(classes));

    await expect(fetchStudentClasses(7, fetchFn)).rejects.toThrow();
  });
});
