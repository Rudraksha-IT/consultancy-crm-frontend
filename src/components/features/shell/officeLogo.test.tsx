import { renderHook } from "@testing-library/react";

import { useSetOfficeLogo } from "./officeLogo";

describe("useSetOfficeLogo", () => {
  it("is only usable inside the AppShell", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => renderHook(() => useSetOfficeLogo())).toThrow(/inside the AppShell/);
  });
});
