import { render, screen } from "@testing-library/react";

import { SupportEnter } from "./SupportEnter";

const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

const CODE = "Xy_9-abcdefghijklmnopqrstuvwxyz0123456789AB";

beforeEach(() => {
  navigate.mockReset();
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("SupportEnter", () => {
  it("takes the code off the address, enters once and opens Home", async () => {
    window.history.replaceState(null, "", `/support-access#${CODE}`);
    const enter = vi.fn<(code: string) => Promise<unknown>>().mockResolvedValue({});

    const { rerender } = render(<SupportEnter enter={enter} />);
    rerender(<SupportEnter enter={enter} />);

    expect(window.location.hash).toBe("");
    expect(screen.getByText("Opening the office…")).toBeVisible();
    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/");
    });
    expect(enter).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledWith(CODE);
  });

  it.each([
    ["no code", ""],
    ["something that isn't a code", "#<script>alert(1)</script>"],
  ])("never sends %s and says the link has expired", async (_name, hash) => {
    window.history.replaceState(null, "", `/support-access${hash}`);
    const enter = vi.fn<(code: string) => Promise<unknown>>().mockResolvedValue({});

    render(<SupportEnter enter={enter} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This link has expired. Open the office again from the Platform.",
    );
    expect(enter).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("says the link has expired when the office refuses the code", async () => {
    window.history.replaceState(null, "", `/support-access#${CODE}`);
    const enter = vi.fn<(code: string) => Promise<unknown>>().mockRejectedValue(new Error("400"));

    render(<SupportEnter enter={enter} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("This link has expired.");
    expect(navigate).not.toHaveBeenCalled();
  });
});
