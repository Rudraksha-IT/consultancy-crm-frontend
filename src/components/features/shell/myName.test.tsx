import { renderHook } from "@testing-library/react";

import { useSetMyName } from "./myName";

describe("useSetMyName", () => {
  it("is only usable inside the AppShell", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => renderHook(() => useSetMyName())).toThrow(/inside the AppShell/);
  });
});
