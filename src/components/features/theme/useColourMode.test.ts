import { act, renderHook } from "@testing-library/react";

import { fakeMatchMedia } from "@/test/matchMedia";

import { useColourMode } from "./useColourMode";

function preferDarkDevice(isDark: { value: boolean }) {
  const media = fakeMatchMedia(() => isDark.value);
  vi.stubGlobal("matchMedia", media.matchMedia);
  return media;
}

describe("useColourMode", () => {
  it("is light until the person chooses, even on a dark device (2026-11-20)", () => {
    const isDark = { value: true };
    const media = preferDarkDevice(isDark);
    const { result } = renderHook(() => useColourMode("staff-1"));

    expect(result.current.mode).toBe("light");

    act(() => {
      media.emitChange();
    });
    expect(result.current.mode).toBe("light");
  });

  it("switches to the other mode and remembers the choice for that person", () => {
    const first = renderHook(() => useColourMode("staff-1"));

    act(() => {
      first.result.current.toggleMode();
    });

    expect(first.result.current.mode).toBe("dark");
    expect(renderHook(() => useColourMode("staff-1")).result.current.mode).toBe("dark");
  });

  it("keeps each person's choice apart", () => {
    const sita = renderHook(() => useColourMode("staff-1"));
    act(() => {
      sita.result.current.toggleMode();
    });

    expect(renderHook(() => useColourMode("staff-2")).result.current.mode).toBe("light");
  });

  it("ignores a stored value that is not a mode", () => {
    window.localStorage.setItem("crm.colour-mode.staff-1", "purple");

    expect(renderHook(() => useColourMode("staff-1")).result.current.mode).toBe("light");
  });

  it("still works when the browser refuses storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { result } = renderHook(() => useColourMode("staff-1"));

    act(() => {
      result.current.toggleMode();
    });

    expect(result.current.mode).toBe("light");
  });
});

describe("useColourMode on a dark device", () => {
  it("switches to dark and back, the device never deciding", () => {
    preferDarkDevice({ value: true });
    const { result } = renderHook(() => useColourMode("staff-9"));

    act(() => {
      result.current.toggleMode();
    });
    expect(result.current.mode).toBe("dark");

    act(() => {
      result.current.toggleMode();
    });
    expect(result.current.mode).toBe("light");
  });
});
