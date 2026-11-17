import {
  addStudentToBatch,
  createBatch,
  fetchBatch,
  fetchBatches,
  fetchBatchTeachers,
  fetchEnrolledStudents,
  removeStudentFromBatch,
  saveBatch,
} from "./batches";
import { ApiRequestError, InvalidFieldsError } from "./errors";
import { jsonResponse } from "./test-helpers";

const BATCH = {
  id: 3,
  name: "IELTS Morning",
  test_type: "ielts",
  teacher: { id: 9, name: "Gita Lama" },
  time_slot: "7:00-8:30 AM",
  starts_on: "2026-10-05",
  ends_on: "2026-12-04",
  timing: "running",
  student_count: 2,
  attendance_taken_today: false,
  can_change: true,
};

const BATCH_IN_FRONTEND_NAMING = {
  id: 3,
  name: "IELTS Morning",
  testType: "ielts",
  teacher: { id: 9, name: "Gita Lama" },
  timeSlot: "7:00-8:30 AM",
  startsOn: "2026-10-05",
  endsOn: "2026-12-04",
  timing: "running",
  studentCount: 2,
  attendanceTakenToday: false,
  canChange: true,
};

const WITH_STUDENTS = {
  ...BATCH,
  students: [
    { id: 7, name: "Sita Gurung", attended_percent: null },
    { id: 8, name: "Ram Shrestha", attended_percent: 92 },
  ],
};

const NEW_BATCH = {
  name: "IELTS Morning",
  testType: "ielts",
  teacherId: 9,
  timeSlot: "7:00-8:30 AM",
  startsOn: "2026-10-05",
  endsOn: "2026-12-04",
} as const;

