import { renderHook, waitFor } from "@testing-library/react";

import { useCurrentConsultancy } from "./useCurrentConsultancy";

describe("useCurrentConsultancy", () => {
  it("is loading until the API answers", () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockReturnValue(new Promise(() => undefined)));

    const { result } = renderHook(() => useCurrentConsultancy());

    expect(result.current).toEqual({ status: "loading" });
  });

  it("returns the Consultancy once the API answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ name: "Acme" }))),
    );

    const { result } = renderHook(() => useCurrentConsultancy());

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "loaded",
        consultancy: {
          name: "Acme",
          logo: null,
          status: "active",
          statusMessage: null,
        },
      });
    });
  });

  it("reports a failure when the API call fails", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));

    const { result } = renderHook(() => useCurrentConsultancy());

    await waitFor(() => {
      expect(result.current).toEqual({ status: "failed" });
    });
  });

  it.each([
    ["an answer", () => new Response(JSON.stringify({ name: "Acme" }))],
    ["a failure", () => new Response("", { status: 500 })],
  ])("ignores %s that arrives after the component has gone", async (_label, makeResponse) => {
    let answer: (response: Response) => void = () => undefined;
    const fetchFn = vi.fn<typeof fetch>().mockReturnValue(
      new Promise<Response>((resolve) => {
        answer = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchFn);
    const { result, unmount } = renderHook(() => useCurrentConsultancy());

    unmount();
    answer(makeResponse());
    await Promise.resolve();

    expect(result.current).toEqual({ status: "loading" });
  });
});
