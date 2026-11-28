import { render, screen } from "@testing-library/react";

import { BrandLockup } from "./BrandLockup";
import { BrandMark } from "./BrandMark";

const LOGO = { url: "/api/consultancy/logo/3/" };

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
  it("writes the name alone beside the initials", () => {
    render(<BrandLockup name="Acme Education" />);

    expect(screen.getByText("Acme Education")).toBeInTheDocument();
    expect(screen.queryByText("Education consultancy")).toBeNull();
    // The office's name is always in Fraunces (owner, 2026-11-28).
    expect(screen.getByText("Acme Education")).toHaveClass("font-office");
  });

  it("always writes the name beside a logo, with no way to hide it (owner, 2026-11-27)", () => {
    const { container } = render(<BrandLockup name="Acme Education" logo={LOGO} />);

    expect(screen.getByText("Acme Education")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
