import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import NotFound from "./not-found";

const router = vi.hoisted(() => ({
  replace: vi.fn<(path: string) => void>(),
  back: vi.fn<() => void>(),
}));
const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => pathname.current,
}));

beforeEach(() => {
  router.replace.mockReset();
  router.back.mockReset();
});

describe("an address that doesn't exist (owner, 2026-11-27; was a redirect, issue 66)", () => {
  it("says the page isn't there, as a page of its own, and takes nobody anywhere by itself", () => {
    pathname.current = "/nope";

    render(<NotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: "We can't find that page" }),
    ).toBeVisible();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByText("The address may be wrong, or the page may have been moved or removed."),
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each([
    ["/students/x/y", "Go to Home", "/"],
    ["/nope", "Go to Home", "/"],
    ["/platform/nope", "Go to the Platform", "/platform"],
    ["/platform/admins/x", "Go to the Platform", "/platform"],
  ])("offers the way home from %s: %s (its login when logged out)", (path, name, home) => {
    pathname.current = path;

    render(<NotFound />);

    const link = screen.getByRole("link", { name });
    expect(link).toHaveAttribute("href", home);
    expect(link).toHaveAttribute("data-variant", "primary");
  });

  it("goes back to where the person came from", async () => {
    pathname.current = "/nope";
    render(<NotFound />);

    await userEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(router.back).toHaveBeenCalledOnce();
  });

  it("never shows the address typed as markup", () => {
    pathname.current = "/<img src=x onerror=alert(1)>";

    const { container } = render(<NotFound />);

    expect(container.querySelector("img")).toBeNull();
  });
});
