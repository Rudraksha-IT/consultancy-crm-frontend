import { act, renderHook, waitFor } from "@testing-library/react";

import { backend, callsTo, on } from "@/test/backend";

import { useInboxCheckLoader } from "./useInboxCheckLoader";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const CHECK = "/api/inbox/check/";

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setVisibility("visible");
});

describe("useInboxCheckLoader", () => {
  it("loads the unread count and the newest id", async () => {
    backend(on("GET", CHECK, { unread: 2, latest: 907 }));

    const { result } = renderHook(() => useInboxCheckLoader(true));

    await waitFor(() => {
      expect(result.current.unread).toBe(2);
    });
    expect(result.current.latest).toBe(907);
  });

  it("checks again about every 30 seconds while the tab is shown", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchFn = backend(on("GET", CHECK, { unread: 0, latest: null }));
    renderHook(() => useInboxCheckLoader(true));
    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", CHECK)).toHaveLength(1);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(callsTo(fetchFn, "GET", CHECK)).toHaveLength(2);
  });

  it("pauses while the tab is hidden and checks as soon as it is shown again", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchFn = backend(on("GET", CHECK, { unread: 0, latest: null }));
    renderHook(() => useInboxCheckLoader(true));
    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", CHECK)).toHaveLength(1);
    });

    act(() => {
      setVisibility("hidden");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(callsTo(fetchFn, "GET", CHECK)).toHaveLength(1);

    act(() => {
      setVisibility("visible");
    });
    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", CHECK)).toHaveLength(2);
    });
  });

  it("asks nothing for a Platform Admin, who has no Inbox", async () => {
    const fetchFn = backend(on("GET", CHECK, { unread: 2, latest: 1 }));

    const { result } = renderHook(() => useInboxCheckLoader(false));
    result.current.refresh();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(callsTo(fetchFn, "GET", CHECK)).toHaveLength(0);
    expect(result.current.unread).toBe(0);
  });

  it("keeps the last answer when the check fails or isn't one", async () => {
    let answer: unknown = { unread: 3, latest: 5 };
    backend((path) =>
      path === CHECK ? new Response(JSON.stringify(answer), { status: 200 }) : undefined,
    );
    const { result } = renderHook(() => useInboxCheckLoader(true));
    await waitFor(() => {
      expect(result.current.unread).toBe(3);
    });

    answer = { unread: "lots", latest: 5 };
    act(() => {
      result.current.refresh();
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(result.current.unread).toBe(3);
  });
});
