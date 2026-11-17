import { act, render, screen } from "@testing-library/react";

import { reportUnexpectedError } from "@/lib/api/unexpected";

import { UnexpectedErrorBanner } from "./UnexpectedErrorBanner";

const path = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.current }));

const REFERENCE = "3f1c0000-0000-4000-8000-000000000000";

afterEach(() => {
  path.current = "/";
});

describe("UnexpectedErrorBanner", () => {
  it("shows nothing until the server reports an unexpected error", () => {
    render(<UnexpectedErrorBanner />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the reference the server gave", () => {
    render(<UnexpectedErrorBanner />);

    act(() => {
      reportUnexpectedError(REFERENCE);
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong.");
    expect(alert).toHaveTextContent(`Reference: ${REFERENCE}`);
  });

  it("goes away when the person moves to another page", () => {
    const { rerender } = render(<UnexpectedErrorBanner />);
    act(() => {
      reportUnexpectedError(REFERENCE);
    });

    path.current = "/students";
    rerender(<UnexpectedErrorBanner />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
