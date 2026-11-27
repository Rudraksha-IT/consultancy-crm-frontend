import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { addStudent, fetchBoardStudents, fetchStudents } from "./students";
import { jsonResponse } from "../core/test-helpers";
import { uid } from "@/test/ids";
import { NO_STUDENT_FILTERS } from "@/lib/students";

const ROW = {
  id: uid(9),
  name: "Anish Neupane",
  phone: "9819988776",
  email: "anish@gmail.test",
  country: "canada",
  source: "walk_in",
  stage: "lead",
  priority: "normal",
  assigned_counsellor: { id: uid(2), name: "Bikash Thapa" },
};

const STORED = {
  ...ROW,
  highest_qualification: "bachelor",
  past_degree: "BBS, TU",
  previous_job: "",
  sub_agent_name: "",
  note: "Wants a diploma.",
  created_at: "2026-11-01T10:15:00+05:45",
};

const NEW_ANISH = {
  name: "Anish Neupane",
  phone: "9819988776",
  email: "anish@gmail.test",
  country: "canada",
  source: "walk_in",
  subAgentName: "",
  highestQualification: "bachelor",
  pastDegree: "BBS, TU",
  previousJob: "",
  note: "Wants a diploma.",
  assignedCounsellor: uid(2),
} as const;

function sentBody(fetchFn: ReturnType<typeof answering>): unknown {
  const body = fetchFn.mock.calls[0]?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function pageOf(results: unknown[], count = results.length) {
  return { count, page: 1, page_size: 25, results };
}

describe("fetchStudents", () => {
  it("asks for the filters and returns the page in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(pageOf([ROW], 30)));

    const page = await fetchStudents(
      {
        search: "anish",
        stage: "lead",
        priority: "",
        counsellor: "me",
        source: "",
        country: "",
        targetLevel: "",
      },
      2,
      fetchFn,
    );

    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      "/api/students/?q=anish&stage=lead&counsellor=me&page=2",
    );
    expect(page.count).toBe(30);
    expect(page.pageSize).toBe(25);
    expect(page.students).toEqual([
      {
        id: uid(9),
        name: "Anish Neupane",
        phone: "9819988776",
        email: "anish@gmail.test",
        country: "canada",
        source: "walk_in",
        stage: "lead",
        priority: "normal",
        assignedCounsellor: { id: uid(2), name: "Bikash Thapa" },
      },
    ]);
  });

  it("accepts a Student with no counsellor yet", async () => {
    const fetchFn = answering(jsonResponse(pageOf([{ ...ROW, assigned_counsellor: null }])));

    const page = await fetchStudents({ ...NO_STUDENT_FILTERS }, 1, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/students/");
    expect(page.students[0]?.assignedCounsellor).toBeNull();
  });

  it.each([
    ["an unknown Stage", { ...ROW, stage: "nowhere" }],
    ["an unknown Source", { ...ROW, source: "tiktok" }],
    ["an unknown country", { ...ROW, country: "mars" }],
    ["a missing name", { ...ROW, name: undefined }],
  ])("refuses an answer with %s", async (_, row) => {
    const fetchFn = answering(jsonResponse(pageOf([row])));

    await expect(fetchStudents({ ...NO_STUDENT_FILTERS }, 1, fetchFn)).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe("addStudent", () => {
  it("sends the visitor in the API's naming and returns them as stored", async () => {
    const fetchFn = answering(jsonResponse(STORED, 201));

    const added = await addStudent(NEW_ANISH, fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/students/");
    expect(init?.method).toBe("POST");
    expect(sentBody(fetchFn)).toEqual({
      name: "Anish Neupane",
      phone: "9819988776",
      email: "anish@gmail.test",
      country: "canada",
      source: "walk_in",
      highest_qualification: "bachelor",
      past_degree: "BBS, TU",
      previous_job: "",
      note: "Wants a diploma.",
      assigned_counsellor: uid(2),
    });
    expect(added).toMatchObject({
      id: uid(9),
      name: "Anish Neupane",
      stage: "lead",
      priority: "normal",
      note: "Wants a diploma.",
    });
  });

  it("sends the Sub-agent name only for a Sub-agent Source", async () => {
    const fetchFn = answering(
      jsonResponse({ ...STORED, source: "sub_agent", sub_agent_name: "Himal" }, 201),
    );

    await addStudent({ ...NEW_ANISH, source: "sub_agent", subAgentName: "Himal" }, fetchFn);

    expect(sentBody(fetchFn)).toMatchObject({
      source: "sub_agent",
      sub_agent_name: "Himal",
    });
  });

  it("sends no counsellor as null", async () => {
    const fetchFn = answering(jsonResponse({ ...STORED, assigned_counsellor: null }, 201));

    await addStudent({ ...NEW_ANISH, assignedCounsellor: "" }, fetchFn);

    expect(sentBody(fetchFn)).toMatchObject({
      assigned_counsellor: null,
    });
  });

  it("rejects with the refused fields in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse(
        { phone: ["Enter a mobile number."], sub_agent_name: ["Enter the Sub-agent's name."] },
        400,
      ),
    );

    const error: unknown = await addStudent(NEW_ANISH, fetchFn).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvalidFieldsError);
    expect(error).toMatchObject({
      fieldErrors: {
        phone: ["Enter a mobile number."],
        subAgentName: ["Enter the Sub-agent's name."],
      },
    });
  });

  it("rejects with the API error for any other failure", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Teachers can't see Students." }, 403));

    await expect(addStudent(NEW_ANISH, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("fetchBoardStudents (UI revamp 08)", () => {
  const CARD = { ...ROW, next_step: "Choose a course and apply", documents: { done: 2, total: 9 } };

  it("asks one Stage with the filters and progress, and returns the cards in frontend naming", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 26, page: 2, page_size: 25, results: [CARD] }));

    const page = await fetchBoardStudents(
      { ...NO_STUDENT_FILTERS, search: "ani", country: "canada", stage: "offer" },
      "lead",
      2,
      fetchFn,
    );

    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      "/api/students/?q=ani&stage=lead&country=canada&progress=true&page=2",
    );
    expect(page.count).toBe(26);
    expect(page.students[0]).toMatchObject({
      name: "Anish Neupane",
      nextStep: "Choose a course and apply",
      documents: { done: 2, total: 9 },
      assignedCounsellor: { name: "Bikash Thapa" },
    });
  });

  it.each([
    { ...CARD, next_step: undefined },
    { ...CARD, documents: { done: -1, total: 9 } },
    { ...CARD, documents: { done: "2", total: 9 } },
    { ...CARD, stage: "<script>" },
  ])("rejects a card that is not what the API promises", async (bad) => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 1, page: 1, page_size: 25, results: [bad] }));

    await expect(fetchBoardStudents(NO_STUDENT_FILTERS, "lead", 1, fetchFn)).rejects.toThrow();
  });
});
