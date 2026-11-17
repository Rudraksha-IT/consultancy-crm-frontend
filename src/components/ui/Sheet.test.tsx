import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "./Button";
import { Dialog } from "./Dialog";

function showDialog(onClose = vi.fn()) {
  render(
    <Dialog
      isOpen
      title="Add a visitor"
      onClose={onClose}
      footer={
        <>
          <Button>Cancel</Button>
          <Button variant="primary">Save visit</Button>
        </>
      }
    >
      <label>
        Name
        <input />
      </label>
    </Dialog>,
  );
  return onClose;
}

function panel(): HTMLElement {
  return screen.getByRole("dialog", { name: "Add a visitor" });
}

describe("a dialog on a phone is a bottom sheet", () => {
  it("rises from the bottom across the full width, with rounded top corners", () => {
    showDialog();

    const overlay = panel().parentElement;
    expect(overlay).toHaveClass("max-phone:items-end", "max-phone:p-0");
    expect(panel()).toHaveClass(
      "max-phone:max-w-none",
      "max-phone:rounded-t-sheet",
      "max-phone:rounded-b-none",
      "max-phone:animate-sheet-up",
    );
  });

  it("has a grab handle, hidden from screen readers and above 640 px", () => {
    showDialog();

    const handle = panel().querySelector("[data-grab-handle]");
    expect(handle).toHaveAttribute("aria-hidden", "true");
    expect(handle).toHaveClass("phone:hidden");
  });

  it("scrolls its content while the header and the buttons stay in view", () => {
    showDialog();

    expect(panel()).toHaveClass(
      "max-phone:flex",
      "max-phone:flex-col",
      "max-phone:overflow-hidden",
    );
    const body = screen.getByRole("textbox").closest("[data-dialog-body]");
    expect(body).toHaveClass("max-phone:min-h-0", "max-phone:overflow-y-auto");
    expect(screen.getByRole("heading", { name: "Add a visitor" }).closest("header")).toHaveClass(
      "max-phone:flex-none",
    );
    const footer = screen.getByRole("button", { name: "Save visit" }).closest("footer");
    expect(footer).toHaveClass("max-phone:flex-none", "max-phone:pb-sheet-safe");
  });

  it("shares the width between the buttons", () => {
    showDialog();

    const footer = screen.getByRole("button", { name: "Save visit" }).closest("footer");
    expect(footer).toHaveClass("max-phone:*:flex-1");
  });

  it("still closes with Escape", async () => {
    const onClose = showDialog();

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
  });
});
