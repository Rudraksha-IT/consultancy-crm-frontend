import { addCourse, addUniversity, fetchUniversities, importCatalogue } from "./catalogue";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";

const COURSE = {
  id: 11,
  university_id: 1,
  name: "Master of Information Technology",
  level: "master",
  intakes: ["2027-03", "2027-07"],
  archived: false,
  documents: [{ id: 21, name: "CV" }],
  applications: 0,
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

describe("fetchUniversities", () => {
  it("asks for the filters and returns the page in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({ count: 30, page: 2, page_size: 25, results: [UNIVERSITY] }),
    );

    const page = await fetchUniversities({ search: "deakin", includeArchived: true }, 2, fetchFn);

    expect(call(fetchFn).path).toBe(
      "/api/catalogue/universities/?q=deakin&include_archived=true&page=2",
    );
    expect(page).toEqual({
      count: 30,
      page: 2,
      pageSize: 25,
      universities: [
        {
          ...UNIVERSITY,
          courses: [
            {
              id: 11,
              universityId: 1,
              name: "Master of Information Technology",
              level: "master",
              intakes: ["2027-03", "2027-07"],
              archived: false,
              documents: [{ id: 21, name: "CV" }],
              applications: 0,
            },
          ],
        },
      ],
    });
  });

  it.each([
    ["an unknown level", { ...UNIVERSITY, courses: [{ ...COURSE, level: "phd" }] }],
    ["a badly written intake", { ...UNIVERSITY, courses: [{ ...COURSE, intakes: ["Mar 2027"] }] }],
    ["an unknown country", { ...UNIVERSITY, country: "mars" }],
    [
      "a course document without a name",
      { ...UNIVERSITY, courses: [{ ...COURSE, documents: [{ id: 1 }] }] },
    ],
    ["a missing name", { ...UNIVERSITY, name: undefined }],
  ])("refuses an answer with %s", async (_, university) => {
    const fetchFn = answering(
      jsonResponse({ count: 1, page: 1, page_size: 25, results: [university] }),
    );

    await expect(
      fetchUniversities({ search: "", includeArchived: false }, 1, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("addUniversity", () => {
  it("posts the name and country", async () => {
    const fetchFn = answering(jsonResponse({ ...UNIVERSITY, courses: [] }, 201));

    const university = await addUniversity(
      { name: "Deakin University", country: "australia" },
      fetchFn,
    );

    expect(call(fetchFn)).toEqual({
      path: "/api/catalogue/universities/",
      method: "POST",
      body: { name: "Deakin University", country: "australia" },
    });
    expect(university.name).toBe("Deakin University");
  });

  it("turns refused fields into field errors", async () => {
    const fetchFn = answering(
      jsonResponse({ name: ["There's already a university with this name."] }, 400),
    );

    const failure = addUniversity({ name: "Deakin", country: "australia" }, fetchFn);

    await expect(failure).rejects.toEqual(
      new InvalidFieldsError({ name: ["There's already a university with this name."] }),
    );
  });

  it("passes on other failures", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "Only an Admin can change the Catalogue." }, 403),
    );

    const failure = addUniversity({ name: "Deakin", country: "australia" }, fetchFn);

    await expect(failure).rejects.toMatchObject({ status: 403 });
  });
});

describe("courses", () => {
  const input = { name: "Master of IT", level: "master", intakes: ["2027-03"], documents: [21] };

  it("adds a course to its university", async () => {
    const fetchFn = answering(jsonResponse(COURSE, 201));

    const course = await addCourse(1, input, fetchFn);

    expect(call(fetchFn)).toEqual({
      path: "/api/catalogue/universities/1/courses/",
      method: "POST",
      body: input,
    });
    expect(course.universityId).toBe(1);
  });

  it("turns refused fields into field errors", async () => {
    const fetchFn = answering(jsonResponse({ intakes: ["Add at least one intake."] }, 400));

    await expect(addCourse(1, input, fetchFn)).rejects.toEqual(
      new InvalidFieldsError({ intakes: ["Add at least one intake."] }),
    );
  });
});

describe("importCatalogue", () => {
  it("sends the file's text and returns the result in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({
        imported: 38,
        already_there: 4,
        failed: 1,
        problems: [{ row: 7, problem: "University name is empty." }],
      }),
    );

    const result = await importCatalogue("university,country\n", fetchFn);

    expect(call(fetchFn)).toEqual({
      path: "/api/catalogue/import/",
      method: "POST",
      body: { csv: "university,country\n" },
    });
    expect(result).toEqual({
      imported: 38,
      alreadyThere: 4,
      failed: 1,
      problems: [{ row: 7, problem: "University name is empty." }],
    });
  });

  it("names why the file as a whole was refused", async () => {
    const fetchFn = answering(jsonResponse({ csv: ["The file is empty."] }, 400));

    const refusal = importCatalogue("", fetchFn);

    await expect(refusal).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(refusal).rejects.toMatchObject({ fieldErrors: { csv: ["The file is empty."] } });
  });

  it.each([
    { imported: -1, already_there: 0, failed: 0, problems: [] },
    { imported: 1, already_there: 0, failed: 0, problems: [{ row: "7", problem: "x" }] },
    { imported: 1, already_there: 0, failed: 0 },
  ])("refuses an answer of the wrong shape (%j)", async (body) => {
    await expect(importCatalogue("a", answering(jsonResponse(body)))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});
