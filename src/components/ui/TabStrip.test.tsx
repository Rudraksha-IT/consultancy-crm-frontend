import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { SegmentedChoice } from "./SegmentedChoice";
import { SegmentedControl } from "./SegmentedControl";
import { Tabs } from "./Tabs";

const OPTIONS = [
  { value: "students", label: "Student fees" },
  { value: "in", label: "Money in" },
  { value: "out", label: "Money out" },
  { value: "commission", label: "Commission" },
] as const;
type Pick = (typeof OPTIONS)[number]["value"];

/** Each choice is 120 wide, laid side by side in a strip 200 wide, as on a phone. */
const CHOICE_WIDTH = 120;
const STRIP_WIDTH = 200;

/**
 * jsdom lays nothing out: give every strip (marked data-strip) and its choices the sizes a phone
 * would, the choices side by side and moved by the strip's sideways scroll.
 */
function layOutOnMount(): void {
  const isStrip = (element: Element | null): element is HTMLElement =>
    element instanceof HTMLElement && element.hasAttribute("data-strip");
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return isStrip(this) ? STRIP_WIDTH : 0;
  });
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return isStrip(this) ? CHOICE_WIDTH * this.children.length : 0;
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (isStrip(this)) return new DOMRect(0, 0, STRIP_WIDTH, 44);
    const parent = this.parentElement;
    if (!isStrip(parent)) return new DOMRect();
    const index = [...parent.children].indexOf(this);
    return new DOMRect(index * CHOICE_WIDTH - parent.scrollLeft, 0, CHOICE_WIDTH, 44);
  });
}

function Switcher({ start, tick }: { start: Pick; tick?: number }) {
  const [value, setValue] = useState<Pick>(start);
  return (
    <>
      <SegmentedControl label="Accounts" options={OPTIONS} value={value} onChange={setValue} />
      <span>{tick}</span>
    </>
  );
}

function strip(name: string): HTMLElement {
  return screen.getByRole("group", { name });
}

/** Where the chosen one's centre sits, from the strip's centre (0 is centred). */
function offCentre(index: number, scrollLeft: number): number {
  return index * CHOICE_WIDTH + CHOICE_WIDTH / 2 - scrollLeft - STRIP_WIDTH / 2;
}

/** Whether the choice at `index` is wholly inside the strip. */
function isInView(index: number, scrollLeft: number): boolean {
  const left = index * CHOICE_WIDTH - scrollLeft;
  return left >= 0 && left + CHOICE_WIDTH <= STRIP_WIDTH;
}

describe("a tab strip keeps the chosen tab in view", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scrolls the chosen one into view when it's drawn, as far as the strip goes", () => {
    layOutOnMount();
    render(<Switcher start="commission" />);

    const accounts = strip("Accounts");
    expect(isInView(3, accounts.scrollLeft)).toBe(true);
    expect(accounts.scrollLeft).toBe(CHOICE_WIDTH * OPTIONS.length - STRIP_WIDTH);
  });

  it("centres the chosen one where it can", () => {
    layOutOnMount();
    render(<Switcher start="out" />);

    expect(offCentre(2, strip("Accounts").scrollLeft)).toBe(0);
  });

  it("leaves a strip that fits as it is", () => {
    render(<Switcher start="commission" />);

    expect(strip("Accounts").scrollLeft).toBe(0);
  });

  it("brings a newly chosen tab into view, never back to the first", async () => {
    layOutOnMount();
    render(<Switcher start="students" />);
    const accounts = strip("Accounts");
    expect(isInView(2, accounts.scrollLeft)).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "Money out" }));

    expect(offCentre(2, accounts.scrollLeft)).toBe(0);
  });

  it("doesn't move a strip the person swiped when something else on the page updates", () => {
    layOutOnMount();
    const { rerender } = render(<Switcher start="commission" tick={1} />);
    const accounts = strip("Accounts");
    accounts.scrollLeft = 7;

    rerender(<Switcher start="commission" tick={2} />);

    expect(accounts.scrollLeft).toBe(7);
  });

  it("stays on one line on phones, scrolling sideways instead of wrapping", () => {
    render(<Switcher start="students" />);

    const accounts = strip("Accounts");
    expect(accounts).toHaveClass(
      "max-phone:flex",
      "max-phone:flex-nowrap",
      "max-phone:w-full",
      "max-phone:overflow-x-auto",
    );
    expect(screen.getByRole("button", { name: "Student fees" })).toHaveClass("max-phone:shrink-0");
  });

  it("does the same for Tabs", () => {
    layOutOnMount();
    render(
      <Tabs
        label="Student"
        tabs={OPTIONS.map((option) => ({ id: option.value, label: option.label }))}
        selected="commission"
        onSelect={() => undefined}
      >
        content
      </Tabs>,
    );

    const tabs = screen.getByRole("tablist", { name: "Student" });
    expect(isInView(3, tabs.scrollLeft)).toBe(true);
  });
});

describe("Attendance on a phone", () => {
  it("is four equal buttons on one line", () => {
    render(
      <SegmentedChoice
        label="Attendance for Sita Gurung"
        name="att-1"
        options={[
          { value: "present", label: "Present", tone: "good" },
          { value: "absent", label: "Absent", tone: "bad" },
          { value: "late", label: "Late", tone: "warn" },
          { value: "leave", label: "Leave" },
        ]}
        value="present"
        onChange={() => undefined}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Attendance for Sita Gurung" });
    expect(group).toHaveClass(
      "max-phone:grid",
      "max-phone:w-full",
      "max-phone:grid-flow-col",
      "max-phone:auto-cols-fr",
    );
    expect(screen.getByText("Present")).toHaveClass("max-phone:justify-center");
  });
});
