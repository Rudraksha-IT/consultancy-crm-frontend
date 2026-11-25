import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";

import { Button } from "./Button";
import { Chip } from "./Chip";
import { FigureTile } from "./FigureTile";
import { Panel } from "./Panel";
import { SegmentedControl } from "./SegmentedControl";
import { Tabs } from "./Tabs";
import { TileGrid } from "./TileGrid";

/** The Ivory look (UI revamp, ticket 03): no box around everything, lines and words instead. */
const GLOBALS_CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("Ivory sections", () => {
  it("draw a section's content with a strong line on top and no box", () => {
    render(<Panel>rows</Panel>);

    const panel = screen.getByText("rows");
    expect(panel).toHaveAttribute("data-panel");
    expect(panel).toHaveClass("border-t-2", "border-rule-strong");
    expect(panel).not.toHaveClass("bg-paper", "border", "rounded-panel", "shadow-raise");
  });

  it("drop the strong line under mini tabs, a toolbar holding them, and figure boxes", () => {
    const rule = /([^{}]+)\{\s*border-top-width: 0;\s*\}/.exec(GLOBALS_CSS)?.[1] ?? "";

    expect(rule).toContain('[role="tablist"]');
    expect(rule).toContain("[data-strip]");
    expect(rule).toContain("[data-tiles]");
    expect(rule).toContain(':has(> [role="tablist"], > [data-strip]) + [data-panel]');
    expect(rule).toContain("[data-panel][data-no-line]");
  });
});

describe("Ivory buttons", () => {
  it("fill only the main button; the others are words with no box", () => {
    render(
      <>
        <Button variant="primary">Save</Button>
        <Button>Export</Button>
        <Button variant="danger">Remove</Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("bg-accent");
    for (const name of ["Export", "Remove"]) {
      expect(screen.getByRole("button", { name })).toHaveClass(
        "border-transparent",
        "bg-transparent",
      );
    }
    expect(screen.getByRole("button", { name: "Remove" })).toHaveClass("text-bad");
  });

  it("keep every button 44 tall to tap", () => {
    render(<Button size="sm">Copy</Button>);

    expect(screen.getByRole("button", { name: "Copy" })).toHaveClass("min-h-control-sm");
    expect(GLOBALS_CSS).toContain("--spacing-control-sm: 2.75rem;");
  });
});

describe("Ivory statuses", () => {
  it("show a status as a dot and a word, with no filled badge", () => {
    render(<Chip tone="bad">Rejected</Chip>);

    const chip = screen.getByText("Rejected").parentElement;
    expect(chip).toHaveClass("text-bad");
    expect(chip?.className).not.toMatch(/(^|\s)bg-/);
  });
});

describe("Ivory tabs and switches", () => {
  it("draw tabs as words with an underline", () => {
    render(
      <Tabs
        label="Student"
        tabs={[
          { id: "a", label: "Applications" },
          { id: "b", label: "Visas" },
        ]}
        selected="a"
        onSelect={vi.fn()}
      >
        <p>Content</p>
      </Tabs>,
    );

    const tab = screen.getByRole("tab", { name: "Applications" });
    expect(tab).toHaveClass("border-b-2", "aria-selected:border-accent", "aria-selected:text-ink");
    expect(tab.className).not.toMatch(/(^|\s)bg-/);
  });

  it("draw a switch as words with an underline, not a sliding box", () => {
    render(
      <SegmentedControl
        label="Tasks"
        options={[
          { value: "todo", label: "To do" },
          { value: "done", label: "Done" },
        ]}
        value="todo"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("group", { name: "Tasks" })).not.toHaveClass("bg-fill-2");
    expect(screen.getByRole("button", { name: "To do" })).toHaveClass("aria-pressed:border-accent");
  });
});

describe("Ivory figures", () => {
  it("stand in a row with thin lines between them, not in cards", () => {
    render(
      <TileGrid label="Money">
        <FigureTile label="Collected" value="NPR 10" />
        <FigureTile label="Still to pay" value="NPR 5" />
      </TileGrid>,
    );

    const grid = screen.getByRole("group", { name: "Money" });
    expect(grid).toHaveAttribute("data-tiles");
    expect(grid).toHaveClass("border-y", "*:border-l", "max-phone:*:border-l-0");
    expect(screen.getByText("Collected").parentElement).not.toHaveClass("bg-paper", "border");
  });
});

describe("Ivory tables", () => {
  it("give column heads no fill, quiet small text, and keep the row gutter", () => {
    const tables = GLOBALS_CSS.slice(GLOBALS_CSS.indexOf("Ivory tables (ticket 03)"));

    expect(tables).toMatch(/thead th \{[^}]*background: transparent;[^}]*color: var\(--ink-3\);/);
    expect(tables).toMatch(/:first-child \{\s*padding-left: var\(--size-gutter\);/);
  });
});
