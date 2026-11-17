import { act, render, screen, waitFor } from "@testing-library/react";

import { LABELS } from "@/constants/messages";
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

  it("shows the initials while there is no logo, or when it can't be loaded", async () => {
    backend(on("GET", BRAND_PATH, { logo: null }, 500));

    render(<PlatformBrand />);

    expect(
      await screen.findByRole("heading", { level: 2, name: LABELS.productName }),
    ).toBeVisible();
    expect(logoSrc()).toBeNull();
  });

  it("shows a newly uploaded logo at once, without loading again", async () => {
    const fetchFn = backend(on("GET", BRAND_PATH, { logo: null }));
    render(<PlatformBrand />);
    await screen.findByRole("heading", { level: 2, name: LABELS.productName });

    act(() => {
      setProductLogo({ url: "/api/platform/brand/logo/3/", showName: true });
    });

    expect(logoSrc()).toContain("/api/platform/brand/logo/3/");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
