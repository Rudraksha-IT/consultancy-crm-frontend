import { uid } from "@/test/ids";
import { CatalogueRefusedError } from "./catalogueEdit";
import {
  binCourseFile,
  deleteCourseFileForGood,
  fetchBinCourseFileLink,
  fetchCourseFileLink,
  renameCourseFile,
  restoreCourseFile,
  uploadCourseFile,
} from "./courseFiles";
import { BinnedCourseFileSchema } from "./courseFileTypes";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";

const ANSWER = {
  id: uid(31),
  name: "Deakin IT brochure",
  file_name: "deakin-it.pdf",
  size: 2_516_582,
  uploaded_at: "2026-11-19T10:00:00+05:45",
};
const COURSE_FILE = {
  id: uid(31),
  name: "Deakin IT brochure",
  fileName: "deakin-it.pdf",
  size: 2_516_582,
  uploadedAt: "2026-11-19T10:00:00+05:45",
};
const LINK = { url: "https://files.test/course-files/31.pdf?sig=1", expires_in: 300 };

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function call(fetchFn: ReturnType<typeof answering>) {
  const [path, init = {}] = fetchFn.mock.calls[0] ?? [];
  return { path, method: init.method ?? "GET", body: parsed(init.body) };
}

function parsed(body: unknown): unknown {
  return typeof body === "string" ? JSON.parse(body) : body;
}

/** The thrown error's field errors; fails the test when it threw something else. */
function fieldErrorsOf(failure: unknown) {
  if (!(failure instanceof InvalidFieldsError)) throw new Error("Expected InvalidFieldsError");
  return failure.fieldErrors;
}

function pdf(): File {
  return new File(["%PDF-1.7"], "deakin-it.pdf", { type: "application/pdf" });
}

describe("uploadCourseFile", () => {
  it("POSTs the PDF and its name as a form, and returns the Course File", async () => {
    const fetchFn = answering(jsonResponse(ANSWER, 201));

    const saved = await uploadCourseFile(uid(11), pdf(), "Deakin IT brochure", fetchFn);

    const { path, method, body } = call(fetchFn);
    expect(path).toBe(`/api/catalogue/courses/${uid(11)}/files/`);
    expect(method).toBe("POST");
    if (!(body instanceof FormData)) throw new Error("Expected a form to be sent");
    expect(body.get("name")).toBe("Deakin IT brochure");
    expect(body.get("file")).toBeInstanceOf(File);
    expect(saved).toEqual(COURSE_FILE);
  });

  it("names the refused fields", async () => {
    const fetchFn = answering(
      jsonResponse({ file: ["The file is too big. A Course File can be at most 5 MB."] }, 400),
    );

    const failure = await uploadCourseFile(uid(11), pdf(), "x", fetchFn).catch(
      (error: unknown) => error,
    );

    expect(fieldErrorsOf(failure)).toEqual({
      file: ["The file is too big. A Course File can be at most 5 MB."],
    });
  });

  it("carries the server's one-sentence reason", async () => {
    const reason = "This course is archived. Restore it before adding files.";
    const fetchFn = answering(jsonResponse({ detail: reason }, 400));

    const failure = await uploadCourseFile(uid(11), pdf(), "x", fetchFn).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(CatalogueRefusedError);
    expect(failure).toHaveProperty("message", reason);
  });

  it("passes on any other failure as it is", async () => {
    const fetchFn = answering(jsonResponse({ detail: "We couldn't store the file." }, 503));

    const failure = await uploadCourseFile(uid(11), pdf(), "x", fetchFn).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).not.toBeInstanceOf(CatalogueRefusedError);
  });

  it("refuses an answer that isn't a Course File", async () => {
    const fetchFn = answering(jsonResponse({ ...ANSWER, size: "big" }, 201));

    await expect(uploadCourseFile(uid(11), pdf(), "x", fetchFn)).rejects.toThrow();
  });
});

