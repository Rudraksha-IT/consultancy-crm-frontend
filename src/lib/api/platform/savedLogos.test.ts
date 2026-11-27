import { uid } from "@/test/ids";

import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";
import { fetchSavedLogos, removeSavedLogo, pickSavedLogo } from "./savedLogos";

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function bodyOf(init: RequestInit | undefined): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

function call(fetchFn: ReturnType<typeof answering>) {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  return { path, method: init?.method ?? "GET", body: bodyOf(init) };
}

const ROW = {
  id: uid(1),
  file_url: `/api/platform/brand/logos/${uid(1)}/file/`,
  uploaded_at: "2026-11-23T03:30:00Z",
  in_use: true,
};

describe("saved product logos (first live fixes, ticket 07)", () => {
  it("lists them, newest first as the server sends them, with the limit", async () => {
    const fetchFn = answering(jsonResponse({ logos: [ROW], limit: 10 }));

    await expect(fetchSavedLogos(fetchFn)).resolves.toEqual({
      logos: [{ id: uid(1), fileUrl: ROW.file_url, uploadedAt: ROW.uploaded_at, inUse: true }],
      limit: 10,
    });
    expect(call(fetchFn).path).toBe("/api/platform/brand/logos/");
  });

  it.each([
    { logos: [{ ...ROW, file_url: "https://evil.example/x.png" }], limit: 10 },
    { logos: [{ ...ROW, file_url: `/api/platform/brand/logos/${uid(2)}/file/` }], limit: 10 },
    { logos: [{ ...ROW, id: 1 }], limit: 10 },
    { logos: [{ ...ROW, in_use: "yes" }], limit: 10 },
    { logos: [ROW] },
    { logos: "x", limit: 10 },
  ])("refuses an answer it can't trust (%#)", async (answer) => {
    await expect(fetchSavedLogos(answering(jsonResponse(answer)))).rejects.toThrow();
  });

  it("uses a saved logo, or the app's own with null", async () => {
    const pick = answering(jsonResponse({ logo: { url: "/api/platform/brand/logo/3/" } }));

    await expect(pickSavedLogo(uid(1), pick)).resolves.toEqual({
      url: "/api/platform/brand/logo/3/",
    });
    expect(call(pick)).toEqual({
      path: "/api/platform/brand/in-use/",
      method: "PUT",
      body: { logo: uid(1) },
    });

    const own = answering(jsonResponse({ logo: null }));
    await expect(pickSavedLogo(null, own)).resolves.toBeNull();
    expect(call(own).body).toEqual({ logo: null });
  });

  it("refuses a pick answer it can't trust", async () => {
    await expect(
      pickSavedLogo(uid(1), answering(jsonResponse({ logo: { url: "javascript:alert(1)" } }))),
    ).rejects.toThrow();
  });

  it("names a refused pick", async () => {
    await expect(
      pickSavedLogo(
        uid(9),
        answering(jsonResponse({ logo: ["Pick one of the saved logos."] }, 400)),
      ),
    ).rejects.toBeInstanceOf(InvalidFieldsError);
  });

  it("removes one by id", async () => {
    const remove = answering(new Response(null, { status: 204 }));

    await removeSavedLogo(uid(1), remove);

    expect(call(remove)).toMatchObject({
      path: `/api/platform/brand/logos/${uid(1)}/`,
      method: "DELETE",
    });
    await expect(
      removeSavedLogo(uid(1), answering(jsonResponse({ detail: "Not found." }, 404))),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});
