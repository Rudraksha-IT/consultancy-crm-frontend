import { openBlankTab } from "./tab";

describe("openBlankTab", () => {
  it("opens an empty new tab", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    expect(openBlankTab()).toBeNull();
    expect(open).toHaveBeenCalledWith("", "_blank");
  });
});
