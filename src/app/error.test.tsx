import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";

import ErrorPage from "./error";
import GlobalError from "./global-error";

function digestError(digest?: string): Error & { digest?: string } {
  const error: Error & { digest?: string } = new Error("could not read sita@acme.test");
  if (digest !== undefined) error.digest = digest;
  return error;
}

describe("the error page", () => {
  it("shows the unexpected-error banner with the reference to quote", () => {
    render(<ErrorPage error={digestError("2417294843")} reset={vi.fn()} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong.");
    expect(alert).toHaveTextContent("Reference: 2417294843");
    expect(alert).not.toHaveTextContent("sita@acme.test");
  });

  it("has no reference line without a digest, and tries again", async () => {
    const reset = vi.fn();
    render(<ErrorPage error={digestError()} reset={reset} />);

    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});

describe("the global error page (the layout itself failed)", () => {
  it("is a whole document showing the same banner and reference", () => {
    const html = renderToStaticMarkup(<GlobalError error={digestError("99")} reset={vi.fn()} />);

    expect(html).toMatch(/^<html lang="en"/);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Something went wrong.");
    expect(html).toContain("Reference: 99");
    expect(html).toContain("Try again");
    expect(html).not.toContain("sita@acme.test");
  });

  it("keeps the product's tab icon (first live fixes, ticket 05)", () => {
    const html = renderToStaticMarkup(<GlobalError error={digestError("99")} reset={vi.fn()} />);

    expect(html).toContain('<link rel="icon" href="/tab-icon"/>');
  });
});
