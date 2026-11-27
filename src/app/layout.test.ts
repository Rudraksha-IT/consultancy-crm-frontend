import { generateMetadata } from "./layout";

vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "font" }) }));
const getProductName = vi.hoisted(() =>
  vi.fn<() => Promise<string>>(() => Promise.resolve("Acme Office Suite")),
);
vi.mock("@/lib/brand/productName", () => ({ getProductName }));

describe("the root layout (every page: offices, the Platform, the login pages)", () => {
  it("links the tab to the product's icon, never the Next.js starter (first live fixes, ticket 05)", async () => {
    expect((await generateMetadata()).icons).toEqual({ icon: "/tab-icon" });
  });

  it("names the tab with the product's saved name until a page sets its own (ticket 15)", async () => {
    expect((await generateMetadata()).title).toBe("Acme Office Suite");
  });
});
