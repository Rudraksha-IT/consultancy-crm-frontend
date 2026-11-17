import { render, screen } from "@testing-library/react";

import { jsonResponse } from "@/lib/api/core/test-helpers";

import { JoinFromAddress } from "./JoinFromAddress";

const query = vi.hoisted(() => ({ current: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query.current) }));
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => vi.fn() }));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({ name: "Acme Education" }))),
  );
});

describe("JoinFromAddress (issue 66)", () => {
  it("shows the email from the address and that a code was sent", () => {
    query.current = "email=new%40acme.test&sent=1";

    render(<JoinFromAddress brand={null} />);

    expect(screen.getByText("new@acme.test")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("We've emailed you a new 6-digit code.");
  });

  it.each(["", "email=not-an-email&sent=1", "email=%3Cscript%3E%40x.com&sent=1", "sent=1"])(
    "asks for the email when the address gives none that is valid: %j",
    (search) => {
      query.current = search;

      render(<JoinFromAddress brand={null} />);

      expect(screen.getByLabelText("Email")).toHaveValue("");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    },
  );
});
