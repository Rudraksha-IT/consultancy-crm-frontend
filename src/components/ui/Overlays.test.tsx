import { uid } from "@/test/ids";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Menu } from "./Menu";
import { TextField } from "./TextField";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./useToast";

function DialogHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Add Lead
      </Button>
      <Dialog
        isOpen={isOpen}
        title="Add Lead"
        onClose={() => {
          setIsOpen(false);
        }}
        footer={<Button variant="primary">Save</Button>}
      >
        <TextField label="Full name" name="name" />
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("marks itself for printing only when printable", () => {
    const { rerender } = render(
      <Dialog isOpen title="Receipt" onClose={vi.fn()}>
        <p>Paid</p>
      </Dialog>,
    );
    expect(document.querySelector("[data-print]")).toBeNull();

    rerender(
      <Dialog isOpen isPrintable title="Receipt" onClose={vi.fn()}>
        <p>Paid</p>
      </Dialog>,
    );

    expect(document.querySelector("[data-print]")).toContainElement(
      screen.getByRole("dialog", { name: "Receipt" }),
    );
  });

  it("opens as a modal dialog named by its title, with focus on the first field", async () => {
    render(<DialogHarness />);

    await userEvent.click(screen.getByRole("button", { name: "Add Lead" }));

    const dialog = screen.getByRole("dialog", { name: "Add Lead" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("closes with Escape and gives focus back to what opened it", async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole("button", { name: "Add Lead" }));

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Lead" })).toHaveFocus();
  });

  it("closes with Escape even when focus has left it (e.g. its button was disabled)", async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole("button", { name: "Add Lead" }));
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    expect(document.body).toHaveFocus();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes with its close button", async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole("button", { name: "Add Lead" }));

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("puts focus on the close button when it has no field", () => {
    render(
      <Dialog isOpen title="Receipt" onClose={vi.fn()}>
        <p>Paid</p>
      </Dialog>,
    );

    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });
});

describe("Menu", () => {
  function renderMenu() {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    render(
      <Menu
        label="More"
        items={[
          { label: "Delete payment", onSelect: handleDelete, isDestructive: true },
          { label: "Edit payment", onSelect: handleEdit, icon: "edit" },
        ]}
      />,
    );
    return { handleEdit, handleDelete };
  }

  it("opens a menu with destructive items last, and focuses the first item", async () => {
    renderMenu();

    await userEvent.click(screen.getByRole("button", { name: "More" }));

    const items = screen.getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["Edit payment", "Delete payment"]);
    expect(items[0]).toHaveFocus();
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "true");
  });

  it("runs the chosen item and closes", async () => {
    const { handleDelete } = renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "More" }));

    await userEvent.click(screen.getByRole("menuitem", { name: "Delete payment" }));

    expect(handleDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("puts the cursor back on its button before the item runs, so a popup it opens can give it back", async () => {
    const { handleEdit } = renderMenu();
    const more = screen.getByRole("button", { name: "More" });
    handleEdit.mockImplementation(() => {
      // What a dialog opened by the item would remember as its opener.
      expect(more).toHaveFocus();
    });
    await userEvent.click(more);

    await userEvent.click(screen.getByRole("menuitem", { name: "Edit payment" }));

    expect(handleEdit).toHaveBeenCalledOnce();
    expect(more).toHaveFocus();
  });

  it("moves with the arrow keys and closes with Escape, back on its button", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "More" }));

    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Delete payment" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Edit payment" })).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Delete payment" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More" })).toHaveFocus();
  });

  it("can hold a link to another page, reached with the arrow keys too", async () => {
    render(
      <Menu
        label="More"
        items={[
          { label: "Edit details", href: `/students/${uid(7)}/edit`, icon: "edit" },
          { label: "Mark as Lost", onSelect: vi.fn(), isDestructive: true },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "More" }));

    const link = screen.getByRole("menuitem", { name: "Edit details" });
    expect(link).toHaveAttribute("href", `/students/${uid(7)}/edit`);
    expect(link).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Mark as Lost" })).toHaveFocus();
  });

  it("closes when clicking elsewhere", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "More" }));

    await userEvent.click(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

function ToastHarness() {
  const { showToast } = useToast();
  return (
    <Button
      onClick={() => {
        showToast("Visit saved");
      }}
    >
      Save visit
    </Button>
  );
}

describe("Toast", () => {
  it("confirms an action as a status, then goes away", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save visit" }));
    expect(screen.getByRole("status")).toHaveTextContent("Visit saved");

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Visit saved")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("can't be used outside its provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<ToastHarness />)).toThrow("useToast must be used inside a ToastProvider");
  });
});
