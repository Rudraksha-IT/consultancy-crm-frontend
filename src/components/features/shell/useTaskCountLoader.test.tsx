import { act, renderHook, waitFor } from "@testing-library/react";

import { TASK_COUNT_REFRESH_MS } from "@/constants/tasks";
import { backend, callsTo, on } from "@/test/backend";

import { useTaskCountLoader } from "./useTaskCountLoader";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

const COUNT = "/api/tasks/count/";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  pathname.current = "/";
});

describe("useTaskCountLoader", () => {
  it("loads my count when the shell opens", async () => {
    backend(on("GET", COUNT, { count: 4 }));

    const { result } = renderHook(() => useTaskCountLoader());

    expect(result.current.count).toBe(0);
    await waitFor(() => {
      expect(result.current.count).toBe(4);
    });
  });

  it("asks again when told something changed", async () => {
    const fetchFn = backend(on("GET", COUNT, { count: 4 }));
    const { result } = renderHook(() => useTaskCountLoader());
    await waitFor(() => {
      expect(result.current.count).toBe(4);
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", COUNT)).toHaveLength(2);
    });
  });

  it("asks again on another page", async () => {
    const fetchFn = backend(on("GET", COUNT, { count: 1 }));
    const { rerender } = renderHook(() => useTaskCountLoader());
    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", COUNT)).toHaveLength(1);
    });

    pathname.current = "/tasks";
    rerender();

    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", COUNT)).toHaveLength(2);
    });
  });

  it("asks again every minute", async () => {
    vi.useFakeTimers();
    const fetchFn = backend(on("GET", COUNT, { count: 1 }));
    renderHook(() => useTaskCountLoader());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TASK_COUNT_REFRESH_MS);
    });

    expect(callsTo(fetchFn, "GET", COUNT)).toHaveLength(2);
  });

  it("keeps the last count when asking fails", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(() => {
        calls += 1;
        return Promise.resolve(
          calls === 1
            ? new Response(JSON.stringify({ count: 2 }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              })
            : new Response("{}", { status: 500 }),
        );
      }),
    );
    const { result } = renderHook(() => useTaskCountLoader());
    await waitFor(() => {
      expect(result.current.count).toBe(2);
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(calls).toBe(2);
    });
    expect(result.current.count).toBe(2);
  });
});
