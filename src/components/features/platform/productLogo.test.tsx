import { act, render, screen, waitFor } from "@testing-library/react";

import { LABELS } from "@/constants/messages";
import { APP_LOGO_URL } from "@/lib/brand/appLogo";
import { backend, on } from "@/test/backend";

import { PlatformBrand } from "./PlatformBrand";
import { resetProductLogo, setProductLogo } from "./productLogo";

const BRAND_PATH = "/api/platform/brand/";

beforeEach(() => {
  resetProductLogo();
});

/** The logo image's address; it is decorative, as the product's name is written beside it. */
function logoSrc(): string | null {
  return document.querySelector("img")?.getAttribute("src") ?? null;
}

describe("the product logo (issue 65)", () => {
  it("shows the uploaded logo on the brand, with the product's name", async () => {
    backend(on("GET", BRAND_PATH, { logo: { url: "/api/platform/brand/logo/2/" } }));

    render(<PlatformBrand />);

    await waitFor(() => {
      expect(logoSrc()).toContain("/api/platform/brand/logo/2/");
    });
    expect(screen.getByRole("heading", { level: 2, name: LABELS.productName })).toBeVisible();
  });

  it.each([
    ["no uploaded logo is in use", on("GET", BRAND_PATH, { logo: null })],
    ["it can't be loaded", on("GET", BRAND_PATH, {}, 500)],
  ])("shows the app's own logo, never initials, when %s (ticket 07)", async (_case, answer) => {
    backend(answer);

    render(<PlatformBrand />);

    expect(
      await screen.findByRole("heading", { level: 2, name: LABELS.productName }),
    ).toBeVisible();
    expect(logoSrc()).toBe(APP_LOGO_URL);
    expect(screen.queryByText("RC")).toBeNull();
  });

  it("shows a newly uploaded logo at once, without loading again", async () => {
    const fetchFn = backend(on("GET", BRAND_PATH, { logo: null }));
    render(<PlatformBrand />);
    await screen.findByRole("heading", { level: 2, name: LABELS.productName });

    act(() => {
      setProductLogo({ url: "/api/platform/brand/logo/3/" });
    });

    expect(logoSrc()).toContain("/api/platform/brand/logo/3/");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
