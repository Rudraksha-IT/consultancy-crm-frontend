import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";

import ErrorPage from "./error";
import GlobalError from "./global-error";

const reload = vi.hoisted(() => ({ reloadPage: vi.fn<() => void>() }));
vi.mock("@/lib/browser", () => reload);

function digestError(digest?: string): Error & { digest?: string } {
  const error: Error & { digest?: string } = new Error("could not read sita@acme.test");
  if (digest !== undefined) error.digest = digest;
  return error;
}

describe("the error page", () => {
  it("is a page of its own: what happened, as an alert, with the reference to quote", () => {
    render(<ErrorPage error={digestError("2417294843")} reset={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong." })).toBeVisible();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong.");
    expect(alert).toHaveTextContent("Reference: 2417294843");
    expect(alert).not.toHaveTextContent("sita@acme.test");
    expect(
      screen.getByText("Reload the page to carry on. If it keeps happening, tell your Admin."),
    ).toBeInTheDocument();
  });

  it("has no reference line without a digest", () => {
    render(<ErrorPage error={digestError()} reset={vi.fn()} />);

    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });

  it("reloads the whole page, which is what clears it, and offers the way home", async () => {
    render(<ErrorPage error={digestError()} reset={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Reload the page" }));

    expect(reload.reloadPage).toHaveBeenCalledOnce();
    // A plain link, so Home opens with a full load and nothing broken is kept.
    const home = screen.getByRole("link", { name: "Go to Home" });
    expect(home).toHaveAttribute("href", "/");
  });
});

describe("the global error page (the layout itself failed)", () => {
  it("is a whole document showing the same banner and reference", () => {
    const html = renderToStaticMarkup(<GlobalError error={digestError("99")} reset={vi.fn()} />);

    expect(html).toMatch(/^<html lang="en"/);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Something went wrong.");
    expect(html).toContain("Reference: 99");
    expect(html).toContain("Reload the page");
    expect(html).not.toContain("sita@acme.test");
  });

  it("keeps the product's tab icon (first live fixes, ticket 05)", () => {
    const html = renderToStaticMarkup(<GlobalError error={digestError("99")} reset={vi.fn()} />);

    expect(html).toContain('<link rel="icon" href="/tab-icon"/>');
  });
});