describe("renameCourseFile", () => {
  it("PATCHes only the name", async () => {
    const fetchFn = answering(jsonResponse({ ...ANSWER, name: "IT guide" }));

    const saved = await renameCourseFile(uid(31), "IT guide", fetchFn);

    expect(call(fetchFn)).toEqual({
      path: `/api/catalogue/course-files/${uid(31)}/`,
      method: "PATCH",
      body: { name: "IT guide" },
    });
    expect(saved.name).toBe("IT guide");
  });

  it("names a refused name", async () => {
    const fetchFn = answering(jsonResponse({ name: ["Give it a name."] }, 400));

    const failure = await renameCourseFile(uid(31), "", fetchFn).catch((error: unknown) => error);

    expect(fieldErrorsOf(failure)).toEqual({
      name: ["Give it a name."],
    });
  });
});

describe("the rest of a Course File's calls", () => {
  it("puts one in the Bin with a DELETE", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await binCourseFile(uid(31), fetchFn);

    expect(call(fetchFn)).toMatchObject({
      path: `/api/catalogue/course-files/${uid(31)}/`,
      method: "DELETE",
    });
  });

  it.each(["open", "download"] as const)("asks for a link to %s one", async (action) => {
    const fetchFn = answering(jsonResponse(LINK));

    const url = await fetchCourseFileLink(uid(31), action, fetchFn);

    expect(call(fetchFn).path).toBe(
      `/api/catalogue/course-files/${uid(31)}/link/?action=${action}`,
    );
    expect(url).toBe(LINK.url);
  });

  it("refuses a link that isn't http or https", async () => {
    const fetchFn = answering(jsonResponse({ ...LINK, url: "javascript:alert(1)" }));

    await expect(fetchCourseFileLink(uid(31), "open", fetchFn)).rejects.toThrow();
  });

  it("restores one from the Bin with an empty POST", async () => {
    const fetchFn = answering(jsonResponse(ANSWER));

    const restored = await restoreCourseFile(uid(31), fetchFn);

    expect(call(fetchFn)).toEqual({
      path: `/api/documents/bin/course-files/${uid(31)}/restore/`,
      method: "POST",
      body: {},
    });
    expect(restored).toEqual(COURSE_FILE);
  });

  it("deletes one in the Bin for good", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await deleteCourseFileForGood(uid(31), fetchFn);

    expect(call(fetchFn)).toMatchObject({
      path: `/api/documents/bin/course-files/${uid(31)}/`,
      method: "DELETE",
    });
  });

  it("asks for the Bin's own link to open one there", async () => {
    const fetchFn = answering(jsonResponse(LINK));

    expect(await fetchBinCourseFileLink(uid(31), fetchFn)).toBe(LINK.url);
    expect(call(fetchFn).path).toBe(`/api/documents/bin/course-files/${uid(31)}/link/?action=open`);
  });
});

describe("BinnedCourseFileSchema", () => {
  it("reads a Course File in the Bin in frontend naming", () => {
    const parsed = BinnedCourseFileSchema.parse({
      kind: "course_file",
      course_file: { id: uid(31), name: "Deakin IT brochure", file_name: "deakin-it.pdf" },
      university: { id: uid(1), name: "Deakin University" },
      course: { id: uid(11), name: "Master of IT" },
      by: { id: uid(5), name: "Bikash Thapa" },
      at: "2026-11-02T10:00:00+05:45",
      reason: "Deleted from the Catalogue",
    });

    expect(parsed).toEqual({
      kind: "course_file",
      courseFile: { id: uid(31), name: "Deakin IT brochure", fileName: "deakin-it.pdf" },
      university: { id: uid(1), name: "Deakin University" },
      course: { id: uid(11), name: "Master of IT" },
      bin: {
        by: { id: uid(5), name: "Bikash Thapa" },
        at: "2026-11-02T10:00:00+05:45",
        reason: "Deleted from the Catalogue",
      },
    });
  });
});
