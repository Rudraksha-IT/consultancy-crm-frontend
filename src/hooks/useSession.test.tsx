import { renderHook, waitFor } from "@testing-library/react";

import { ApiRequestError, NotLoggedInError } from "@/lib/api";

import { useSession } from "./useSession";

const router = vi.hoisted(() => ({ replace: vi.fn<(path: string) => void>() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => {
  router.replace.mockReset();
});

const failingWith = (error: Error) => () => Promise.reject(error);

describe("useSession", () => {
  it("gives what was loaded", async () => {
    const load = () => Promise.resolve("Sita");
    const { result } = renderHook(() => useSession(load, "/login"));

    await waitFor(() => {
      expect(result.current).toEqual({ status: "loaded", value: "Sita" });
    });
  });

  it("sends someone not logged in to the login page", async () => {
    const load = failingWith(new NotLoggedInError());
    renderHook(() => useSession(load, "/login"));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("sends an address with no account (404, e.g. no such office) to the login page, which explains (issue 66)", async () => {
    const load = failingWith(new ApiRequestError("/api/context/", 404));
    renderHook(() => useSession(load, "/login"));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("says it failed for anything else", async () => {
    const load = failingWith(new ApiRequestError("/api/context/", 500));
    const { result } = renderHook(() => useSession(load, "/login"));

    await waitFor(() => {
      expect(result.current).toEqual({ status: "failed" });
    });
    expect(router.replace).not.toHaveBeenCalled();
  });
});
