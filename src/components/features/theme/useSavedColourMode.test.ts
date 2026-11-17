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
  it("follows the device while the person's choice is the device", () => {
    const isDark = { value: true };
    const media = preferDarkDevice(isDark);
    const { result } = renderHook(() => useSavedColourMode("device", saver()));

    expect(result.current.mode).toBe("dark");

    isDark.value = false;
    act(() => {
      media.emitChange();
    });
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
    const { result } = renderHook(() => useSavedColourMode("device", save));

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
