import { uid } from "@/test/ids";
import {
  addDocumentExample,
  deleteDocumentExampleForGood,
  ExampleRefusedError,
  fetchBinDocumentExampleLink,
  fetchDocumentExampleLink,
  removeDocumentExample,
  replaceDocumentExample,
  restoreDocumentExample,
  setDocumentInstruction,
} from "./documentExamples";
import {
  BinnedDocumentExampleSchema,
  BinPageSchema,
  ChecklistSchema,
  ConfiguredDocumentTypeSchema,
} from "./documentsTypes";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";

const EXAMPLE_ANSWER = {
  id: uid(52),
  file_name: "sample-bank-statement.pdf",
  content_type: "application/pdf",
  size: 1_157_120,
  uploaded_at: "2026-11-20T10:00:00+05:45",
};
const EXAMPLE = {
  id: uid(52),
  fileName: "sample-bank-statement.pdf",
  contentType: "application/pdf",
  size: 1_157_120,
  uploadedAt: "2026-11-20T10:00:00+05:45",
};
const TYPE_ANSWER = {
  id: uid(7),
  name: "Bank Statement",
  needed_by_everyone: true,
  usual_group: "visa",
  used_by: { countries: 0, courses: 0, students: 0, documents: 2 },
  instruction: "Last 6 months, stamped.",
  examples: [EXAMPLE_ANSWER],
  example_count: 2,
};
const LINK = { url: "https://files.test/document-examples/52.pdf?sig=1", expires_in: 300 };

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

function fieldErrorsOf(failure: unknown) {
  if (!(failure instanceof InvalidFieldsError)) throw new Error("Expected InvalidFieldsError");
  return failure.fieldErrors;
}

function aFile(): File {
  return new File(["%PDF-1.7"], "sample.pdf", { type: "application/pdf" });
}

describe("ConfiguredDocumentTypeSchema", () => {
  it("reads the instruction, the examples in use and how many there are counting the Bin", () => {
    const type = ConfiguredDocumentTypeSchema.parse(TYPE_ANSWER);

    expect(type.instruction).toBe("Last 6 months, stamped.");
    expect(type.examples).toEqual([EXAMPLE]);
    expect(type.exampleCount).toBe(2);
  });

  it("refuses an example with a size that isn't a number", () => {
    const bad = { ...TYPE_ANSWER, examples: [{ ...EXAMPLE_ANSWER, size: "big" }] };

    expect(ConfiguredDocumentTypeSchema.safeParse(bad).success).toBe(false);
  });
});

describe("ChecklistSchema", () => {
  const item = {
    document_type: { id: uid(7), name: "Bank Statement" },
    reason: "",
    is_required: true,
    added_for_student: false,
    group: "visa",
    state: "not_received",
    document: null,
    in_bin: [],
  };
  const checklist = { done: 0, total: 1, can_change: true, asked: [] };

  it("reads each item's instruction and examples", () => {
    const answer = {
      ...checklist,
      items: [{ ...item, instruction: "Stamped", examples: [EXAMPLE_ANSWER] }],
    };

    const [read] = ChecklistSchema.parse(answer).items;

    expect(read?.instruction).toBe("Stamped");
    expect(read?.examples).toEqual([EXAMPLE]);
  });

  it("reads an item without them as having none", () => {
    const [read] = ChecklistSchema.parse({ ...checklist, items: [item] }).items;

    expect(read?.instruction).toBe("");
    expect(read?.examples).toEqual([]);
  });
});

describe("setDocumentInstruction", () => {
  it("PUTs only the instruction and returns the type", async () => {
    const fetchFn = answering(jsonResponse(TYPE_ANSWER));

    const saved = await setDocumentInstruction(uid(7), "Last 6 months, stamped.", fetchFn);

    expect(call(fetchFn)).toEqual({
      path: `/api/configuration/document-types/${uid(7)}/instruction/`,
      method: "PUT",
      body: { instruction: "Last 6 months, stamped." },
    });
    expect(saved.instruction).toBe("Last 6 months, stamped.");
  });

  it("names a refused instruction", async () => {
    const message = "Ensure this field has no more than 500 characters.";
    const fetchFn = answering(jsonResponse({ instruction: [message] }, 400));

    const failure = await setDocumentInstruction(uid(7), "x", fetchFn).catch((e: unknown) => e);

    expect(fieldErrorsOf(failure)).toEqual({ instruction: [message] });
  });
});

