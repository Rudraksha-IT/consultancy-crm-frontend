import { fetchAttachable, refsOf } from "./attachments";
import { jsonResponse } from "../core/test-helpers";

const BROCHURE = {
  kind: "course_file",
  id: 3,
  name: "Master of IT brochure",
  file_name: "brochure.pdf",
  size: 1_048_576,
  group: "Deakin University, Master of IT",
};
const EXAMPLE = {
  kind: "document_example",
  id: 4,
  name: "sample.pdf",
  file_name: "sample.pdf",
  size: 2048,
  group: "Bank Statement",
};
const PASSPORT = {
  kind: "document_file",
  id: 9,
  name: "passport.pdf",
  file_name: "passport.pdf",
  size: 4096,
  group: "Passport",
};
const ANSWER = {
  course_files: [BROCHURE],
  document_examples: [EXAMPLE],
  documents: [PASSPORT],
  max_bytes: 10 * 1024 * 1024,
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

const pathOf = (fetchFn: ReturnType<typeof answering>) => fetchFn.mock.calls[0]?.[0];

describe("fetchAttachable", () => {
  it("reads what can go to one Student, in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(ANSWER));

    const files = await fetchAttachable({ studentId: 7 }, fetchFn);

    expect(pathOf(fetchFn)).toBe("/api/students/7/emails/attachable/");
    expect(files.courseFiles).toEqual([
      {
        kind: "course_file",
        id: 3,
        name: "Master of IT brochure",
        fileName: "brochure.pdf",
        size: 1_048_576,
        group: "Deakin University, Master of IT",
      },
    ]);
    expect(files.documentExamples.map((file) => file.id)).toEqual([4]);
    expect(files.documents.map((file) => file.id)).toEqual([9]);
  });

  it("reads what can go to many Students", async () => {
    const fetchFn = answering(jsonResponse({ ...ANSWER, documents: [] }));

    const files = await fetchAttachable("many", fetchFn);

    expect(pathOf(fetchFn)).toBe("/api/messages/bulk/attachable/");
    expect(files.documents).toEqual([]);
  });

  it.each([
    { ...ANSWER, course_files: [{ ...BROCHURE, kind: "computer_file" }] },
    { ...ANSWER, course_files: [{ ...BROCHURE, id: 0 }] },
    { ...ANSWER, course_files: [{ ...BROCHURE, size: -1 }] },
    { ...ANSWER, course_files: [{ ...BROCHURE, file_name: "" }] },
    { ...ANSWER, documents: undefined },
    { ...ANSWER, max_bytes: 50 * 1024 * 1024 },
    "files",
  ])("refuses a damaged answer %#", async (body) => {
    await expect(
      fetchAttachable({ studentId: 7 }, answering(jsonResponse(body))),
    ).rejects.toThrow();
  });
});

describe("refsOf", () => {
  it("keeps only each file's kind and id", () => {
    const file = {
      kind: "document_file" as const,
      id: 9,
      name: "passport.pdf",
      fileName: "passport.pdf",
      size: 4096,
      group: "Passport",
    };

    expect(refsOf([file])).toEqual([{ kind: "document_file", id: 9 }]);
  });
});
