import { renderHook } from "@testing-library/react";

import { useShellTheme } from "./shellTheme";

describe("useShellTheme", () => {
  it("can't be used outside the AppShell", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => renderHook(() => useShellTheme())).toThrow(
      "useShellTheme must be used inside the AppShell",
    );
  });
});
