import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CheckboxField } from "./CheckboxField";
import { SegmentedControl } from "./SegmentedControl";
import { Switch } from "./Switch";
import { Tabs } from "./Tabs";

const VISITOR_OPTIONS = [
  { value: "new", label: "New visitor" },
  { value: "returning", label: "Returning visitor" },
] as const;

describe("SegmentedControl", () => {
  it("marks the chosen option as pressed and reports a new choice", async () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        label="Visitor"
        options={VISITOR_OPTIONS}
        value="new"
        onChange={handleChange}
      />,
    );

    expect(screen.getByRole("group", { name: "Visitor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New visitor" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Returning visitor" }));

    expect(handleChange).toHaveBeenCalledWith("returning");
  });

  it("shows a count after a label, named for screen readers, and nothing for 0", () => {
    render(
      <SegmentedControl
        label="Which requests"
        options={[
          { value: "waiting", label: "Waiting for me", count: 3 },
          { value: "sent", label: "Sent by me", count: 0 },
        ]}
        value="waiting"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Waiting for me, 3" })).toHaveTextContent(
      "Waiting for me, 33",
    );
    expect(screen.getByRole("button", { name: "Sent by me" })).toHaveTextContent(/^Sent by me$/);
  });
});

describe("Tabs", () => {
  const TABS = [
    { id: "apps", label: "Applications", count: 2 },
    { id: "docs", label: "Documents" },
    { id: "fees", label: "Fees" },
  ];

  function renderTabs(selected: string, handleSelect = vi.fn()) {
    render(
      <Tabs label="Student" tabs={TABS} selected={selected} onSelect={handleSelect}>
        <p>Panel for {selected}</p>
      </Tabs>,
    );
    return handleSelect;
  }

  it("shows the selected tab's panel, labelled by the tab", () => {
    renderTabs("docs");

    expect(screen.getByRole("tab", { name: "Documents" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Documents" })).toHaveTextContent("Panel for docs");
  });

  it("lets a long row of tabs scroll inside itself instead of widening the page", () => {
    renderTabs("apps");

    const tablist = screen.getByRole("tablist", { name: "Student" });
    expect(tablist).toHaveClass("overflow-x-auto");
    // A grid or flex item only shrinks below its content with min-width 0 (390px phones).
    expect(tablist.parentElement).toHaveClass("min-w-0");
  });

  it("shows a count beside a tab's label", () => {
    renderTabs("apps");

    expect(screen.getByRole("tab", { name: "Applications 2" })).toBeInTheDocument();
  });

  it("selects a tab when pressed", async () => {
    const handleSelect = renderTabs("apps");

    await userEvent.click(screen.getByRole("tab", { name: "Fees" }));

    expect(handleSelect).toHaveBeenCalledWith("fees");
  });

  it("moves between tabs with the arrow keys, wrapping round", async () => {
    const handleSelect = renderTabs("apps");
    screen.getByRole("tab", { name: "Applications 2" }).focus();

    await userEvent.keyboard("{ArrowLeft}");
    expect(handleSelect).toHaveBeenLastCalledWith("fees");

    await userEvent.keyboard("{ArrowRight}");
    expect(handleSelect).toHaveBeenLastCalledWith("docs");
  });

  it("only the selected tab is in the tab order", () => {
    renderTabs("docs");

    expect(screen.getByRole("tab", { name: "Documents" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Fees" })).toHaveAttribute("tabindex", "-1");
  });
});

describe("Switch", () => {
  function renderSwitch(isOn: boolean, handleChange = vi.fn()) {
    render(
      <Switch
        label="Accounts"
        description="Student fees, money in, expenses and university commission."
        isOn={isOn}
        onChange={handleChange}
      />,
    );
    return handleChange;
  }

  it("is a switch named by its label and described by its description", () => {
    renderSwitch(false);

    const toggle = screen.getByRole("switch", { name: "Accounts" });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription(
      "Student fees, money in, expenses and university commission.",
    );
  });

  it("shows when it is on", () => {
    renderSwitch(true);

    expect(screen.getByRole("switch", { name: "Accounts" })).toBeChecked();
  });

  it("reports the new state when the row is pressed", async () => {
    const handleChange = renderSwitch(false);

    await userEvent.click(screen.getByText("Accounts"));

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("can be switched with the keyboard", async () => {
    const handleChange = renderSwitch(true);

    await userEvent.tab();
    await userEvent.keyboard(" ");

    expect(handleChange).toHaveBeenCalledWith(false);
  });
});

describe("CheckboxField", () => {
  it("is labelled, reports a tick and has a 44 px tall touch target", async () => {
    const handleChange = vi.fn();
    render(
      <CheckboxField
        label="Still working here"
        name="now"
        isChecked={false}
        onChange={handleChange}
      />,
    );

    const box = screen.getByRole("checkbox", { name: "Still working here" });
    expect(box).not.toBeChecked();
    expect(box.closest("label")).toHaveClass("min-h-control");
    await userEvent.click(screen.getByText("Still working here"));

    expect(handleChange).toHaveBeenCalledWith(true);
  });
});
