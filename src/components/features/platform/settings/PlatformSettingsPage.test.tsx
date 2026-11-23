import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

import { ProductNameProvider, useProductName } from "@/components/features/brand/ProductName";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { APP_LOGO_URL } from "@/lib/brand/appLogo";
import { backend, callsTo, on, onEach, type Answer } from "@/test/backend";
import { uid } from "@/test/ids";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { resetProductLogo } from "../productLogo";
import { PlatformSettingsPage } from "./PlatformSettingsPage";

const BRAND_PATH = "/api/platform/brand/";
const LOGO_PATH = "/api/platform/brand/logo/";
const SAVED_PATH = "/api/platform/brand/logos/";
const IN_USE_PATH = "/api/platform/brand/in-use/";

type Row = { id: string; file_url: string; uploaded_at: string; in_use: boolean };

function row(n: number, inUse = false): Row {
  return {
    id: uid(n),
    file_url: `/api/platform/brand/logos/${uid(n)}/file/`,
    uploaded_at: `2026-11-${String(10 + n)}T03:30:00Z`,
    in_use: inUse,
  };
}

/** The saved logos as the server holds them, changed by the calls the page makes. */
function savedLogos(start: Row[]): Answer[] {
  let rows = start;
  return [
    onEach("GET", SAVED_PATH, () => ({ logos: rows, limit: 10 })),
    (path, init) => {
      if (path !== IN_USE_PATH || init?.method !== "PUT") return undefined;
      const logo = pickedIn(init);
      rows = rows.map((one) => ({ ...one, in_use: one.id === logo }));
      return Response.json({ logo: logo === null ? null : { url: "/api/platform/brand/logo/9/" } });
    },
    (path, init) => {
      if (init?.method !== "DELETE" || !path.startsWith(SAVED_PATH)) return undefined;
      rows = rows.filter((one) => `${SAVED_PATH}${one.id}/` !== path);
      return new Response(null, { status: 204 });
    },
  ];
}

const PickSchema = z.object({ logo: z.string().nullable() });

/** The logo a PUT to the in-use address asked for. */
function pickedIn(init: RequestInit | undefined): string | null {
  const body = typeof init?.body === "string" ? init.body : "{}";
  return PickSchema.parse(JSON.parse(body)).logo;
}

function tile(name: string | RegExp): HTMLElement {
  return screen.getByRole("listitem", { name });
}

/** Where else on the page the product's name shows, as the Platform's header would. */
function NameElsewhere() {
  return <output aria-label="Name elsewhere">{useProductName()}</output>;
}

function renderPage(name = "Rudraksha CRM") {
  render(
    <ProductNameProvider name={name}>
      <ToastProvider>
        <NameElsewhere />
        <PlatformSettingsPage />
      </ToastProvider>
    </ProductNameProvider>,
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
    backend(on("GET", BRAND_PATH, { logo: null }), ...savedLogos([]));
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    expect(screen.getByText("Product logo")).toBeVisible();
    expect(screen.getByLabelText("Upload a logo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    expect(logoSrc()).toBe(APP_LOGO_URL);
  });

  it("uploads a logo, shows it and confirms", async () => {
    const fetchFn = backend(
      on("GET", BRAND_PATH, { logo: null }),
      on("POST", LOGO_PATH, { logo: { url: "/api/platform/brand/logo/1/" } }),
      // After the upload, the list has it, in use.
      onEach("GET", SAVED_PATH, () =>
        callsTo(fetchFn, "POST", LOGO_PATH).length > 0
          ? { logos: [row(1, true)], limit: 10 }
          : { logos: [], limit: 10 },
      ),
    );
    renderPage();

    await userEvent.upload(await screen.findByLabelText("Upload a logo"), png());

    expect(await screen.findByText("Logo saved")).toBeVisible();
    expect(await screen.findByRole("listitem", { name: /^Uploaded/ })).toHaveTextContent("In use");
    expect(logoSrc()).toContain("/api/platform/brand/logo/1/");
    expect(callsTo(fetchFn, "POST", LOGO_PATH)[0]?.[1]?.body).toBeInstanceOf(FormData);
    expect(screen.getByLabelText("Change logo")).toBeInTheDocument();
  });

  it("refuses a file that is too big or not an image, without sending it", async () => {
    const fetchFn = backend(on("GET", BRAND_PATH, { logo: null }), ...savedLogos([]));
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
      ...savedLogos([]),
    );
    renderPage();

    await userEvent.upload(await screen.findByLabelText("Upload a logo"), png());

    expect(await screen.findByText("Upload a PNG, SVG, JPG or WebP image.")).toBeVisible();
  });
});

