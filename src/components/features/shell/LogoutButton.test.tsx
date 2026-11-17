import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LogoutButton } from "./LogoutButton";

const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

beforeEach(() => {
  navigate.mockReset();
});

describe("LogoutButton", () => {
  it("disables itself while logging out", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockReturnValue(new Promise(() => undefined)));
    render(<LogoutButton />);

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(screen.getByRole("button", { name: "Logging out…" })).toBeDisabled();
  });

  it("stays logged in and shows an error when logout fails", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));
    render(<LogoutButton />);

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't log you out. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Log out" })).toBeEnabled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