const NEW_BATCH_BODY = {
  name: "IELTS Morning",
  test_type: "ielts",
  teacher: 9,
  time_slot: "7:00-8:30 AM",
  starts_on: "2026-10-05",
  ends_on: "2026-12-04",
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sent(fetchFn: ReturnType<typeof answering>): { path: unknown; init?: RequestInit } {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  return init === undefined ? { path } : { path, init };
}

function sentBody(fetchFn: ReturnType<typeof answering>): unknown {
  const body = sent(fetchFn).init?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function pageOf(results: unknown[]) {
  return { count: results.length, page: 1, page_size: 25, results };
}

describe("fetchBatches", () => {
  it("GETs one page of classes in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(pageOf([BATCH])));

    const page = await fetchBatches(2, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/batches/?page=2");
    expect(page).toEqual({ count: 1, page: 1, pageSize: 25, batches: [BATCH_IN_FRONTEND_NAMING] });
  });

  it.each([
    ["an unknown test type", { test_type: "gre" }],
    ["an unknown timing", { timing: "soon" }],
    ["a negative count", { student_count: -1 }],
    ["a date that isn't one", { starts_on: "5 Oct" }],
    ["a missing teacher", { teacher: null }],
  ])("refuses an answer with %s", async (_, change) => {
    const fetchFn = answering(jsonResponse(pageOf([{ ...BATCH, ...change }])));

    await expect(fetchBatches(1, fetchFn)).rejects.toThrow();
  });
});

describe("fetchBatch", () => {
  it("GETs one class with its Students", async () => {
    const fetchFn = answering(jsonResponse(WITH_STUDENTS));

    const batch = await fetchBatch(3, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/batches/3/");
    expect(batch.students).toEqual([
      { id: 7, name: "Sita Gurung", attendedPercent: null },
      { id: 8, name: "Ram Shrestha", attendedPercent: 92 },
    ]);
  });

  it("refuses an attendance over 100%", async () => {
    const students = [{ id: 7, name: "Sita Gurung", attended_percent: 101 }];
    const fetchFn = answering(jsonResponse({ ...BATCH, students }));

    await expect(fetchBatch(3, fetchFn)).rejects.toThrow();
  });
});

describe("createBatch and saveBatch", () => {
  it("POSTs a new class in API naming", async () => {
    const fetchFn = answering(jsonResponse({ ...BATCH, students: [] }, 201));

    const batch = await createBatch(NEW_BATCH, fetchFn);

    const { path, init } = sent(fetchFn);
    expect(path).toBe("/api/batches/");
    expect(init?.method).toBe("POST");
    expect(sentBody(fetchFn)).toEqual(NEW_BATCH_BODY);
    expect(batch.name).toBe("IELTS Morning");
  });

  it("PUTs the whole class to save it", async () => {
    const fetchFn = answering(jsonResponse(WITH_STUDENTS));

    await saveBatch(3, NEW_BATCH, fetchFn);

    const { path, init } = sent(fetchFn);
    expect(path).toBe("/api/batches/3/");
    expect(init?.method).toBe("PUT");
    expect(sentBody(fetchFn)).toEqual(NEW_BATCH_BODY);
  });

  it("names refused fields in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse(
        {
          ends_on: ["It can't end before it starts."],
          time_slot: ["Say when the class meets, e.g. 7:00-8:30 AM."],
        },
        400,
      ),
    );

    const error: unknown = await createBatch(NEW_BATCH, fetchFn).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(InvalidFieldsError);
    expect(error instanceof InvalidFieldsError && error.fieldErrors).toEqual({
      endsOn: ["It can't end before it starts."],
      timeSlot: ["Say when the class meets, e.g. 7:00-8:30 AM."],
    });
  });

  it("rejects with the refusal when not allowed", async () => {
    const fetchFn = answering(jsonResponse({ detail: "No." }, 403));

    await expect(saveBatch(3, NEW_BATCH, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("adding and removing Students", () => {
  it("POSTs the Student to the class", async () => {
    const fetchFn = answering(jsonResponse(WITH_STUDENTS, 201));

    const batch = await addStudentToBatch(3, 7, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/batches/3/students/");
    expect(sentBody(fetchFn)).toEqual({ student: 7 });
    expect(batch.students).toHaveLength(2);
  });

  it("names why a Student can't be added", async () => {
    const fetchFn = answering(jsonResponse({ student: ["Already in this class."] }, 400));

    const error: unknown = await addStudentToBatch(3, 7, fetchFn).catch((e: unknown) => e);

    expect(error instanceof InvalidFieldsError && error.fieldErrors).toEqual({
      studentId: ["Already in this class."],
    });
  });

  it("DELETEs the Student from the class", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await removeStudentFromBatch(3, 7, fetchFn);

    const { path, init } = sent(fetchFn);
    expect(path).toBe("/api/batches/3/students/7/");
    expect(init?.method).toBe("DELETE");
  });

  it("rejects when the Student can't be removed", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Not found." }, 404));

    await expect(removeStudentFromBatch(3, 7, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("fetchEnrolledStudents", () => {
  it("GETs one page of Students with their classes", async () => {
    const student = {
      id: 7,
      name: "Sita Gurung",
      batches: [{ id: 3, name: "IELTS Morning" }],
      attended_percent: null,
    };
    const fetchFn = answering(jsonResponse(pageOf([student])));

    const page = await fetchEnrolledStudents(1, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/batches/students/?page=1");
    expect(page.students).toEqual([
      {
        id: 7,
        name: "Sita Gurung",
        batches: [{ id: 3, name: "IELTS Morning" }],
        attendedPercent: null,
      },
    ]);
  });
});

describe("fetchBatchTeachers", () => {
  it("GETs who can teach", async () => {
    const fetchFn = answering(jsonResponse([{ id: 9, name: "Gita Lama" }]));

    expect(await fetchBatchTeachers(fetchFn)).toEqual([{ id: 9, name: "Gita Lama" }]);
    expect(sent(fetchFn).path).toBe("/api/batches/teachers/");
  });

  it("refuses an answer that isn't a list of people", async () => {
    const fetchFn = answering(jsonResponse([{ id: "9", name: "Gita Lama" }]));

    await expect(fetchBatchTeachers(fetchFn)).rejects.toThrow();
  });
});
