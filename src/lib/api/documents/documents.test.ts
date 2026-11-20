import {
  addDocumentFiles,
  addCountryDocument,
  addDocumentType,
  addPickedDocumentType,
  checkDocument,
  deleteForGood,
  dropStudentDocument,
  fetchBin,
  fetchBinFileLink,
  fetchChecklist,
  fetchCountryLists,
  fetchDocumentLink,
  fetchDocumentTypes,
  fetchPaperwork,
  fetchPickableDocumentTypes,
  putInBin,
  removeDocumentType,
  restoreFromBin,
  requirementRefusal,
  setCountryList,
  setNeededByEveryone,
  setStudentDocuments,
  takeOutOfBin,
  uploadDocument,
} from "./documents";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";
import { uid } from "@/test/ids";

const FILE = {
  id: uid(41),
  file_name: "passport.pdf",
  content_type: "application/pdf",
  size: 2048,
  uploaded_at: "2026-11-01T10:00:00+05:45",
  uploaded_by: { id: 5, name: "Bikash Thapa" },
};

const DOCUMENT = {
  id: uid(31),
  files: [FILE],
  verification: "pending",
  rejection_reason: "",
  link: null,
  uploaded_at: "2026-11-01T10:00:00+05:45",
  uploaded_by: { id: 5, name: "Bikash Thapa" },
};

const CHECKLIST = {
  done: 1,
  total: 2,
  can_change: true,
  asked: [],
  items: [
    {
      document_type: { id: 1, name: "Passport" },
      reason: "",
      is_required: true,
      added_for_student: false,
      group: "applying",
      state: "waiting",
      document: DOCUMENT,
    },
    {
      document_type: { id: 2, name: "Citizenship" },
      reason: "",
      is_required: true,
      added_for_student: false,
      group: "applying",
      state: "not_received",
      document: null,
    },
  ],
};

