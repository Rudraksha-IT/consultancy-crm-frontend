import { act, renderHook } from "@testing-library/react";

import type { ColourModeChoice } from "@/constants/mySettings";
import { fakeMatchMedia } from "@/test/matchMedia";

import { useSavedColourMode } from "./useSavedColourMode";

function preferDarkDevice(isDark: { value: boolean }) {
  const media = fakeMatchMedia(() => isDark.value);
  vi.stubGlobal("matchMedia", media.matchMedia);
  return media;
}

function saver() {
  return vi.fn<(choice: ColourModeChoice) => Promise<unknown>>().mockResolvedValue(undefined);
}

describe("useSavedColourMode", () => {
  it("starts light on a dark device until the person picks dark (2026-11-20)", () => {
    preferDarkDevice({ value: true });

    const { result } = renderHook(() => useSavedColourMode("light", saver()));

    expect(result.current.mode).toBe("light");
  });

  it.each(["light", "dark"] as const)("uses a saved %s choice whatever the device", (choice) => {
    preferDarkDevice({ value: choice === "light" });

    const { result } = renderHook(() => useSavedColourMode(choice, saver()));

    expect(result.current.mode).toBe(choice);
  });

  it("switches at once and saves the choice for the person", () => {
    preferDarkDevice({ value: false });
    const save = saver();
    const { result } = renderHook(() => useSavedColourMode("light", save));

    act(() => {
      result.current.toggleMode();
    });

    expect(result.current.mode).toBe("dark");
    expect(save).toHaveBeenCalledWith("dark");

    act(() => {
      result.current.toggleMode();
    });
    expect(result.current.mode).toBe("light");
    expect(save).toHaveBeenLastCalledWith("light");
  });

  it("keeps the switch on screen when saving fails", async () => {
    preferDarkDevice({ value: false });
    const save = vi
      .fn<(choice: ColourModeChoice) => Promise<unknown>>()
      .mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSavedColourMode("light", save));

    await act(async () => {
      result.current.toggleMode();
      await Promise.resolve();
    });

    expect(result.current.mode).toBe("dark");
  });
});
