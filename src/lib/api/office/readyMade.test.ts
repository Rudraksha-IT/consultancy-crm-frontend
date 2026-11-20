import { fetchReadyMade, fetchReadyMadeDraft } from "./readyMade";
import { ApiRequestError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";
import { uid } from "@/test/ids";

const MENU = {
  kinds: [
    { kind: "welcome", record: null, records: [], unavailable: null },
    {
      kind: "payment_received",
      record: "payment",
      records: [{ id: 12, label: "Receipt 000012: Visa fee, NPR 40,000, 2 Nov 2026" }],
      unavailable: null,
    },
    { kind: "offer_received", record: "offer", records: [], unavailable: "No offer letters yet" },
  ],
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

const pathOf = (fetchFn: ReturnType<typeof answering>) => fetchFn.mock.calls[0]?.[0];

describe("fetchReadyMade", () => {
  it("reads one Student's ready-made emails with the records to pick", async () => {
    const fetchFn = answering(jsonResponse(MENU));

    const kinds = await fetchReadyMade({ studentId: uid(7) }, fetchFn);

    expect(pathOf(fetchFn)).toBe(`/api/students/${uid(7)}/emails/ready-made/`);
    expect(kinds).toEqual(MENU.kinds);
  });

  it("reads the ready-made emails for many Students", async () => {
    const fetchFn = answering(jsonResponse({ kinds: [MENU.kinds[0]] }));

    await fetchReadyMade("many", fetchFn);

    expect(pathOf(fetchFn)).toBe("/api/messages/bulk/ready-made/");
  });

  it.each([
    { kinds: [{ ...MENU.kinds[0], kind: "sms" }] },
    { kinds: [{ ...MENU.kinds[0], record: "student" }] },
    { kinds: [{ ...MENU.kinds[1], records: [{ id: -1, label: "x" }] }] },
    { kinds: [{ ...MENU.kinds[1], records: [{ id: 1, label: "" }] }] },
    { kinds: [{ ...MENU.kinds[0], unavailable: "x".repeat(201) }] },
    { kinds: "welcome" },
  ])("refuses a damaged answer %#", async (body) => {
    await expect(
      fetchReadyMade({ studentId: uid(7) }, answering(jsonResponse(body))),
    ).rejects.toThrow();
  });
});

describe("fetchReadyMadeDraft", () => {
  it("asks for one Student's draft about a record", async () => {
    const draft = {
      subject: "Payment received: receipt 000012",
      body: "Dear Sita,",
      attachments: [],
    };
    const fetchFn = answering(jsonResponse(draft));

    const answer = await fetchReadyMadeDraft(
      { studentId: uid(7) },
      "payment_received",
      12,
      fetchFn,
    );

    expect(pathOf(fetchFn)).toBe(
      `/api/students/${uid(7)}/emails/draft/?kind=payment_received&record=12`,
    );
    expect(answer).toEqual(draft);
  });

  it("asks for an email to many without a record", async () => {
    const fetchFn = answering(
      jsonResponse({ subject: "", body: "Dear Student,", attachments: [] }),
    );

    await fetchReadyMadeDraft("many", "plain", null, fetchFn);

    expect(pathOf(fetchFn)).toBe("/api/messages/bulk/draft/?kind=plain");
  });

  it("refuses a subject line too long to send", async () => {
    const fetchFn = answering(
      jsonResponse({ subject: "x".repeat(151), body: "", attachments: [] }),
    );

    await expect(fetchReadyMadeDraft("many", "plain", null, fetchFn)).rejects.toThrow();
  });

  it("reads the files it suggests attaching", async () => {
    const example = {
      kind: "document_example",
      id: 4,
      name: "sample.pdf",
      file_name: "sample.pdf",
      size: 2048,
      group: "Bank Statement",
    };
    const fetchFn = answering(jsonResponse({ subject: "Docs", body: "", attachments: [example] }));

    const draft = await fetchReadyMadeDraft(
      { studentId: uid(7) },
      "documents_needed",
      null,
      fetchFn,
    );

    expect(draft.attachments).toEqual([
      {
        kind: "document_example",
        id: 4,
        name: "sample.pdf",
        fileName: "sample.pdf",
        size: 2048,
        group: "Bank Statement",
      },
    ]);
  });

  it.each([
    [{ subject: "", body: "" }],
    [{ subject: "", body: "", attachments: [{ kind: "computer_file", id: 1 }] }],
  ])("refuses a damaged list of suggested files %#", async (body) => {
    await expect(
      fetchReadyMadeDraft("many", "plain", null, answering(jsonResponse(body))),
    ).rejects.toThrow();
  });

  it("passes a refusal on", async () => {
    const fetchFn = answering(jsonResponse({ record: ["Choose a Payment."] }, 400));

    await expect(
      fetchReadyMadeDraft({ studentId: uid(7) }, "payment_received", 99, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});
