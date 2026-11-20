import {
  deleteUniversity,
  fetchUniversity,
  fetchUpcomingIntakes,
  saveUniversityEdit,
  setCourseIntakes,
  UniversityEditRefusedError,
} from "./catalogueEdit";
import { ApiRequestError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";

const COURSE = {
  id: 11,
  university_id: 1,
  name: "Master of IT",
  level: "master",
  intakes: ["2027-03"],
  archived: false,
  documents: [{ id: 21, name: "CV" }],
  applications: 2,
  files: [],
  file_count: 0,
};
const UNIVERSITY = {
  id: 1,
  name: "Deakin University",
  country: "australia",
  archived: false,
  courses: [COURSE],
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function call(fetchFn: ReturnType<typeof answering>) {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  const body = init?.body;
  const sent: unknown = typeof body === "string" ? JSON.parse(body) : body;
  return { path, method: init?.method, body: sent };
}

const EDIT = {
  name: "Deakin University",
  country: "australia",
  archived: false,
  courses: [
    {
      id: 11,
      name: "Master of IT",
      level: "master",
      intakes: ["2027-03"],
      archived: false,
      documents: [21],
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
  deletedCourses: [12],
};

describe("fetchUniversity", () => {
  it("reads one university with how many applications use each course", async () => {
    const fetchFn = answering(jsonResponse(UNIVERSITY));

    const university = await fetchUniversity(1, fetchFn);

    expect(call(fetchFn).path).toBe("/api/catalogue/universities/1/");
    expect(university.courses[0]).toMatchObject({ id: 11, universityId: 1, applications: 2 });
  });

  it("refuses an answer without the application count", async () => {
    const withoutCount = Object.fromEntries(
      Object.entries(COURSE).filter(([key]) => key !== "applications"),
    );
    const fetchFn = answering(jsonResponse({ ...UNIVERSITY, courses: [withoutCount] }));

    await expect(fetchUniversity(1, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("saveUniversityEdit", () => {
  it("sends the whole page in API naming, a new course without an id", async () => {
    const fetchFn = answering(jsonResponse(UNIVERSITY));

    await saveUniversityEdit(1, EDIT, fetchFn);

    expect(call(fetchFn)).toEqual({
      path: "/api/catalogue/universities/1/",
      method: "PUT",
      body: {
        name: "Deakin University",
        country: "australia",
        archived: false,
        courses: [
          {
            id: 11,
            name: "Master of IT",
            level: "master",
            intakes: ["2027-03"],
            archived: false,
            documents: [21],
          },
          {
            name: "Bachelor of IT",
            level: "bachelor",
            intakes: ["2027-07"],
            archived: false,
            documents: [],
          },
        ],
        deleted_courses: [12],
      },
    });
  });

  it("names refused fields by university field and by course row", async () => {
    const fetchFn = answering(
      jsonResponse(
        {
          name: ["There's already a university with this name."],
          courses: { "1": { intakes: ["Add at least one intake, or archive the course."] } },
          deleted_courses: ["Used by 1 application, so it stays archived."],
        },
        400,
      ),
    );

    const refusal: unknown = await saveUniversityEdit(1, EDIT, fetchFn).catch((e: unknown) => e);

    expect(refusal).toBeInstanceOf(UniversityEditRefusedError);
    expect(refusal).toMatchObject({
      fields: { name: ["There's already a university with this name."] },
      rows: { 1: { intakes: ["Add at least one intake, or archive the course."] } },
      general: ["Used by 1 application, so it stays archived."],
    });
  });

  it("keeps a whole-list refusal of the courses as a general message", async () => {
    const fetchFn = answering(
      jsonResponse(
        { courses: ["A course here isn't one of this university's. Refresh the page."] },
        400,
      ),
    );

    const refusal: unknown = await saveUniversityEdit(1, EDIT, fetchFn).catch((e: unknown) => e);

    expect(refusal).toMatchObject({
      general: ["A course here isn't one of this university's. Refresh the page."],
    });
  });

  it("passes on any other failure", async () => {
    const fetchFn = answering(jsonResponse({}, 500));

    await expect(saveUniversityEdit(1, EDIT, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("deleteUniversity", () => {
  it("deletes it", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await deleteUniversity(1, fetchFn);

    expect(call(fetchFn)).toMatchObject({
      path: "/api/catalogue/universities/1/",
      method: "DELETE",
    });
  });

  it("rejects with the reason the server gives", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "Used by 2 applications, so it stays archived." }, 400),
    );

    await expect(deleteUniversity(1, fetchFn)).rejects.toThrow(
      "Used by 2 applications, so it stays archived.",
    );
  });
});

describe("setCourseIntakes", () => {
  it("sends only the intakes", async () => {
    const fetchFn = answering(jsonResponse(COURSE));

    await setCourseIntakes(11, ["2027-03", "2027-07"], fetchFn);

    expect(call(fetchFn)).toEqual({
      path: "/api/catalogue/courses/11/",
      method: "PATCH",
      body: { intakes: ["2027-03", "2027-07"] },
    });
  });
});

describe("fetchUpcomingIntakes", () => {
  it("reads the catalogue's upcoming intakes", async () => {
    const fetchFn = answering(jsonResponse({ intakes: ["2027-02", "2027-07"] }));

    expect(await fetchUpcomingIntakes(fetchFn)).toEqual(["2027-02", "2027-07"]);
    expect(call(fetchFn).path).toBe("/api/catalogue/intakes/");
  });

  it("refuses an intake that isn't a month", async () => {
    const fetchFn = answering(jsonResponse({ intakes: ["Feb 2027"] }));

    await expect(fetchUpcomingIntakes(fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});
