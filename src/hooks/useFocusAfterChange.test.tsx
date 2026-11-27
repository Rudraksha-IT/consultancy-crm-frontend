import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { Dialog } from "@/components/ui/Dialog";

import { useFocusAfterChange } from "./useFocusAfterChange";

/** A list whose rows are removed after a popup asks, as Course files and holidays are. */
function Rows({ names }: { names: readonly string[] }) {
  const [rows, setRows] = useState(names);
  const [asking, setAsking] = useState<string | null>(null);
  const focusAfterChange = useFocusAfterChange();

  function remove(name: string): void {
    const place = rows.indexOf(name);
    setRows((kept) => kept.filter((one) => one !== name));
    setAsking(null);
    focusAfterChange(() => {
      const buttons = [...document.querySelectorAll<HTMLElement>("[data-row-button]")];
      return buttons[place] ?? buttons[place - 1] ?? document.getElementById("add");
    });
  }

  return (
    <>
      {rows.map((name) => (
        <button
          key={name}
          type="button"
          data-row-button
          onClick={() => {
            setAsking(name);
          }}
        >
          Remove {name}
        </button>
      ))}
      <input id="add" aria-label="New row" />
      <Dialog
        isOpen={asking !== null}
        title="Remove it?"
        onClose={() => {
          setAsking(null);
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (asking !== null) remove(asking);
          }}
        >
          Yes, remove
        </button>
      </Dialog>
    </>
  );
}

function removeRow(name: string): void {
  const opener = screen.getByRole("button", { name: `Remove ${name}` });
  opener.focus();
  fireEvent.click(opener);
  fireEvent.click(screen.getByRole("button", { name: "Yes, remove" }));
}

describe("useFocusAfterChange", () => {
  beforeEach(() => {
    // No timer may be needed: a timer can fire before the screen has changed, and the cursor
    // then lands on a row that is about to go.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("puts the cursor on the row now in the removed row's place", () => {
    render(<Rows names={["Dashain", "Tihar", "Holi"]} />);

    removeRow("Tihar");

    expect(screen.getByRole("button", { name: "Remove Holi" })).toHaveFocus();
  });

  it("falls back to the row before when the last row goes", () => {
    render(<Rows names={["Dashain", "Tihar"]} />);

    removeRow("Tihar");

    expect(screen.getByRole("button", { name: "Remove Dashain" })).toHaveFocus();
  });

  it("goes where the finder says when no row is left", () => {
    render(<Rows names={["Dashain"]} />);

    removeRow("Dashain");

    expect(screen.getByRole("textbox", { name: "New row" })).toHaveFocus();
  });

  it("wins over the popup giving the cursor back to the button that opened it", () => {
    render(<Rows names={["Dashain", "Tihar"]} />);

    // The opener (Dashain's button) stays on the page here, and the popup would take focus back.
    const opener = screen.getByRole("button", { name: "Remove Dashain" });
    opener.focus();
    fireEvent.click(opener);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Yes, remove" }));
    });

    expect(screen.getByRole("button", { name: "Remove Tihar" })).toHaveFocus();
  });

  it("leaves the cursor alone when the finder finds nothing", () => {
    function Nothing() {
      const focusAfterChange = useFocusAfterChange();
      return (
        <button
          type="button"
          onClick={() => {
            focusAfterChange(() => null);
          }}
        >
          Press
        </button>
      );
    }
    render(<Nothing />);
    const button = screen.getByRole("button", { name: "Press" });
    button.focus();

    fireEvent.click(button);

    expect(button).toHaveFocus();
  });

  it("does not scroll the page to what it focuses", () => {
    render(<Rows names={["Dashain", "Tihar"]} />);
    const next = screen.getByRole("button", { name: "Remove Tihar" });
    const focus = vi.spyOn(next, "focus");

    removeRow("Dashain");

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
