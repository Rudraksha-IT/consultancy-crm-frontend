import { uid } from "@/test/ids";
import { act, renderHook, waitFor } from "@testing-library/react";
import { z } from "zod";

import { ApiRequestError, NotLoggedInError, reportLoginEnded } from "@/lib/api";
import { postJson } from "@/lib/api/core/client";

import { useSession } from "./useSession";

const router = vi.hoisted(() => ({ replace: vi.fn<(path: string) => void>() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const assign = vi.fn<(path: string) => void>();

beforeEach(() => {
  router.replace.mockReset();
  assign.mockReset();
  vi.stubGlobal("location", {
    assign,
    pathname: "/students/12",
    search: "?ptab=docs",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("sends someone not logged in to the login page, to come back to this page", async () => {
    const load = failingWith(new NotLoggedInError());
    renderHook(() => useSession(load, "/login"));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/login?next=%2Fstudents%2F12%3Fptab%3Ddocs");
    });
  });

  it("says the login ended when this browser had one (ticket 14)", async () => {
    const load = failingWith(new NotLoggedInError(true));
    renderHook(() => useSession(load, "/platform/login"));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(
        "/platform/login?session=ended&next=%2Fstudents%2F12%3Fptab%3Ddocs",
      );
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

  describe("when the login ends in the middle of work (ticket 14)", () => {
    it("opens the login page, saying so, to come back to this page", async () => {
      const load = () => Promise.resolve("Sita");
      const { result } = renderHook(() => useSession(load, "/login"));
      await waitFor(() => {
        expect(result.current.status).toBe("loaded");
      });

      act(() => {
        reportLoginEnded(true);
      });

      expect(assign).toHaveBeenCalledWith(
        "/login?session=ended&next=%2Fstudents%2F12%3Fptab%3Ddocs",
      );
    });

    it("leaves the message out when the person logged out themselves in another tab", () => {
      const load = () => Promise.resolve("Sita");
      renderHook(() => useSession(load, "/login"));

      act(() => {
        reportLoginEnded(false);
      });

      expect(assign).toHaveBeenCalledWith("/login?next=%2Fstudents%2F12%3Fptab%3Ddocs");
    });

    it("follows a save the server answered with an ended login", async () => {
      const load = () => Promise.resolve("Sita");
      renderHook(() => useSession(load, "/login"));
      const ended = new Response(JSON.stringify({ detail: "Not logged in." }), {
        status: 401,
        headers: { "content-type": "application/json", "x-session-ended": "1" },
      });

      await act(async () => {
        await postJson(`/api/students/${uid(12)}/note/`, { text: "Called" }, z.unknown(), () =>
          Promise.resolve(ended),
        ).catch(() => undefined);
      });

      expect(assign).toHaveBeenCalledWith(
        "/login?session=ended&next=%2Fstudents%2F12%3Fptab%3Ddocs",
      );
    });

    it("goes only once, however many calls are refused", () => {
      const load = () => Promise.resolve("Sita");
      renderHook(() => useSession(load, "/login"));

      act(() => {
        reportLoginEnded(true);
        reportLoginEnded(true);
        reportLoginEnded(true);
      });

      expect(assign).toHaveBeenCalledTimes(1);
    });

    it("stops listening once the page is gone", () => {
      const load = () => Promise.resolve("Sita");
      const { unmount } = renderHook(() => useSession(load, "/login"));
      unmount();

      reportLoginEnded(true);

      expect(assign).not.toHaveBeenCalled();
    });
  });
});
