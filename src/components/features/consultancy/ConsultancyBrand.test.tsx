import { TEST_COLOURS } from "@/lib/theme/testColours";
import { render, screen, waitFor } from "@testing-library/react";

import { buildThemeTokens, normaliseThemeConfig } from "@/lib/theme";
import { resetTheme } from "@/test/themes";

import { ConsultancyBrand } from "./ConsultancyBrand";

const CRIMSON = { page: "ice", sidebar: TEST_COLOURS.white, accent: TEST_COLOURS.crimson };

function answerWith(response: Response): void {
  vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(response));
}

afterEach(resetTheme);

describe("ConsultancyBrand", () => {
  it("shows the current Consultancy's mark and name, large and centred", async () => {
    answerWith(new Response(JSON.stringify({ name: "Acme Education", theme: CRIMSON })));

    render(<ConsultancyBrand />);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Acme Education" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Education consultancy")).toBeInTheDocument();
  });

  it("shows the office logo large and centred, with the name", async () => {
    const logo = { url: "/api/consultancy/logo/2/", show_name: false };
    answerWith(new Response(JSON.stringify({ name: "Acme Education", theme: CRIMSON, logo })));

    const { container } = render(<ConsultancyBrand />);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Acme Education" }),
    ).toBeInTheDocument();
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "/api/consultancy/logo/2/");
    expect(image).toHaveClass("h-mark-lg");
  });

  it("colours the page with the Consultancy's Theme, following the device's light or dark", async () => {
    answerWith(new Response(JSON.stringify({ name: "Acme Education", theme: CRIMSON })));

    render(<ConsultancyBrand />);
    await screen.findByRole("heading", { level: 2 });

    const expected = buildThemeTokens(normaliseThemeConfig(CRIMSON)).light.accent;
    // The Theme is applied in an effect after the name shows.
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--accent")).toBe(expected);
    });
  });

  it("shows a loading message while the name is being fetched", () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockReturnValue(new Promise(() => undefined)));

    render(<ConsultancyBrand />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows an error when the Consultancy cannot be loaded", async () => {
    answerWith(new Response("", { status: 404 }));

    render(<ConsultancyBrand />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't find this Consultancy. Check the address and try again.",
    );
  });

  it("says, before anyone logs in, why the office can only be read or not used", async () => {
    const message =
      "Your office's account is past due, so you can look things up but not make changes. Ask your Admin to contact the CRM team.";
    answerWith(
      new Response(
        JSON.stringify({ name: "Acme Education", status: "past_due", status_message: message }),
      ),
    );

    render(<ConsultancyBrand />);

    expect(await screen.findByRole("status")).toHaveTextContent(message);
  });

  it("shows no Status message for a working office", async () => {
    answerWith(
      new Response(
        JSON.stringify({ name: "Acme Education", status: "active", status_message: null }),
      ),
    );

    render(<ConsultancyBrand />);

    await screen.findByRole("heading", { level: 2, name: "Acme Education" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
