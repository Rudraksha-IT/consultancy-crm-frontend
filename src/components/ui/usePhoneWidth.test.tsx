import { act, renderHook } from "@testing-library/react";

import { fakeMatchMedia } from "@/test/matchMedia";

import { PHONE_QUERY, usePhoneWidth } from "./usePhoneWidth";

describe("usePhoneWidth", () => {
  it("is false above 640 px", () => {
    const { result } = renderHook(() => usePhoneWidth());

    expect(result.current).toBe(false);
  });

  it("follows the screen as it becomes phone width", () => {
    let isPhone = false;
    const media = fakeMatchMedia(
      () => false,
      (query) => query === PHONE_QUERY && isPhone,
    );
    vi.stubGlobal("matchMedia", media.matchMedia);
    const { result } = renderHook(() => usePhoneWidth());

    isPhone = true;
    act(() => {
      media.emitChange();
    });

    expect(result.current).toBe(true);
  });

  it("uses the same width as the phone breakpoint in globals.css", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(`${process.cwd()}/src/app/globals.css`, "utf8");

    expect(css).toContain("--breakpoint-phone: 40.0625rem;");
    expect(css).toContain("@media (width < 40.0625rem)");
    expect(PHONE_QUERY).toBe("(width < 40.0625rem)");
  });
});
