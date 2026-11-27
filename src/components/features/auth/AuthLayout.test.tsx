import { LABELS } from "@/constants/messages";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlatformBrand } from "@/components/features/platform/PlatformBrand";
import { buildThemeTokens } from "@/lib/theme";
import { resetTheme } from "@/test/themes";

import { AuthLayout } from "./AuthLayout";

afterEach(resetTheme);

describe("AuthLayout", () => {
  it("shows the brand above one panel with the screen's title and intro", () => {
    render(
      <AuthLayout brand={<p>Brand</p>} title="Log in" intro="Use your work email and password.">
        <p>Form</p>
      </AuthLayout>,
    );

    expect(screen.getByRole("main")).toHaveTextContent("Brand");
    expect(screen.getByRole("heading", { level: 1, name: "Log in" })).toBeInTheDocument();
    expect(screen.getByText("Use your work email and password.")).toBeInTheDocument();
    expect(screen.getByText("Form")).toBeInTheDocument();
  });
});

describe("AuthLayout light and dark", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("has a light/dark button that switches the screen and remembers the choice", async () => {
    render(
      <AuthLayout brand={<PlatformBrand />} title="Log in" intro="Intro">
        <p>Form</p>
      </AuthLayout>,
    );
    const toLight = screen.queryByRole("button", { name: LABELS.switchToLight });
    const button = toLight ?? screen.getByRole("button", { name: LABELS.switchToDark });
    const before = document.documentElement.dataset.theme;

    await userEvent.click(button);

    expect(document.documentElement.dataset.theme).not.toBe(before);
    expect(window.localStorage.getItem("crm.colour-mode.visitor")).toBe(
      toLight === null ? "dark" : "light",
    );
  });
});

describe("PlatformBrand", () => {
  it("shows a line under the name only when given one", () => {
    render(<PlatformBrand tagline={LABELS.staffLogin} />);

    expect(screen.getByText(LABELS.staffLogin)).toBeInTheDocument();
  });

  it("shows the product's name in the Porcelain theme", () => {
    render(<PlatformBrand />);

    expect(screen.getByRole("heading", { level: 2, name: LABELS.productName })).toBeInTheDocument();
    expect(screen.queryByText(LABELS.platform)).not.toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(
      buildThemeTokens().light.accent,
    );
  });
});
