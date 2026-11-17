import { renderHook } from "@testing-library/react";

import { useReloadWhenRestored } from "./useReloadWhenRestored";

function showPage(persisted: boolean): void {
  window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted }));
}

describe("useReloadWhenRestored", () => {
  it("reloads a page the browser restored from its back-forward cache", () => {
    const reload = vi.fn<() => void>();
    renderHook(() => {
      useReloadWhenRestored(reload);
    });

    showPage(true);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("leaves a normally loaded page alone", () => {
    const reload = vi.fn<() => void>();
    renderHook(() => {
      useReloadWhenRestored(reload);
    });

    showPage(false);

    expect(reload).not.toHaveBeenCalled();
  });

  it("stops listening once the screen is gone", () => {
    const reload = vi.fn<() => void>();
    const { unmount } = renderHook(() => {
      useReloadWhenRestored(reload);
    });
    unmount();

    showPage(true);

    expect(reload).not.toHaveBeenCalled();
  });
});
