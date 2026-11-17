import { getJson, postJson } from "./client";
import { isNotLoggedInFailure, restrictionOfError } from "./errors";
import {
  isReadOnlyRestriction,
  onRestriction,
  restrictionOf,
  type Restriction,
} from "./restriction";
import { jsonResponse } from "./test-helpers";
import { DetailAnswerSchema } from "./types";

const SUSPENDED = {
  detail:
    "Your office's account is suspended, so you can look things up but not make changes. Ask your Admin to contact the CRM team.",
  status: "suspended",
};

describe("restrictionOf", () => {
  it("reads the server's Status refusal", () => {
    expect(restrictionOf(403, SUSPENDED)).toEqual({
      status: "suspended",
      message: SUSPENDED.detail,
    });
  });

  it.each([
    [401, SUSPENDED],
    [400, SUSPENDED],
    [null, SUSPENDED],
    [403, { detail: "Forbidden." }],
    [403, { detail: "x", status: "closed" }],
    [403, { detail: "", status: "suspended" }],
    [403, { detail: "x".repeat(301), status: "suspended" }],
    [403, { detail: 3, status: "suspended" }],
    [403, undefined],
  ])("finds none in a %s answer of %j", (status, body) => {
    expect(restrictionOf(status, body)).toBeNull();
  });

  it("tells read-only refusals from a blocked office", () => {
    expect(isReadOnlyRestriction({ status: "past_due", message: "x" })).toBe(true);
    expect(isReadOnlyRestriction({ status: "suspended", message: "x" })).toBe(true);
    expect(isReadOnlyRestriction({ status: "evaluation", message: "x" })).toBe(false);
    expect(isReadOnlyRestriction(null)).toBe(false);
  });
});

describe("the API client and Status refusals", () => {
  let heard: Restriction[] = [];
  let stop: () => void = () => undefined;

  beforeEach(() => {
    heard = [];
    stop = onRestriction((restriction) => {
      heard.push(restriction);
    });
  });

  afterEach(() => {
    stop();
  });

  it("tells the shell when a change is refused because of the Status", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(SUSPENDED, 403));

    const error: unknown = await postJson("/api/me/", {}, DetailAnswerSchema, fetchFn).catch(
      (caught: unknown) => caught,
    );

    expect(heard).toEqual([{ status: "suspended", message: SUSPENDED.detail }]);
    expect(restrictionOfError(error)).toEqual(heard[0]);
    expect(isNotLoggedInFailure(error)).toBe(false);
  });

  it("says nothing for other refusals, which still mean nobody is logged in", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ detail: "no" }, 403));

    const error: unknown = await getJson("/api/context/", DetailAnswerSchema, fetchFn).catch(
      (caught: unknown) => caught,
    );

    expect(heard).toEqual([]);
    expect(restrictionOfError(error)).toBeNull();
    expect(isNotLoggedInFailure(error)).toBe(true);
  });

  it("sends Staff of an office whose trial has ended back to the login screen", async () => {
    const ended = { detail: "Your office's trial has ended.", status: "evaluation" };
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(ended, 403));

    const error: unknown = await getJson("/api/context/", DetailAnswerSchema, fetchFn).catch(
      (caught: unknown) => caught,
    );

    expect(isNotLoggedInFailure(error)).toBe(true);
  });

  it("stops telling a listener that has stopped listening", async () => {
    stop();
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(SUSPENDED, 403));

    await postJson("/api/me/", {}, DetailAnswerSchema, fetchFn).catch(() => undefined);

    expect(heard).toEqual([]);
  });
});
