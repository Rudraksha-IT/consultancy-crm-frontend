import { renderHook } from "@testing-library/react";

import { jsonResponse } from "@/lib/api/core/test-helpers";

import { useStaffSession } from "./useStaffSession";

const router = vi.hoisted(() => ({ replace: vi.fn<(href: string) => void>() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => {
  router.replace.mockReset();
});

describe("useStaffSession", () => {
  it.each([
    ["a context", () => jsonResponse({}, 200)],
    ["a not-logged-in answer", () => jsonResponse({}, 403)],
    ["a failure", () => jsonResponse({}, 500)],
  ])("ignores %s that arrives after the component has gone", async (_label, makeResponse) => {
    let answer: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockReturnValue(
        new Promise<Response>((resolve) => {
          answer = resolve;
        }),
      ),
    );
    const { result, unmount } = renderHook(() => useStaffSession());

    unmount();
    answer(makeResponse());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current).toEqual({ status: "loading" });
    expect(router.replace).not.toHaveBeenCalled();
  });
});
