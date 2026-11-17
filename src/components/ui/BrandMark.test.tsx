import { render, screen } from "@testing-library/react";

import { BrandLockup } from "./BrandLockup";
import { BrandMark } from "./BrandMark";

const LOGO = { url: "/api/consultancy/logo/3/", showName: true };

describe("BrandMark", () => {
  it("shows the initials without a logo", () => {
    const { container } = render(<BrandMark name="Acme Education" />);

    expect(container).toHaveTextContent("AE");
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the logo, decorative while the name is written beside it", () => {
    const { container } = render(<BrandMark name="Acme Education" logo={LOGO} />);

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "/api/consultancy/logo/3/");
    expect(image).toHaveAttribute("alt", "");
    expect(container).not.toHaveTextContent("AE");
  });

  it("names the office when the logo stands alone", () => {
    render(<BrandMark name="Acme Education" logo={{ ...LOGO, showName: false }} />);

    expect(screen.getByRole("img", { name: "Acme Education" })).toBeInTheDocument();
  });

  it("is sized by tokens only, wide logos kept within their space", () => {
    const { container, rerender } = render(<BrandMark name="Acme" logo={LOGO} />);
    expect(container.querySelector("img")).toHaveClass("h-mark", "max-w-logo", "object-contain");

    rerender(<BrandMark name="Acme" logo={LOGO} size="lg" />);
    expect(container.querySelector("img")).toHaveClass("h-mark-lg", "max-w-logo-lg");

    rerender(<BrandMark name="Acme" logo={LOGO} size="rail" />);
    expect(container.querySelector("img")).toHaveClass("h-mark", "max-w-logo-rail");
  });
});

describe("BrandLockup", () => {
  it("writes the name and tagline beside the initials", () => {
    render(<BrandLockup name="Acme Education" tagline="Education consultancy" />);

    expect(screen.getByText("Acme Education")).toBeInTheDocument();
    expect(screen.getByText("Education consultancy")).toBeInTheDocument();
  });

  it("writes the name beside a logo when chosen", () => {
    render(<BrandLockup name="Acme Education" tagline="Education consultancy" logo={LOGO} />);

    expect(screen.getByText("Acme Education")).toBeInTheDocument();
  });

  it("shows the logo alone when the name is switched off, still named for screen readers", () => {
    render(
      <BrandLockup
        name="Acme Education"
        tagline="Education consultancy"
        logo={{ ...LOGO, showName: false }}
      />,
    );

    expect(screen.queryByText("Acme Education")).toBeNull();
    expect(screen.queryByText("Education consultancy")).toBeNull();
    expect(screen.getByRole("img", { name: "Acme Education" })).toBeInTheDocument();
  });
});
