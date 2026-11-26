import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "./Button";
import { CheckboxField } from "./CheckboxField";
import { CheckboxGroup } from "./CheckboxGroup";
import { Dialog } from "./Dialog";
import { Menu } from "./Menu";
import { MenuList } from "./MenuList";
import { Switch } from "./Switch";

function LongDialog({ rows }: { rows: number }) {
  return (
    <Dialog
      isOpen
      title="Add a visitor"
      onClose={vi.fn()}
      footer={
        <>
          <Button>Cancel</Button>
          <Button variant="primary">Save visit</Button>
        </>
      }
    >
      {Array.from({ length: rows }, (_, index) => (
        <p key={index}>Line {index + 1}</p>
      ))}
    </Dialog>
  );
}

function panel(): HTMLElement {
  return screen.getByRole("dialog", { name: "Add a visitor" });
}

function body(): HTMLElement {
  const found = panel().querySelector<HTMLElement>("[data-dialog-body]");
  if (found === null) throw new Error("The dialog has no body");
  return found;
}

describe("a long popup keeps its title and its buttons in view (UI revamp 23)", () => {
  it("scrolls only its middle, on every width", () => {
    render(<LongDialog rows={40} />);

    expect(panel()).toHaveClass("flex", "flex-col", "overflow-hidden", "max-h-full");
    expect(panel()).not.toHaveClass("overflow-auto");
    expect(body()).toHaveClass("min-h-0", "flex-1", "overflow-y-auto", "overscroll-contain");
    const header = screen.getByRole("heading", { name: "Add a visitor" }).closest("header");
    expect(header).toHaveClass("flex-none");
    expect(header).not.toHaveClass("overflow-y-auto");
  });

  it("keeps its footer at the bottom, under a thin line above phone width", () => {
    render(<LongDialog rows={40} />);

    const footer = screen.getByRole("button", { name: "Save visit" }).closest("footer");
    expect(footer).toBe(panel().lastElementChild);
    expect(footer).toHaveClass("flex-none", "phone:border-t", "border-rule");
    expect(footer).not.toHaveClass("overflow-y-auto");
    expect(body().nextElementSibling).toBe(footer);
  });

  it("keeps the sheet's padding from its sides", () => {
    render(<LongDialog rows={2} />);

    const footer = screen.getByRole("button", { name: "Save visit" }).closest("footer");
    expect(body()).toHaveClass("px-5", "phone:px-8", "max-phone:px-4");
    expect(footer).toHaveClass("phone:px-6", "max-phone:px-4");
  });

  it("keeps the middle's scroll when the dialog is drawn again", () => {
    const { rerender } = render(<LongDialog rows={40} />);
    const before = body();
    before.scrollTop = 180;

    rerender(<LongDialog rows={41} />);

    expect(body()).toBe(before);
    expect(body().scrollTop).toBe(180);
    expect(screen.getByText("Line 41")).toBeInTheDocument();
  });

  it("prints all of its middle", () => {
    render(<LongDialog rows={2} />);

    expect(panel()).toHaveClass("print:block", "print:overflow-visible");
    expect(body()).toHaveClass("print:overflow-visible");
  });
});

describe("a menu in a page's action row stays on a phone's screen (UI revamp 23)", () => {
  it("opens from the left of its row and is no wider than the screen less its margins", async () => {
    render(<Menu label="More" items={[{ label: "Edit details", onSelect: vi.fn() }]} />);

    await userEvent.click(screen.getByRole("button", { name: "More" }));

    const menu = screen.getByRole("menu", { name: "More" });
    expect(menu).toHaveClass(
      "max-phone:left-0",
      "max-phone:right-auto",
      "max-phone:top-auto",
      "max-phone:max-w-menu-phone",
    );
    // Its row, not its button, is what it is placed from on phones.
    expect(menu.parentElement).toHaveClass("relative", "max-phone:static");
  });

  it("leaves a menu outside a row (your menu in the top bar) where it was", () => {
    render(
      <MenuList
        id="your-menu"
        label="Your menu"
        items={[{ label: "Settings", onSelect: vi.fn() }]}
        onChosen={vi.fn()}
      />,
    );

    const menu = screen.getByRole("menu", { name: "Your menu" });
    expect(menu).toHaveClass("right-0");
    expect(menu).not.toHaveClass("max-phone:left-0");
  });
});

describe("the email writer's header on phones (UI revamp 23)", () => {
  function showWriter() {
    render(
      <Dialog
        isOpen
        isFull
        title="Email Sita Gurung"
        onClose={vi.fn()}
        headerAside={<button type="button">Preview</button>}
      >
        <textarea aria-label="Message" />
      </Dialog>,
    );
    const header = screen.getByRole("heading", { name: "Email Sita Gurung" }).closest("header");
    if (header === null) throw new Error("The dialog has no header");
    return header;
  }

  it("puts the close button on the title's line and Write / Preview on the next", () => {
    const header = showWriter();

    expect(header).toHaveClass("max-phone:grid", "max-phone:grid-cols-[minmax(0,1fr)_auto]");
    expect(header).not.toHaveClass("max-phone:flex-wrap");
    const aside = within(header).getByRole("button", { name: "Preview" }).parentElement;
    expect(aside).toHaveClass("max-phone:col-span-full", "max-phone:row-start-2");
    // The title and the close button are the only two left for the first line's two columns.
    const firstLine = [...header.children].filter((child) => child !== aside);
    expect(firstLine).toHaveLength(2);
    expect(firstLine[0]).toHaveTextContent("Email Sita Gurung");
    expect(firstLine[1]).toBe(within(header).getByRole("button", { name: "Close" }));
  });

  it("has no line under it on phones, and the grab handle keeps its own row", () => {
    const header = showWriter();

    expect(header).toHaveClass("max-phone:border-b-0", "max-phone:pb-0");
    const handle = document.querySelector("[data-grab-handle]");
    expect(handle?.nextElementSibling).toBe(header);
    expect(handle).toHaveClass("flex-none");
  });
});

describe("tick boxes and switches with words (UI revamp 23)", () => {
  it("draws a switch's name and its explanation as two styles", () => {
    render(
      <Switch
        label="Two-step login"
        description="They will need their authenticator app at each login."
        isOn={false}
        onChange={vi.fn()}
      />,
    );

    const name = screen.getByText("Two-step login");
    const hint = screen.getByText("They will need their authenticator app at each login.");
    expect(name).toHaveClass("text-body", "font-medium");
    expect(name).not.toHaveClass("font-semibold");
    expect(hint).toHaveClass("text-small", "text-ink-3");
    expect(hint).not.toHaveClass("font-medium");
    expect(screen.getByRole("switch", { name: "Two-step login" })).toHaveAccessibleDescription(
      "They will need their authenticator app at each login.",
    );
  });

  it("writes a tick box's words as page text beside a box that keeps its size", () => {
    render(
      <>
        <CheckboxField label="Passport.pdf" name="file" isChecked onChange={vi.fn()} />
        <CheckboxGroup
          label="Days"
          name="days"
          options={[{ value: "sat", label: "Saturday" }]}
          values={[]}
          onChange={vi.fn()}
        />
      </>,
    );

    for (const name of ["Passport.pdf", "Saturday"]) {
      const box = screen.getByRole("checkbox", { name });
      expect(box).toHaveClass("size-5", "flex-none");
      expect(box.closest("label")).toHaveClass("text-body", "min-h-control");
    }
  });
});