describe("PlatformSettingsPage: saved logos (first live fixes, ticket 07)", () => {
  it("lists the app's own logo first, then the uploads, the one in use marked", async () => {
    backend(
      on("GET", BRAND_PATH, { logo: { url: "/api/platform/brand/logo/4/" } }),
      ...savedLogos([row(2, true), row(1)]),
    );
    renderPage();

    const list = await screen.findByRole("list", { name: "Saved logos" });
    await waitFor(() => {
      expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("aria-label")),
    ).toEqual([
      "The app's own logo",
      expect.stringMatching(/12 Nov/),
      expect.stringMatching(/11 Nov/),
    ]);
    const own = tile("The app's own logo");
    expect(own.querySelector("img")?.getAttribute("src")).toBe(APP_LOGO_URL);
    expect(own).toHaveTextContent("Use this");
    expect(within(own).queryByRole("button", { name: /Remove/ })).toBeNull();
    const newest = tile(/12 Nov/);
    expect(newest).toHaveTextContent("In use");
    expect(newest.querySelector("img")?.getAttribute("src")).toBe(row(2).file_url);
    expect(within(newest).queryByRole("button", { name: /^Use this/ })).toBeNull();
    const oldest = tile(/11 Nov/);
    expect(oldest).toHaveTextContent("Use this");
    expect(oldest).not.toHaveTextContent("In use");
  });

  it("marks the app's own logo in use when no upload is", async () => {
    backend(on("GET", BRAND_PATH, { logo: null }), ...savedLogos([row(1)]));
    renderPage();

    await waitFor(() => {
      expect(tile("The app's own logo")).toHaveTextContent("In use");
    });
  });

  it("uses an older logo in place, shows it everywhere and keeps focus on its tile", async () => {
    const fetchFn = backend(
      on("GET", BRAND_PATH, { logo: { url: "/api/platform/brand/logo/4/" } }),
      ...savedLogos([row(2, true), row(1)]),
    );
    renderPage();
    const older = await screen.findByRole("button", { name: /^Use this: Uploaded .*11/ });
    const scrolled = window.scrollY;

    await userEvent.click(older);

    expect(await screen.findByText("Logo changed")).toBeVisible();
    const [put] = callsTo(fetchFn, "PUT", IN_USE_PATH);
    expect(pickedIn(put?.[1])).toBe(uid(1));
    const picked = tile(/11 Nov/);
    expect(picked).toHaveTextContent("In use");
    expect(tile(/12 Nov/)).toHaveTextContent("Use this");
    expect(picked).toHaveFocus();
    expect(logoSrc()).toContain("/api/platform/brand/logo/9/");
    expect(window.scrollY).toBe(scrolled);
  });

  it("goes back to the app's own logo, shown on the login screens too", async () => {
    const fetchFn = backend(
      on("GET", BRAND_PATH, { logo: { url: "/api/platform/brand/logo/4/" } }),
      ...savedLogos([row(1, true)]),
    );
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "Use this: The app's own logo" }),
    );

    expect(await screen.findByText("Logo changed")).toBeVisible();
    const [put] = callsTo(fetchFn, "PUT", IN_USE_PATH);
    expect(pickedIn(put?.[1])).toBeNull();
    expect(tile("The app's own logo")).toHaveTextContent("In use");
    expect(logoSrc()).toBe(APP_LOGO_URL);
  });

  it("says so when a pick fails, changing nothing", async () => {
    backend(
      on("GET", BRAND_PATH, { logo: { url: "/api/platform/brand/logo/4/" } }),
      on("PUT", IN_USE_PATH, {}, 500),
      ...savedLogos([row(2, true), row(1)]),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /^Use this: Uploaded .*11/ }));

    expect(
      await screen.findByText("The logo couldn't be changed. Check your connection and try again."),
    ).toBeVisible();
    expect(tile(/12 Nov/)).toHaveTextContent("In use");
  });

  it("removes nothing until the popup is confirmed", async () => {
    const fetchFn = backend(on("GET", BRAND_PATH, { logo: null }), ...savedLogos([row(1)]));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /^Remove: Uploaded/ }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(tile(/^Uploaded/)).toBeVisible();
    expect(fetchFn.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(0);
  });

  it("removes the logo in use after confirming; the app's own logo is used again", async () => {
    const fetchFn = backend(
      on("GET", BRAND_PATH, { logo: { url: "/api/platform/brand/logo/4/" } }),
      ...savedLogos([row(1, true)]),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /^Remove: Uploaded/ }));
    const dialog = screen.getByRole("dialog", { name: "Remove this logo?" });
    expect(dialog).toHaveTextContent("If it is in use, the app's own logo is used instead.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Logo removed")).toBeVisible();
    expect(callsTo(fetchFn, "DELETE", `${SAVED_PATH}${uid(1)}/`)).toHaveLength(1);
    expect(screen.queryByRole("listitem", { name: /^Uploaded/ })).toBeNull();
    expect(tile("The app's own logo")).toHaveTextContent("In use");
    expect(logoSrc()).toBe(APP_LOGO_URL);
    expect(screen.getByRole("list", { name: "Saved logos" })).toHaveFocus();
  });

  it("says when the saved logos are full", async () => {
    const full = Array.from({ length: 10 }, (_, index) => row(index + 1, index === 0));
    backend(on("GET", BRAND_PATH, { logo: null }), ...savedLogos(full));
    renderPage();

    expect(
      await screen.findByText("You have 10 saved logos. Remove one before uploading another."),
    ).toBeVisible();
  });

  it("says so when the saved logos can't be loaded", async () => {
    backend(on("GET", BRAND_PATH, { logo: null }), on("GET", SAVED_PATH, {}, 500));
    renderPage();

    expect(
      await screen.findByText("We couldn't load the saved logos. Please refresh the page."),
    ).toBeVisible();
  });
});

