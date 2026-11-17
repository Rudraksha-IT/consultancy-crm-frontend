import { getJson, postJson } from "./client";
import { onUnexpectedError, unexpectedErrorOf } from "./unexpected";
import { jsonResponse } from "./test-helpers";
import { DetailAnswerSchema } from "./types";

const REFERENCE = "3f1c0000-0000-4000-8000-000000000000";
const UNEXPECTED = { detail: "Something went wrong.", reference: REFERENCE };

describe("unexpectedErrorOf", () => {
  it.each([500, 502, 503])("reads the reference of a %s answer", (status) => {
    expect(unexpectedErrorOf(status, UNEXPECTED)).toBe(REFERENCE);
  });

  it("lowercases the reference", () => {
    expect(unexpectedErrorOf(500, { ...UNEXPECTED, reference: REFERENCE.toUpperCase() })).toBe(
      REFERENCE,
    );
  });

  it.each([
    [400, UNEXPECTED],
    [404, UNEXPECTED],
    [null, UNEXPECTED],
    [500, { detail: "Something went wrong." }],
    [500, { ...UNEXPECTED, reference: "" }],
    [500, { ...UNEXPECTED, reference: "<script>alert(1)</script>" }],
    [500, { ...UNEXPECTED, reference: `${REFERENCE}x` }],
    [500, { ...UNEXPECTED, reference: 7 }],
    [500, "Internal Server Error"],
    [500, undefined],
  ])("is null for %s %j", (status, body) => {
    expect(unexpectedErrorOf(status, body)).toBeNull();
  });
});

describe("reporting an unexpected error to the shell", () => {
  let heard: string[];
  let stop: () => void;

  beforeEach(() => {
    heard = [];
    stop = onUnexpectedError((reference) => {
      heard.push(reference);
    });
  });

  afterEach(() => {
    stop();
  });

  it("passes on the reference of a failed read", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(UNEXPECTED, 500));

    await expect(getJson("/api/context/", DetailAnswerSchema, fetchFn)).rejects.toThrow();

    expect(heard).toEqual([REFERENCE]);
  });

  it("passes on the reference of a failed change", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(UNEXPECTED, 500));

    await expect(postJson("/api/x/", {}, DetailAnswerSchema, fetchFn)).rejects.toThrow();

    expect(heard).toEqual([REFERENCE]);
  });

  it("says nothing for an ordinary refusal", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ name: ["x"] }, 400));

    await expect(postJson("/api/x/", {}, DetailAnswerSchema, fetchFn)).rejects.toThrow();

    expect(heard).toEqual([]);
  });

  it("stops telling a listener that stopped listening", async () => {
    stop();
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(UNEXPECTED, 500));

    await expect(getJson("/api/x/", DetailAnswerSchema, fetchFn)).rejects.toThrow();

    expect(heard).toEqual([]);
  });
});