describe("addDocumentExample", () => {
  it("POSTs the file as a form and returns the example", async () => {
    const fetchFn = answering(jsonResponse(EXAMPLE_ANSWER, 201));

    const saved = await addDocumentExample(uid(7), aFile(), fetchFn);

    const { path, method, body } = call(fetchFn);
    expect(path).toBe(`/api/configuration/document-types/${uid(7)}/examples/`);
    expect(method).toBe("POST");
    if (!(body instanceof FormData)) throw new Error("Expected a form to be sent");
    expect(body.get("file")).toBeInstanceOf(File);
    expect([...body.keys()]).toEqual(["file"]);
    expect(saved).toEqual(EXAMPLE);
  });

  it("names a refused file", async () => {
    const message = "An example must be a PDF, JPEG or PNG file. That one isn't.";
    const fetchFn = answering(jsonResponse({ file: [message] }, 400));

    const failure = await addDocumentExample(uid(7), aFile(), fetchFn).catch((e: unknown) => e);

    expect(fieldErrorsOf(failure)).toEqual({ file: [message] });
  });

  it("carries the server's one-sentence reason", async () => {
    const reason = "A document can have at most 3 example files. Remove one to add another.";
    const fetchFn = answering(jsonResponse({ detail: reason }, 400));

    const failure = await addDocumentExample(uid(7), aFile(), fetchFn).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ExampleRefusedError);
    expect(failure).toHaveProperty("message", reason);
  });

  it("passes on any other failure as it is", async () => {
    const fetchFn = answering(jsonResponse({ detail: "We couldn't store the file." }, 503));

    const failure = await addDocumentExample(uid(7), aFile(), fetchFn).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).not.toBeInstanceOf(ExampleRefusedError);
  });
});

describe("the rest of an example's calls", () => {
  it("replaces one by POSTing the new file to its replace path", async () => {
    const fetchFn = answering(jsonResponse({ ...EXAMPLE_ANSWER, id: uid(60) }, 201));

    const saved = await replaceDocumentExample(uid(52), aFile(), fetchFn);

    expect(call(fetchFn).path).toBe(`/api/configuration/document-examples/${uid(52)}/replace/`);
    expect(call(fetchFn).method).toBe("POST");
    expect(saved.id).toBe(uid(60));
  });

  it("removes one to the Bin with a DELETE", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await removeDocumentExample(uid(52), fetchFn);

    expect(call(fetchFn)).toMatchObject({
      path: `/api/configuration/document-examples/${uid(52)}/`,
      method: "DELETE",
    });
  });

  it.each(["open", "download"] as const)("asks for a link to %s one", async (action) => {
    const fetchFn = answering(jsonResponse(LINK));

    const url = await fetchDocumentExampleLink(uid(52), action, fetchFn);

    expect(call(fetchFn).path).toBe(`/api/documents/examples/${uid(52)}/link/?action=${action}`);
    expect(url).toBe(LINK.url);
  });

  it("refuses a link that isn't http or https", async () => {
    const fetchFn = answering(jsonResponse({ ...LINK, url: "javascript:alert(1)" }));

    await expect(fetchDocumentExampleLink(uid(52), "open", fetchFn)).rejects.toThrow();
  });

  it("restores one from the Bin with an empty POST", async () => {
    const fetchFn = answering(jsonResponse(EXAMPLE_ANSWER));

    expect(await restoreDocumentExample(uid(52), fetchFn)).toEqual(EXAMPLE);
    expect(call(fetchFn)).toEqual({
      path: `/api/documents/bin/document-examples/${uid(52)}/restore/`,
      method: "POST",
      body: {},
    });
  });

  it("passes on why a restore was refused for the Bin's own words", async () => {
    const reason = "This document already has 3 example files. Remove one first.";
    const fetchFn = answering(jsonResponse({ detail: reason }, 400));

    const failure = await restoreDocumentExample(uid(52), fetchFn).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).toHaveProperty("body", { detail: reason });
  });

  it("deletes one in the Bin for good", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await deleteDocumentExampleForGood(uid(52), fetchFn);

    expect(call(fetchFn)).toMatchObject({
      path: `/api/documents/bin/document-examples/${uid(52)}/`,
      method: "DELETE",
    });
  });

  it("asks for the Bin's own link to open one there", async () => {
    const fetchFn = answering(jsonResponse(LINK));

    expect(await fetchBinDocumentExampleLink(uid(52), fetchFn)).toBe(LINK.url);
    expect(call(fetchFn).path).toBe(
      `/api/documents/bin/document-examples/${uid(52)}/link/?action=open`,
    );
  });
});

describe("BinnedDocumentExampleSchema", () => {
  const answer = {
    kind: "document_example",
    document_example: { id: uid(56), file_name: "old-sample.pdf" },
    document_type: { id: uid(7), name: "Bank Statement" },
    by: { id: uid(1), name: "Anita Sharma" },
    at: "2026-10-20T09:40:00+05:45",
    reason: "Replaced",
  };

  it("reads an example in the Bin in frontend naming", () => {
    expect(BinnedDocumentExampleSchema.parse(answer)).toEqual({
      kind: "document_example",
      example: { id: uid(56), fileName: "old-sample.pdf" },
      documentType: { id: uid(7), name: "Bank Statement" },
      bin: { by: { id: uid(1), name: "Anita Sharma" }, at: answer.at, reason: "Replaced" },
    });
  });

  it("is read as one of the Bin page's rows", () => {
    const page = BinPageSchema.parse({ count: 1, page: 1, page_size: 25, results: [answer] });

    expect(page.items[0]).toMatchObject({ kind: "document_example" });
  });
});