const PAPERWORK = {
  count: 1,
  page: 1,
  page_size: 25,
  totals: { rejected: 1, waiting: 0, missing: 2, verified: 5 },
  results: [
    {
      student: {
        id: uid(7),
        name: "Sita Gurung",
        stage: "applying",
        country: "australia",
        assigned_counsellor: { id: 5, name: "Bikash Thapa" },
      },
      done: 5,
      total: 8,
      rejected: 1,
      waiting: 0,
      missing: 2,
      verified: 5,
    },
  ],
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function jsonBody(init: RequestInit | undefined): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

function sentInit(fetchFn: ReturnType<typeof answering>) {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  return { path, init };
}

describe("fetchChecklist", () => {
  it("returns the checklist in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(CHECKLIST));

    const checklist = await fetchChecklist(uid(7), fetchFn);

    expect(sentInit(fetchFn).path).toBe(`/api/students/${uid(7)}/documents/`);
    expect(checklist.canChange).toBe(true);
    expect(checklist.asked).toEqual([]);
    expect(checklist.items[0]).toEqual({
      documentType: { id: 1, name: "Passport" },
      reason: "",
      isRequired: true,
      addedForStudent: false,
      group: "applying",
      state: "waiting",
      document: {
        id: uid(31),
        files: [
          {
            id: uid(41),
            fileName: "passport.pdf",
            contentType: "application/pdf",
            size: 2048,
            uploadedAt: "2026-11-01T10:00:00+05:45",
            uploadedBy: { id: 5, name: "Bikash Thapa" },
          },
        ],
        binnedFiles: [],
        verification: "pending",
        rejectionReason: "",
        link: null,
        uploadedAt: "2026-11-01T10:00:00+05:45",
        uploadedBy: { id: 5, name: "Bikash Thapa" },
      },
      inBin: [],
      instruction: "",
      examples: [],
    });
  });

  it("reads why a Document was rejected and what it is linked to", async () => {
    const rejected = {
      ...DOCUMENT,
      verification: "rejected",
      rejection_reason: "Blurred.",
      link: { kind: "visa", id: uid(3), university: "Deakin University" },
    };
    const items = [{ ...CHECKLIST.items[0], state: "rejected", document: rejected }];
    const fetchFn = answering(jsonResponse({ ...CHECKLIST, items }));

    const checklist = await fetchChecklist(uid(7), fetchFn);

    expect(checklist.items[0]?.document).toMatchObject({
      rejectionReason: "Blurred.",
      link: { kind: "visa", id: uid(3), university: "Deakin University" },
    });
  });

  it("refuses an answer with an unknown kind of link", async () => {
    const linked = { ...DOCUMENT, link: { kind: "payment", id: uid(3), university: "X" } };
    const items = [{ ...CHECKLIST.items[0], document: linked }];
    const fetchFn = answering(jsonResponse({ ...CHECKLIST, items }));

    await expect(fetchChecklist(uid(7), fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("reads every file of a Document, in order (issue 78)", async () => {
    const back = { ...FILE, id: uid(42), file_name: "back.jpg", content_type: "image/jpeg" };
    const items = [{ ...CHECKLIST.items[0], document: { ...DOCUMENT, files: [FILE, back] } }];
    const fetchFn = answering(jsonResponse({ ...CHECKLIST, items }));

    const checklist = await fetchChecklist(uid(7), fetchFn);

    expect(checklist.items[0]?.document?.files.map((file) => file.fileName)).toEqual([
      "passport.pdf",
      "back.jpg",
    ]);
  });

  it("refuses a Document answered without its files", async () => {
    const withoutFiles = Object.fromEntries(
      Object.entries(DOCUMENT).filter(([key]) => key !== "files"),
    );
    const items = [{ ...CHECKLIST.items[0], document: withoutFiles }];
    const fetchFn = answering(jsonResponse({ ...CHECKLIST, items }));

    await expect(fetchChecklist(uid(7), fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("refuses an answer with an unknown state", async () => {
    const items = [{ ...CHECKLIST.items[1], state: "lost" }];
    const fetchFn = answering(jsonResponse({ ...CHECKLIST, items }));

    await expect(fetchChecklist(uid(7), fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("uploadDocument", () => {
  it("POSTs the type and the file as a form, letting the browser set the boundary", async () => {
    const fetchFn = answering(jsonResponse(CHECKLIST, 201));
    const file = new File(["%PDF-1.7"], "passport.pdf", { type: "application/pdf" });

    const checklist = await uploadDocument(uid(7), 1, [file], fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe(`/api/students/${uid(7)}/documents/`);
    expect(init?.method).toBe("POST");
    const body = init?.body;
    if (!(body instanceof FormData)) throw new Error("expected a form");
    expect(body.get("document_type")).toBe("1");
    expect(body.get("file")).toBe(file);
    expect(new Headers(init?.headers).has("content-type")).toBe(false);
    expect(checklist.done).toBe(1);
  });

  it.each([
    [{ kind: "application", id: uid(11) } as const, "application", uid(11)],
    [{ kind: "visa", id: uid(3) } as const, "visa", uid(3)],
  ])("sends the link as its own field: %o", async (link, field, value) => {
    const fetchFn = answering(jsonResponse(CHECKLIST, 201));

    await uploadDocument(uid(7), 1, [new File(["%PDF"], "a.pdf")], fetchFn, link);

    const body = sentInit(fetchFn).init?.body;
    if (!(body instanceof FormData)) throw new Error("expected a form");
    expect(body.get(field)).toBe(value);
    expect([...body.keys()].sort()).toEqual(["document_type", "file", field].sort());
  });

  it("sends every chosen file under the same field, in order (issue 78)", async () => {
    const fetchFn = answering(jsonResponse(CHECKLIST, 201));
    const front = new File(["%PDF"], "front.pdf");
    const back = new File(["%PDF"], "back.pdf");

    await uploadDocument(uid(7), 1, [front, back], fetchFn);

    const body = sentInit(fetchFn).init?.body;
    if (!(body instanceof FormData)) throw new Error("expected a form");
    expect(body.getAll("file")).toEqual([front, back]);
  });

  it("sends no link field for a Document of the Student only", async () => {
    const fetchFn = answering(jsonResponse(CHECKLIST, 201));

    await uploadDocument(uid(7), 1, [new File(["%PDF"], "a.pdf")], fetchFn);

    const body = sentInit(fetchFn).init?.body;
    if (!(body instanceof FormData)) throw new Error("expected a form");
    expect([...body.keys()].sort()).toEqual(["document_type", "file"]);
  });

  it("names a refused link", async () => {
    const fetchFn = answering(
      jsonResponse({ application: ["Choose one of this Student's applications."] }, 400),
    );

    const failure: unknown = await uploadDocument(uid(7), 1, [new File(["x"], "a.pdf")], fetchFn, {
      kind: "application",
      id: uid(9),
    }).catch((error: unknown) => error);

    if (!(failure instanceof InvalidFieldsError)) throw new Error("expected field errors");
    expect(failure.fieldErrors).toEqual({
      linkApplication: ["Choose one of this Student's applications."],
    });
  });

  it("names the refused fields", async () => {
    const fetchFn = answering(
      jsonResponse({ file: ["Upload a PDF, JPG or PNG file."], document_type: ["Choose."] }, 400),
    );

    const failure: unknown = await uploadDocument(
      uid(7),
      1,
      [new File(["x"], "a.pdf")],
      fetchFn,
    ).catch((error: unknown) => error);

    if (!(failure instanceof InvalidFieldsError)) throw new Error("expected field errors");
    expect(failure.fieldErrors).toEqual({
      file: ["Upload a PDF, JPG or PNG file."],
      documentType: ["Choose."],
    });
  });

  it("passes other failures on", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Not your Student." }, 403));

    await expect(
      uploadDocument(uid(7), 1, [new File(["x"], "a.pdf")], fetchFn),
    ).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("addDocumentFiles", () => {
  it("POSTs every file to the Document as a form and returns the checklist", async () => {
    const fetchFn = answering(jsonResponse(CHECKLIST, 201));
    const pages = [new File(["%PDF"], "page-2.pdf"), new File(["%PDF"], "page-3.pdf")];

    const checklist = await addDocumentFiles(uid(7), uid(31), pages, fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe(`/api/students/${uid(7)}/documents/${uid(31)}/files/`);
    expect(init?.method).toBe("POST");
    const body = init?.body;
    if (!(body instanceof FormData)) throw new Error("expected a form");
    expect([...body.keys()]).toEqual(["file", "file"]);
    expect(body.getAll("file")).toEqual(pages);
    expect(new Headers(init?.headers).has("content-type")).toBe(false);
    expect(checklist.done).toBe(1);
  });

  it("names refused files", async () => {
    const fetchFn = answering(jsonResponse({ file: ["Upload at most 10 files at once."] }, 400));

    const failure: unknown = await addDocumentFiles(
      uid(7),
      uid(31),
      [new File(["x"], "a.pdf")],
      fetchFn,
    ).catch((error: unknown) => error);

    if (!(failure instanceof InvalidFieldsError)) throw new Error("expected field errors");
    expect(failure.fieldErrors).toEqual({ file: ["Upload at most 10 files at once."] });
  });

  it("passes other refusals on with the server's reason", async () => {
    const detail = "This document was rejected. Upload a new copy instead of adding a file.";
    const fetchFn = answering(jsonResponse({ detail }, 400));

    const failure = addDocumentFiles(uid(7), uid(31), [new File(["x"], "a.pdf")], fetchFn);

    await expect(failure).rejects.toBeInstanceOf(ApiRequestError);
    await expect(failure).rejects.toMatchObject({ body: { detail } });
  });
});

describe("checkDocument", () => {
  it("POSTs that a Document is correct and returns the checklist", async () => {
    const fetchFn = answering(jsonResponse(CHECKLIST));

    const checklist = await checkDocument(uid(7), uid(31), { verification: "verified" }, fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe(`/api/students/${uid(7)}/documents/${uid(31)}/verification/`);
    expect(init?.method).toBe("POST");
    expect(jsonBody(init)).toEqual({ verification: "verified" });
    expect(checklist.done).toBe(1);
  });

  it("POSTs a rejection with its reason", async () => {
    const fetchFn = answering(jsonResponse(CHECKLIST));

    await checkDocument(uid(7), uid(31), { verification: "rejected", reason: "Blurred." }, fetchFn);

    expect(jsonBody(sentInit(fetchFn).init)).toEqual({
      verification: "rejected",
      reason: "Blurred.",
    });
  });

  it("names a refused reason", async () => {
    const fetchFn = answering(jsonResponse({ reason: ["Say why the document is rejected."] }, 400));

    const failure: unknown = await checkDocument(
      uid(7),
      uid(31),
      { verification: "rejected", reason: "" },
      fetchFn,
    ).catch((error: unknown) => error);

    if (!(failure instanceof InvalidFieldsError)) throw new Error("expected field errors");
    expect(failure.fieldErrors).toEqual({ reason: ["Say why the document is rejected."] });
  });

  it("passes other failures on", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "This document has already been checked." }, 400),
    );

    await expect(
      checkDocument(uid(7), uid(31), { verification: "verified" }, fetchFn),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("fetchDocumentLink", () => {
  it("asks for an open or download link and returns it", async () => {
    const fetchFn = answering(
      jsonResponse({
        url: `https://files.test/abc/documents/${uid(7)}/x.pdf?sig=1`,
        expires_in: 300,
      }),
    );

    const url = await fetchDocumentLink(uid(7), uid(31), uid(41), "download", fetchFn);

    expect(sentInit(fetchFn).path).toBe(
      `/api/students/${uid(7)}/documents/${uid(31)}/files/${uid(41)}/link/?action=download`,
    );
    expect(url).toBe(`https://files.test/abc/documents/${uid(7)}/x.pdf?sig=1`);
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "not a link"])(
    "never returns a link that isn't a web address: %s",
    async (url) => {
      const fetchFn = answering(jsonResponse({ url, expires_in: 300 }));

      await expect(
        fetchDocumentLink(uid(7), uid(31), uid(41), "open", fetchFn),
      ).rejects.toBeInstanceOf(ApiRequestError);
    },
  );
});

describe("fetchPaperwork", () => {
  it("asks for one page of a scope and returns it in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(PAPERWORK));

    const page = await fetchPaperwork({ scope: "mine", page: 2, onlyWaiting: false }, fetchFn);

    expect(sentInit(fetchFn).path).toBe("/api/documents/students/?scope=mine&page=2");
    expect(page.pageSize).toBe(25);
    expect(page.totals).toEqual({ rejected: 1, waiting: 0, missing: 2, verified: 5 });
    expect(page.rows[0]?.student.assignedCounsellor).toEqual({ id: 5, name: "Bikash Thapa" });
  });

  it("asks only for Students with documents waiting to be checked", async () => {
    const fetchFn = answering(jsonResponse(PAPERWORK));

    await fetchPaperwork({ scope: "everyone", page: 1, onlyWaiting: true }, fetchFn);

    expect(sentInit(fetchFn).path).toBe(
      "/api/documents/students/?scope=everyone&page=1&waiting=true",
    );
  });
});

describe("Document Types", () => {
  it("lists them in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({
        results: [
          {
            id: 1,
            name: "Passport",
            needed_by_everyone: true,
            usual_group: "applying",
            used_by: { countries: 2, courses: 6, students: 1, documents: 4 },
          },
        ],
      }),
    );

    expect(await fetchDocumentTypes(fetchFn)).toEqual([
      {
        id: 1,
        name: "Passport",
        neededByEveryone: true,
        usualGroup: "applying",
        usedBy: { countries: 2, courses: 6, students: 1, documents: 4 },
        instruction: "",
        examples: [],
        exampleCount: 0,
      },
    ]);
  });

  it("adds one", async () => {
    const fetchFn = answering(
      jsonResponse(
        {
          id: 9,
          name: "Police report",
          needed_by_everyone: false,
          usual_group: "visa",
          used_by: { countries: 0, courses: 0, students: 0, documents: 0 },
        },
        201,
      ),
    );

    const added = await addDocumentType("Police report", false, fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe("/api/configuration/document-types/");
    // No usual group is sent: the server makes it Applying (issue 97).
    expect(jsonBody(init)).toEqual({ name: "Police report", needed_by_everyone: false });
    expect(added).toMatchObject({ id: 9, usualGroup: "visa" });
  });

  it("names a refused name", async () => {
    const message = "There is already a document with this name.";
    const fetchFn = answering(jsonResponse({ name: [message] }, 400));

    await expect(addDocumentType("Passport", true, fetchFn)).rejects.toMatchObject({
      fieldErrors: { name: [message] },
    });
  });

  it("passes other failures on when adding", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Only an Admin." }, 403));

    await expect(addDocumentType("CV", true, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("moves one onto or off every checklist", async () => {
    const fetchFn = answering(
      jsonResponse({
        id: 8,
        name: "Sponsor Letter",
        needed_by_everyone: false,
        usual_group: "visa",
        used_by: { countries: 0, courses: 0, students: 0, documents: 0 },
      }),
    );

    const moved = await setNeededByEveryone(8, false, fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe("/api/configuration/document-types/8/");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ needed_by_everyone: false }));
    expect(moved.neededByEveryone).toBe(false);
  });
});

describe("Country document lists (issue 80)", () => {
  const AUSTRALIA = {
    country: "australia",
    documents: [
      { document_type: { id: 26, name: "Genuine Student statement" }, group: "statements" },
      { document_type: { id: 24, name: "Police report" }, group: "visa" },
    ],
  };

  it("lists every Country's list in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({ results: [AUSTRALIA, { country: "uk", documents: [] }] }),
    );

    const lists = await fetchCountryLists(fetchFn);

    expect(sentInit(fetchFn).path).toBe("/api/configuration/document-lists/");
    expect(lists).toEqual([
      {
        country: "australia",
        documents: [
          { documentType: { id: 26, name: "Genuine Student statement" }, group: "statements" },
          { documentType: { id: 24, name: "Police report" }, group: "visa" },
        ],
      },
      { country: "uk", documents: [] },
    ]);
  });

  it("PUTs one Country's whole list and returns it", async () => {
    const fetchFn = answering(jsonResponse(AUSTRALIA));

    const saved = await setCountryList(
      "australia",
      [
        { typeId: 26, group: "statements" },
        { typeId: 24, group: "visa" },
      ],
      fetchFn,
    );

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe("/api/configuration/document-lists/australia/");
    expect(init?.method).toBe("PUT");
    expect(jsonBody(init)).toEqual({
      documents: [
        { document_type: 26, group: "statements" },
        { document_type: 24, group: "visa" },
      ],
    });
    expect(saved.documents).toHaveLength(2);
  });

  it("makes a new document on one Country's list and returns both", async () => {
    const fetchFn = answering(
      jsonResponse(
        {
          document_type: {
            id: 30,
            name: "Police clearance",
            needed_by_everyone: false,
            usual_group: "statements",
            used_by: { countries: 1, courses: 0, students: 0, documents: 0 },
          },
          list: {
            country: "uk",
            documents: [
              { document_type: { id: 30, name: "Police clearance" }, group: "statements" },
            ],
          },
        },
        201,
      ),
    );

    const made = await addCountryDocument("uk", "Police clearance", "statements", fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe("/api/configuration/document-lists/uk/new-document/");
    expect(init?.method).toBe("POST");
    expect(jsonBody(init)).toEqual({ name: "Police clearance", group: "statements" });
    expect(made.documentType).toMatchObject({ id: 30, usualGroup: "statements" });
    expect(made.list).toEqual({
      country: "uk",
      documents: [{ documentType: { id: 30, name: "Police clearance" }, group: "statements" }],
    });
  });

  it("names a refused new document's name", async () => {
    const message = "Police clearance is already on UK's list.";
    const fetchFn = answering(jsonResponse({ name: [message] }, 400));

    await expect(
      addCountryDocument("uk", "police clearance", "visa", fetchFn),
    ).rejects.toMatchObject({ fieldErrors: { name: [message] } });
  });

  it("refuses a new document's answer of the wrong shape", async () => {
    const fetchFn = answering(jsonResponse({ document_type: { id: 1 } }, 201));

    await expect(addCountryDocument("uk", "CV", "visa", fetchFn)).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it.each([
    { results: [{ country: "nepal", documents: [] }] },
    {
      results: [
        { country: "uk", documents: [{ document_type: { id: 1, name: "x" }, group: "uni" }] },
      ],
    },
    { results: [{ country: "uk" }] },
  ])("refuses an answer of the wrong shape (%j)", async (body) => {
    await expect(fetchCountryLists(answering(jsonResponse(body)))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it("reads the server's reason for refusing a list", () => {
    const error = new ApiRequestError("/x", 400, {
      documents: ["Passport is already needed by every Student."],
    });

    expect(requirementRefusal(error)).toBe("Passport is already needed by every Student.");
  });
});

describe("a checklist item's group", () => {
  it("is null for an Other document, and a bad group is refused", async () => {
    const other = {
      ...CHECKLIST.items[1],
      is_required: false,
      group: null,
    };
    const ok = await fetchChecklist(
      uid(7),
      answering(jsonResponse({ ...CHECKLIST, items: [other] })),
    );
    const bad = { ...CHECKLIST, items: [{ ...other, group: "university" }] };

    expect(ok.items[0]?.group).toBeNull();
    await expect(fetchChecklist(uid(7), answering(jsonResponse(bad)))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe("Removing a Document Type", () => {
  it("DELETEs it", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await removeDocumentType(9, fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe("/api/configuration/document-types/9/");
    expect(init?.method).toBe("DELETE");
  });

  it("passes a refusal on with the server's reason", async () => {
    const detail = "This document is asked for or has files, so it can't be removed.";
    const fetchFn = answering(jsonResponse({ detail }, 400));

    const error: unknown = await removeDocumentType(9, fetchFn).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(requirementRefusal(error)).toBe(detail);
  });
});

describe("Document pickers", () => {
  it("list every type in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({
        results: [{ id: 20, name: "CV", needed_by_everyone: false, usual_group: "applying" }],
      }),
    );

    expect(await fetchPickableDocumentTypes(fetchFn)).toEqual([
      { id: 20, name: "CV", neededByEveryone: false, usualGroup: "applying" },
    ]);
    expect(sentInit(fetchFn).path).toBe("/api/documents/types/");
  });

  it("add a name not on the list", async () => {
    const fetchFn = answering(
      jsonResponse(
        { id: 21, name: "Portfolio", needed_by_everyone: false, usual_group: "applying" },
        201,
      ),
    );

    const added = await addPickedDocumentType("Portfolio", fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe("/api/documents/types/");
    expect(init?.method).toBe("POST");
    expect(jsonBody(init)).toEqual({ name: "Portfolio" });
    expect(added).toEqual({
      id: 21,
      name: "Portfolio",
      neededByEveryone: false,
      usualGroup: "applying",
    });
  });

  it("name a refused name", async () => {
    const message = "Ensure this field has no more than 80 characters.";
    const fetchFn = answering(jsonResponse({ name: [message] }, 400));

    await expect(addPickedDocumentType("x", fetchFn)).rejects.toMatchObject({
      fieldErrors: { name: [message] },
    });
  });
});

describe("Documents asked for one Student", () => {
  it("PUTs the whole list and returns the checklist", async () => {
    const fetchFn = answering(jsonResponse({ ...CHECKLIST, asked: [20] }));

    const checklist = await setStudentDocuments(uid(7), [20], fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe(`/api/students/${uid(7)}/documents/asked/`);
    expect(init?.method).toBe("PUT");
    expect(jsonBody(init)).toEqual({ document_types: [20] });
    expect(checklist.asked).toEqual([20]);
  });

  it("DELETEs one that is not needed and returns the checklist", async () => {
    const fetchFn = answering(jsonResponse(CHECKLIST));

    const checklist = await dropStudentDocument(uid(7), 20, fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe(`/api/students/${uid(7)}/documents/asked/20/`);
    expect(init?.method).toBe("DELETE");
    expect(checklist.total).toBe(2);
  });

  it("reads the server's reason from a refused list or a refused drop", () => {
    const reason = "A file is already uploaded for CV, so it stays on the checklist.";
    const asList = new ApiRequestError("/x", 400, { document_types: [reason] });
    const asDetail = new ApiRequestError("/x", 400, { detail: reason });

    expect(requirementRefusal(asList)).toBe(reason);
    expect(requirementRefusal(asDetail)).toBe(reason);
    expect(requirementRefusal(new ApiRequestError("/x", 403, { detail: "No." }))).toBeNull();
    expect(requirementRefusal(new Error("boom"))).toBeNull();
    expect(requirementRefusal(new ApiRequestError("/x", 400, { other: [1] }))).toBeNull();
  });
});

const BIN_NOTE = {
  by: { id: 5, name: "Bikash Thapa" },
  at: "2026-11-02T10:00:00+05:45",
  reason: "Blurry scan",
};

const BINNED_CHECKLIST = {
  ...CHECKLIST,
  items: [
    {
      ...CHECKLIST.items[0],
      document: {
        ...DOCUMENT,
        binned_files: [{ id: uid(42), file_name: "page-2.pdf", bin: BIN_NOTE }],
      },
      in_bin: [{ id: uid(30), files: [{ id: uid(40), file_name: "old.pdf" }], bin: BIN_NOTE }],
    },
  ],
};

const BIN_PAGE = {
  count: 1,
  page: 1,
  page_size: 25,
  results: [
    {
      kind: "file",
      document: { id: uid(31), name: "Passport" },
      student: { id: uid(7), name: "Sita Gurung" },
      files: [{ id: uid(42), file_name: "page-2.pdf" }],
      ...BIN_NOTE,
    },
  ],
};

describe("the Bin", () => {
  it("reads what is in the Bin on the checklist", async () => {
    const checklist = await fetchChecklist(uid(7), answering(jsonResponse(BINNED_CHECKLIST)));

    const [passport] = checklist.items;
    expect(passport?.inBin).toEqual([
      {
        id: uid(30),
        files: [{ id: uid(40), fileName: "old.pdf" }],
        bin: { by: { id: 5, name: "Bikash Thapa" }, at: BIN_NOTE.at, reason: "Blurry scan" },
      },
    ]);
    expect(passport?.document?.binnedFiles).toEqual([
      { id: uid(42), fileName: "page-2.pdf", bin: { ...BIN_NOTE } },
    ]);
  });

  it("puts a whole Document in the Bin with the reason", async () => {
    const fetchFn = answering(jsonResponse(CHECKLIST));

    await putInBin(uid(7), { documentId: uid(31), fileId: null }, "Blurry scan", fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe(`/api/students/${uid(7)}/documents/${uid(31)}/bin/`);
    expect(init?.method).toBe("POST");
    expect(jsonBody(init)).toEqual({ reason: "Blurry scan" });
  });

  it("puts one file in the Bin, and names a refused reason", async () => {
    const fetchFn = answering(jsonResponse({ reason: ["Say why it should be deleted."] }, 400));

    const refused = putInBin(uid(7), { documentId: uid(31), fileId: uid(42) }, "", fetchFn);

    await expect(refused).rejects.toBeInstanceOf(InvalidFieldsError);
    expect(sentInit(fetchFn).path).toBe(
      `/api/students/${uid(7)}/documents/${uid(31)}/files/${uid(42)}/bin/`,
    );
  });

  it.each([
    ["takeOutOfBin", "take-out/", "POST"],
    ["restoreFromBin", "restore/", "POST"],
    ["deleteForGood", "", "DELETE"],
  ] as const)("%s sends %s with %s", async (name, end, method) => {
    const actions = { takeOutOfBin, restoreFromBin, deleteForGood };
    const fetchFn = answering(jsonResponse(CHECKLIST));

    await actions[name](uid(7), { documentId: uid(31), fileId: uid(42) }, fetchFn);

    const { path, init } = sentInit(fetchFn);
    expect(path).toBe(`/api/students/${uid(7)}/documents/${uid(31)}/files/${uid(42)}/${end}`);
    expect(init?.method).toBe(method);
  });

  it("fetches one page of the Bin tab in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(BIN_PAGE));

    const page = await fetchBin(2, fetchFn);

    expect(sentInit(fetchFn).path).toBe("/api/documents/bin/?page=2");
    expect(page.count).toBe(1);
    expect(page.items[0]).toEqual({
      kind: "file",
      document: { id: uid(31), name: "Passport" },
      student: { id: uid(7), name: "Sita Gurung" },
      files: [{ id: uid(42), fileName: "page-2.pdf" }],
      bin: { by: { id: 5, name: "Bikash Thapa" }, at: BIN_NOTE.at, reason: "Blurry scan" },
    });
  });

  it("refuses a Bin page of the wrong shape", async () => {
    const wrong = { ...BIN_PAGE, results: [{ ...BIN_PAGE.results[0], kind: "trash" }] };

    await expect(fetchBin(1, answering(jsonResponse(wrong)))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it("asks for a link to a file in the Bin, and returns only web links", async () => {
    const fetchFn = answering(jsonResponse({ url: "https://files.test/k?sig=1", expires_in: 300 }));

    const url = await fetchBinFileLink(uid(42), "open", fetchFn);

    expect(sentInit(fetchFn).path).toBe(`/api/documents/bin/files/${uid(42)}/link/?action=open`);
    expect(url).toBe("https://files.test/k?sig=1");
    await expect(
      fetchBinFileLink(
        uid(42),
        "open",
        answering(jsonResponse({ url: "javascript:x", expires_in: 1 })),
      ),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});
