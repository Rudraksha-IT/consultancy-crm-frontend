import { renderHook } from "@testing-library/react";

import { hasUnsavedChanges } from "@/lib/unsavedChanges";

import { useLeaveGuard } from "./useLeaveGuard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("useLeaveGuard and the app's unsaved changes", () => {
  it("tells the app about unsaved changes only while there are some", () => {
    const { rerender, unmount } = renderHook(({ isDirty }) => useLeaveGuard(isDirty), {
      initialProps: { isDirty: false },
    });
    expect(hasUnsavedChanges()).toBe(false);

    rerender({ isDirty: true });
    expect(hasUnsavedChanges()).toBe(true);

    rerender({ isDirty: false });
    expect(hasUnsavedChanges()).toBe(false);

    rerender({ isDirty: true });
    unmount();
    expect(hasUnsavedChanges()).toBe(false);
  });
});
