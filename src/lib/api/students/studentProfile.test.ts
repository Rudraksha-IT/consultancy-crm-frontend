import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { fetchStudentHistory, fetchStudentProfile, saveNote } from "./studentProfile";
import { PROFILE } from "@/test/studentProfile";

import { jsonResponse } from "../core/test-helpers";

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

type SentCall = { path: unknown; method: unknown; body: unknown };

function sent(fetchFn: ReturnType<typeof answering>): SentCall {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  return { path, method: init?.method ?? "GET", body: parsedBody(init?.body) };
}

function parsedBody(body: unknown): unknown {
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

describe("fetchStudentProfile", () => {
  it("returns the profile in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(PROFILE));

    const profile = await fetchStudentProfile(7, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/students/7/");
    expect(profile).toMatchObject({
      id: 7,
      otherCountries: ["uk"],
      dateOfBirth: "2003-04-12",
      passportNumber: "PA1234567",
      passportWarning: null,
      permanentAddress: { province: "gandaki", ward: 6, street: "Lakeside" },
      mailingSameAsPermanent: true,
      targetLevel: "master",
      workExperience: [{ id: 2, jobTitle: "Staff nurse", startedOn: "2024-04", endedOn: null }],
      preferredIntake: "2027-02",
      assignedCounsellor: { id: 5, name: "Bikash Thapa" },
      academicRecords: [{ id: 1, level: "bachelor", finishedYear: 2024, result: "GPA 3.2" }],
      testScores: [{ id: 3, test: "ielts", overall: "6.5", takenOn: "2026-09-14" }],
      lostReason: "",
      canChange: true,
      canSetStage: true,
      canAssign: false,
      canTransfer: true,
    });
  });

  it("carries every Stage change, for the Activity timeline (issue 82)", async () => {
    const change = {
      id: 9,
      kind: "stage_changed",
      at: "2026-10-03T11:00:00+05:45",
      by: { name: "Bikash Thapa", is_platform_admin: false },
      before: "lead",
      after: "counselling",
      detail: "",
    };
    const fetchFn = answering(jsonResponse({ ...PROFILE, stage_changes: [change] }));

    const profile = await fetchStudentProfile(7, fetchFn);

    expect(profile.stageChanges).toEqual([
      { ...change, by: { name: "Bikash Thapa", isPlatformAdmin: false } },
    ]);
  });

  it.each([
    ["missing", undefined],
    ["not a list", "lead"],
    ["with an unknown kind", [{ kind: "lost" }]],
  ])("refuses Stage changes %s", async (_, stageChanges) => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, stage_changes: stageChanges }));

    await expect(fetchStudentProfile(7, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("refuses an answer of the wrong shape", async () => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, can_change: "yes" }));

    await expect(fetchStudentProfile(7, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });

  const withAddress = (key: "permanent_address" | "mailing_address", part: object) => ({
    ...PROFILE,
    [key]: { ...PROFILE[key], ...part },
  });

  it.each([
    ["an unknown province", withAddress("permanent_address", { province: "himalaya" })],
    ["a ward out of range", withAddress("mailing_address", { ward: 36 })],
    ["an unknown passport warning", { ...PROFILE, passport_warning: "soon" }],
    ["an unknown target level", { ...PROFILE, target_level: "see" }],
  ])("refuses %s", async (_, body) => {
    const fetchFn = answering(jsonResponse(body));

    await expect(fetchStudentProfile(7, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("refuses a Country it doesn't know", async () => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, other_countries: ["mars"] }));

    await expect(fetchStudentProfile(7, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("passes on a 404 with its status", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Not found." }, 404));

    await expect(fetchStudentProfile(7, fetchFn)).rejects.toMatchObject({ status: 404 });
  });
});

describe("saveNote", () => {
  it("PUTs the whole Note and returns the profile", async () => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, note: "New text" }));

    const profile = await saveNote(7, "New text", fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: "/api/students/7/note/",
      method: "PUT",
      body: { note: "New text" },
    });
    expect(profile.note).toBe("New text");
  });

  it("names a refused Note", async () => {
    const fetchFn = answering(jsonResponse({ note: ["Too long."] }, 400));

    await expect(saveNote(7, "x", fetchFn)).rejects.toBeInstanceOf(InvalidFieldsError);
  });
});

describe("fetchStudentHistory", () => {
  const ENTRY = {
    id: 2,
    kind: "note_edited",
    at: "2026-10-22T13:48:00+05:45",
    by: { name: "Bikash Thapa", is_platform_admin: false },
    before: "Old",
    after: "New",
    detail: "",
  };

  it("asks for a page and returns it in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({ count: 51, page: 2, page_size: 50, results: [ENTRY] }),
    );

    const page = await fetchStudentHistory(7, 2, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/students/7/history/?page=2");
    expect(page).toEqual({
      count: 51,
      page: 2,
      pageSize: 50,
      entries: [
        {
          id: 2,
          kind: "note_edited",
          at: "2026-10-22T13:48:00+05:45",
          by: { name: "Bikash Thapa", isPlatformAdmin: false },
          before: "Old",
          after: "New",
          detail: "",
        },
      ],
    });
  });

  it("asks for the first page without a query", async () => {
    const fetchFn = answering(jsonResponse({ count: 0, page: 1, page_size: 50, results: [] }));

    await fetchStudentHistory(7, 1, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/students/7/history/");
  });

  it("refuses a kind of change it doesn't know", async () => {
    const fetchFn = answering(
      jsonResponse({ count: 1, page: 1, page_size: 50, results: [{ ...ENTRY, kind: "hacked" }] }),
    );

    await expect(fetchStudentHistory(7, 1, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});
