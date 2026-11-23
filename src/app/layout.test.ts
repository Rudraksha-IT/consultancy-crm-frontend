import { metadata } from "./layout";

vi.mock("next/font/google", () => ({ Public_Sans: () => ({ variable: "font" }) }));

describe("the root layout (every page: offices, the Platform, the login pages)", () => {
  it("links the tab to the product's icon, never the Next.js starter (first live fixes, ticket 05)", () => {
    expect(metadata.icons).toEqual({ icon: "/tab-icon" });
  });
});
