import { z } from "zod";

import { getJson, postJson, postWithoutBody, putJson } from "./client";
import { ApiRequestError } from "./errors";
import { jsonResponse } from "./test-helpers";

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
