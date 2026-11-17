import { renderHook, waitFor } from "@testing-library/react";

import { backend, callsTo, on } from "@/test/backend";

import { useTransferCountLoader } from "./useTransferCountLoader";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const COUNT = "/api/transfer-requests/count/";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTransferCountLoader", () => {
  it("loads how many requests wait for my answer", async () => {
    backend(on("GET", COUNT, { count: 2 }));

    const { result } = renderHook(() => useTransferCountLoader(true));

    await waitFor(() => {
      expect(result.current.count).toBe(2);
    });
  });

  it("asks nothing for someone with no Transfer requests screen", async () => {
    const fetchFn = backend(on("GET", COUNT, { count: 2 }));

    const { result } = renderHook(() => useTransferCountLoader(false));
    result.current.refresh();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(callsTo(fetchFn, "GET", COUNT)).toHaveLength(0);
    expect(result.current.count).toBe(0);
  });

  it("keeps 0 when the answer isn't a count", async () => {
    const fetchFn = backend(on("GET", COUNT, { count: "two" }));

    const { result } = renderHook(() => useTransferCountLoader(true));

    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", COUNT)).toHaveLength(1);
    });
    expect(result.current.count).toBe(0);
  });
});