describe.each(THEME_CASES)("PlatformSettingsPage in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });
  afterEach(resetTheme);

  it("labels the upload and shows the preview", async () => {
    backend(on("GET", BRAND_PATH, { logo: null }), ...savedLogos([row(1, true)]));
    renderPage();

    expect(await screen.findByLabelText("Upload a logo")).toBeInTheDocument();
    expect(screen.getByTestId("logo-preview")).toBeVisible();
    expect(await screen.findByRole("list", { name: "Saved logos" })).toBeVisible();
  });
});

describe("the product's name (first live fixes, ticket 15)", () => {
  const NAME_PATH = "/api/platform/brand/name/";

  function field(): HTMLElement {
    return screen.getByRole("textbox", { name: "Product name" });
  }

  function sentName(fetchFn: ReturnType<typeof backend>): unknown {
    const [call] = callsTo(fetchFn, "PUT", NAME_PATH);
    const body = call?.[1]?.body;
    return typeof body === "string" ? JSON.parse(body) : undefined;
  }

  it("shows the saved name, at most 40 characters, with what it may contain", () => {
    backend(onEach("GET", SAVED_PATH, () => ({ logos: [], limit: 10 })));
    renderPage("Acme Office Suite");

    expect(field()).toHaveValue("Acme Office Suite");
    expect(field()).toHaveAttribute("maxlength", "40");
    expect(
      screen.getByText("At most 40 characters: letters, numbers, spaces and . - & ' ( ) +"),
    ).toBeInTheDocument();
  });

  it("saves a new name, says so, and shows it everywhere on the page at once", async () => {
    const fetchFn = backend(
      onEach("GET", SAVED_PATH, () => ({ logos: [], limit: 10 })),
      on("PUT", NAME_PATH, { name: "Acme Office Suite" }),
    );
    renderPage();

    await userEvent.clear(field());
    await userEvent.type(field(), "  Acme   Office Suite ");
    await userEvent.click(screen.getByRole("button", { name: "Save name" }));

    expect(await screen.findByText("Product name saved.")).toBeInTheDocument();
    expect(sentName(fetchFn)).toEqual({ name: "  Acme   Office Suite " });
    expect(field()).toHaveValue("Acme Office Suite");
    expect(screen.getByRole("status", { name: "Name elsewhere" })).toHaveTextContent(
      "Acme Office Suite",
    );
    expect(within(screen.getByTestId("logo-preview")).getByText("Acme Office Suite")).toBeVisible();
  });

  it("asks for a name before sending a blank one", async () => {
    const fetchFn = backend(onEach("GET", SAVED_PATH, () => ({ logos: [], limit: 10 })));
    renderPage();

    await userEvent.clear(field());
    await userEvent.click(screen.getByRole("button", { name: "Save name" }));

    expect(screen.getByText("Enter the product's name.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "PUT", NAME_PATH)).toHaveLength(0);
  });

  it("says when nothing changed, without sending", async () => {
    const fetchFn = backend(onEach("GET", SAVED_PATH, () => ({ logos: [], limit: 10 })));
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Save name" }));

    expect(screen.getByText("That is already the product's name.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "PUT", NAME_PATH)).toHaveLength(0);
  });

  it("shows the server's reason under the field and keeps the old name", async () => {
    backend(
      onEach("GET", SAVED_PATH, () => ({ logos: [], limit: 10 })),
      on("PUT", NAME_PATH, { name: ["Use letters, numbers, spaces and . - & ' ( ) + only."] }, 400),
    );
    renderPage();

    await userEvent.clear(field());
    await userEvent.type(field(), "<b>Acme</b>");
    await userEvent.click(screen.getByRole("button", { name: "Save name" }));

    expect(
      await screen.findByText("Use letters, numbers, spaces and . - & ' ( ) + only."),
    ).toBeInTheDocument();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("status", { name: "Name elsewhere" })).toHaveTextContent(
      "Rudraksha CRM",
    );
  });

  it("says when it couldn't save, keeping what was typed", async () => {
    backend(
      onEach("GET", SAVED_PATH, () => ({ logos: [], limit: 10 })),
      on("PUT", NAME_PATH, { detail: "Server error" }, 500),
    );
    renderPage();

    await userEvent.clear(field());
    await userEvent.type(field(), "Acme Office Suite");
    await userEvent.click(screen.getByRole("button", { name: "Save name" }));

    expect(
      await screen.findByText("We couldn't save the product's name. Please try again."),
    ).toBeInTheDocument();
    expect(field()).toHaveValue("Acme Office Suite");
  });
});
