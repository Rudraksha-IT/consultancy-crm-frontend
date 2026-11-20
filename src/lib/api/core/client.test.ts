import { z } from "zod";

import { getJson, postJson, postWithoutBody, putJson } from "./client";
import { ApiRequestError } from "./errors";
import { onLoginEnded } from "./loginEnded";
import { jsonResponse } from "./test-helpers";
import { isAppUpdating, isUpdatingError, onUpdatingChange, reportServerAnswer } from "./updating";

const ThingSchema = z.object({ name: z.string() });

describe("getJson", () => {
  it("returns the parsed body of a successful response", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ name: "Acme" }));

    await expect(getJson("/api/thing/", ThingSchema, fetchFn)).resolves.toEqual({ name: "Acme" });
  });

  it("calls the path on the same origin, sending the session cookie", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ name: "Acme" }));

    await getJson("/api/thing/", ThingSchema, fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("/api/thing/", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
  });

  it("rejects with the status when the response is not OK", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ detail: "no" }, 404));

    await expect(getJson("/api/thing/", ThingSchema, fetchFn)).rejects.toEqual(
      new ApiRequestError("/api/thing/", 404, { detail: "no" }),
    );
  });

  it("rejects when the network request fails", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(getJson("/api/thing/", ThingSchema, fetchFn)).rejects.toEqual(
      new ApiRequestError("/api/thing/", null),
    );
  });

  it("rejects when the body is not JSON", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("<html>", { status: 200 }));

    await expect(getJson("/api/thing/", ThingSchema, fetchFn)).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it("rejects when the body does not match the expected shape", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ title: "Acme" }));

    await expect(getJson("/api/thing/", ThingSchema, fetchFn)).rejects.toEqual(
      new ApiRequestError("/api/thing/", 200),
    );
  });
});

describe("postJson", () => {
  it("posts the body as JSON and returns the parsed answer, in one call", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ name: "Acme" }));

    await expect(postJson("/api/thing/", { a: 1 }, ThingSchema, fetchFn)).resolves.toEqual({
      name: "Acme",
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith("/api/thing/", {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
  });

  it("rejects with the status when the response is not OK", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ detail: "no" }, 400));

    await expect(postJson("/api/thing/", {}, ThingSchema, fetchFn)).rejects.toEqual(
      new ApiRequestError("/api/thing/", 400, { detail: "no" }),
    );
  });

  it("keeps the body of a refused request, so callers can show what was wrong", async () => {
    const errors = { subdomain: ["This subdomain is already taken."] };
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(errors, 400));

    const error: unknown = await postJson("/api/thing/", {}, ThingSchema, fetchFn).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toHaveProperty("body", errors);
  });

  it("rejects without a status when the network fails", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));

    await expect(postJson("/api/thing/", {}, ThingSchema, fetchFn)).rejects.toEqual(
      new ApiRequestError("/api/thing/", null),
    );
  });
});

describe("postWithoutBody", () => {
  it("posts and expects no content back", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));

    await expect(postWithoutBody("/api/thing/", fetchFn)).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledWith("/api/thing/", {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: null,
    });
  });

  it("rejects with the status when the response is not OK", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403 }));

    await expect(postWithoutBody("/api/thing/", fetchFn)).rejects.toEqual(
      new ApiRequestError("/api/thing/", 403),
    );
  });
});

describe("putJson", () => {
  it("puts the body as JSON and returns the parsed answer", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ name: "Acme" }));

    await expect(putJson("/api/thing/", { a: 1 }, ThingSchema, fetchFn)).resolves.toEqual({
      name: "Acme",
    });
    expect(fetchFn).toHaveBeenCalledWith("/api/thing/", {
      method: "PUT",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
  });
});

describe("while the app is being updated (ticket 14)", () => {
  const UPDATING = {
    detail: "The app is being updated. Please try again in a moment.",
    code: "updating",
  };

  afterEach(() => {
    reportServerAnswer(false);
  });

  it("reports it on the updating answer, and the error says so", async () => {
    const heard = vi.fn();
    const stop = onUpdatingChange(heard);
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(UPDATING, 503));

    const error: unknown = await postJson("/api/thing/", {}, ThingSchema, fetchFn).catch(
      (caught: unknown) => caught,
    );
    stop();

    expect(isAppUpdating()).toBe(true);
    expect(isUpdatingError(error)).toBe(true);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("stops once the server answers again, telling listeners once", async () => {
    const updating = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(UPDATING, 503));
    await getJson("/api/thing/", ThingSchema, updating).catch(() => undefined);
    const heard = vi.fn();
    const stop = onUpdatingChange(heard);
    const back = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(jsonResponse({ name: "Acme" })));

    await getJson("/api/thing/", ThingSchema, back);
    await getJson("/api/thing/", ThingSchema, back);
    stop();

    expect(isAppUpdating()).toBe(false);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it.each([
    { body: { detail: "The files can't be fetched right now." }, status: 503 },
    { body: UPDATING, status: 500 },
    { body: { detail: "x", code: "other" }, status: 503 },
  ])("is not said for another failure ($status)", async ({ body, status }) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(body, status));

    const error: unknown = await getJson("/api/thing/", ThingSchema, fetchFn).catch(
      (caught: unknown) => caught,
    );

    expect(isUpdatingError(error)).toBe(false);
    expect(isAppUpdating()).toBe(false);
  });
});

describe("a login that ended in the middle of work (ticket 14)", () => {
  it("is reported on a 401, saying whether this browser's login ended", async () => {
    const heard = vi.fn<(hasLoginEnded: boolean) => void>();
    const stop = onLoginEnded(heard);
    const ended = new Response(JSON.stringify({ detail: "Not logged in." }), {
      status: 401,
      headers: { "content-type": "application/json", "x-session-ended": "1" },
    });
    const visitor = jsonResponse({ detail: "Not logged in." }, 401);

    await postJson(
      "/api/thing/",
      {},
      ThingSchema,
      vi.fn<typeof fetch>().mockResolvedValue(ended),
    ).catch(() => undefined);
    await getJson(
      "/api/thing/",
      ThingSchema,
      vi.fn<typeof fetch>().mockResolvedValue(visitor),
    ).catch(() => undefined);
    stop();

    expect(heard.mock.calls).toEqual([[true], [false]]);
  });

  it.each([403, 404, 500])("is not reported on a %s", async (status) => {
    const heard = vi.fn();
    const stop = onLoginEnded(heard);
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ detail: "no" }, status));

    await getJson("/api/thing/", ThingSchema, fetchFn).catch(() => undefined);
    stop();

    expect(heard).not.toHaveBeenCalled();
  });
});
