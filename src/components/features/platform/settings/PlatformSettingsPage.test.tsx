import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { backend, callsTo, on } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { resetProductLogo } from "../productLogo";
import { PlatformSettingsPage } from "./PlatformSettingsPage";

const BRAND_PATH = "/api/platform/brand/";
const LOGO_PATH = "/api/platform/brand/logo/";

function renderPage() {
  render(
    <ToastProvider>
      <PlatformSettingsPage />
    </ToastProvider>,
  );
}

function png(size = 10): File {
  return new File([new Uint8Array(size)], "logo.png", { type: "image/png" });
}

function logoSrc(): string | null {
  return document.querySelector("[data-testid=logo-preview] img")?.getAttribute("src") ?? null;
}

beforeEach(() => {
  resetProductLogo();
});

describe("PlatformSettingsPage: the product logo (issue 65)", () => {
  it("offers to upload a logo while there is none", async () => {
    backend(on("GET", BRAND_PATH, { logo: null }));
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    expect(screen.getByText("Product logo")).toBeVisible();
    expect(screen.getByLabelText("Upload a logo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    expect(logoSrc()).toBeNull();
  });

  it("uploads a logo, shows it and confirms", async () => {
    const fetchFn = backend(
      on("GET", BRAND_PATH, { logo: null }),
      on("POST", LOGO_PATH, { logo: { url: "/api/platform/brand/logo/1/" } }),
    );
    renderPage();

    await userEvent.upload(await screen.findByLabelText("Upload a logo"), png());

    expect(await screen.findByText("Logo saved")).toBeVisible();
    expect(logoSrc()).toContain("/api/platform/brand/logo/1/");
    expect(callsTo(fetchFn, "POST", LOGO_PATH)[0]?.[1]?.body).toBeInstanceOf(FormData);
    expect(screen.getByLabelText("Change logo")).toBeInTheDocument();
  });

  it("refuses a file that is too big or not an image, without sending it", async () => {
    const fetchFn = backend(on("GET", BRAND_PATH, { logo: null }));
    renderPage();
    const input = await screen.findByLabelText("Upload a logo");

    await userEvent.upload(input, png(1024 * 1024 + 1));
    expect(await screen.findByText("That file is over 1 MB. Pick a smaller logo.")).toBeVisible();

    await userEvent.upload(input, new File(["x"], "logo.gif", { type: "image/gif" }), {
      applyAccept: false,
    });
    expect(await screen.findByText("Upload a PNG, SVG, JPG or WebP image.")).toBeVisible();
    expect(callsTo(fetchFn, "POST", LOGO_PATH)).toHaveLength(0);
  });

  it("shows the server's reason for a refused file", async () => {
    backend(
      on("GET", BRAND_PATH, { logo: null }),
      on("POST", LOGO_PATH, { file: ["Upload a PNG, SVG, JPG or WebP image."] }, 400),
    );
    renderPage();

    await userEvent.upload(await screen.findByLabelText("Upload a logo"), png());

    expect(await screen.findByText("Upload a PNG, SVG, JPG or WebP image.")).toBeVisible();
  });

  it("removes nothing until the popup is confirmed", async () => {
    const fetchFn = backend(
      on("GET", BRAND_PATH, { logo: { url: "/api/platform/brand/logo/4/" } }),
    );
    renderPage();
    await waitFor(() => {
      expect(logoSrc()).toContain("/api/platform/brand/logo/4/");
    });

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(logoSrc()).toContain("/api/platform/brand/logo/4/");
    expect(callsTo(fetchFn, "DELETE", LOGO_PATH)).toHaveLength(0);
  });

  it("removes the logo; the initials show again", async () => {
    const fetchFn = backend(
      on("GET", BRAND_PATH, { logo: { url: "/api/platform/brand/logo/4/" } }),
      (path, init) =>
        path === LOGO_PATH && init?.method === "DELETE"
          ? new Response(null, { status: 204 })
          : undefined,
    );
    renderPage();
    await waitFor(() => {
      expect(logoSrc()).toContain("/api/platform/brand/logo/4/");
    });

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = screen.getByRole("dialog", { name: "Remove the logo?" });
    expect(dialog).toHaveTextContent("The product name shows in its place.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Logo removed")).toBeVisible();
    expect(logoSrc()).toBeNull();
    expect(callsTo(fetchFn, "DELETE", LOGO_PATH)).toHaveLength(1);
  });
});

describe.each(THEME_CASES)("PlatformSettingsPage in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });
  afterEach(resetTheme);

  it("labels the upload and shows the preview", async () => {
    backend(on("GET", BRAND_PATH, { logo: null }));
    renderPage();

    expect(await screen.findByLabelText("Upload a logo")).toBeInTheDocument();
    expect(screen.getByTestId("logo-preview")).toBeVisible();
  });
});
