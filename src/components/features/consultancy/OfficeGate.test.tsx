import { render, screen } from "@testing-library/react";

import { jsonResponse } from "@/lib/api/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { OfficeGate } from "./OfficeGate";

const OFFICE = {
  name: "Acme Education",
  theme: DEFAULT_THEME,
  logo: null,
  status: "active",
  status_message: null,
};

function answering(response: Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() => Promise.resolve(response)),
  );
}

describe("OfficeGate (issue 66)", () => {
  it("shows the screen once the office is found", async () => {
    answering(jsonResponse(OFFICE));

    render(
      <OfficeGate>
        <p>Login form</p>
      </OfficeGate>,
    );

    expect(await screen.findByText("Login form")).toBeVisible();
  });

  it("shows no form while the office is being looked up", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => new Promise(() => undefined)),
    );

    render(
      <OfficeGate>
        <p>Login form</p>
      </OfficeGate>,
    );

    expect(screen.queryByText("Login form")).not.toBeInTheDocument();
  });

  it("says plainly there is no office at this address, with no form", async () => {
    answering(jsonResponse({ detail: "Not found." }, 404));

    render(
      <OfficeGate>
        <p>Login form</p>
      </OfficeGate>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "There's no office at this address" }),
    ).toBeVisible();
    expect(
      screen.getByText("Check the address, or ask your Admin for your office's link."),
    ).toBeVisible();
    expect(screen.queryByText("Login form")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("says the server can't be reached, rather than that the office doesn't exist", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));

    render(
      <OfficeGate>
        <p>Login form</p>
      </OfficeGate>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "We can't reach the server" }),
    ).toBeVisible();
    expect(screen.getByText("Check your connection, then refresh the page.")).toBeVisible();
    expect(screen.queryByText("Login form")).not.toBeInTheDocument();
  });
});

describe.each(THEME_CASES)("OfficeGate in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });
  afterEach(resetTheme);

  it("shows the not-found screen with its light/dark button", async () => {
    answering(jsonResponse({ detail: "Not found." }, 404));

    render(
      <OfficeGate>
        <p>Login form</p>
      </OfficeGate>,
    );

    expect(await screen.findByRole("heading", { level: 1 })).toBeVisible();
    expect(screen.getByRole("button", { name: /Switch to/ })).toBeVisible();
  });
});

describe("OfficeGate's message (issue 66)", () => {
  it("is just two lines: the title, then the explanation, with no panel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({ detail: "Not found." }, 404))),
    );

    render(
      <OfficeGate>
        <p>Login form</p>
      </OfficeGate>,
    );

    const title = await screen.findByRole("heading", { level: 1 });
    const help = title.nextElementSibling;
    expect(help?.textContent).toBe("Check the address, or ask your Admin for your office's link.");
    expect(title.parentElement?.children).toHaveLength(2);
  });
});
