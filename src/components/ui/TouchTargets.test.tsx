import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";

import { Button } from "./Button";
import { ButtonLink } from "./ButtonLink";
import { IconButton } from "./IconButton";
import { IconLink } from "./IconLink";
import { SegmentedControl } from "./SegmentedControl";
import { Tabs } from "./Tabs";

/** Every touch target is at least 44 px (design system: Spacing, size and shape). */
const MIN_TOUCH_REM = 2.75;

const GLOBALS_CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function controlTokens(): [string, number][] {
  const found = [...GLOBALS_CSS.matchAll(/--spacing-control(-[a-z]+)?:\s*([\d.]+)rem;/g)];
  return found.map((match) => [`control${match[1] ?? ""}`, Number(match[2])]);
}

describe("control size tokens", () => {
  it("are all found in globals.css", () => {
    expect(controlTokens().map(([name]) => name)).toEqual(["control", "control-sm", "control-lg"]);
  });

  it.each(controlTokens())("%s is at least 44 px", (_name, rem) => {
    expect(rem).toBeGreaterThanOrEqual(MIN_TOUCH_REM);
  });

  it("makes the small control 44 px", () => {
    expect(GLOBALS_CSS).toContain("--spacing-control-sm: 2.75rem;");
  });
});

describe("touch targets", () => {
  it("gives a small button the 44 px control height, with less padding and smaller text", () => {
    render(<Button size="sm">Copy emails</Button>);

    const button = screen.getByRole("button", { name: "Copy emails" });
    expect(button).toHaveClass("min-h-control-sm", "px-button-sm", "text-button-sm");
  });

  it("gives a small link button the same 44 px height", () => {
    render(
      <ButtonLink href="/students" size="sm">
        Open
      </ButtonLink>,
    );

    expect(screen.getByRole("link", { name: "Open" })).toHaveClass("min-h-control-sm");
  });

  it("makes icon buttons and icon links 44 by 44", () => {
    render(
      <>
        <IconButton icon="bell" label="Notifications" />
        <IconButton icon="logout" label="Log out" tone="sidebar" />
        <IconLink href="/settings" icon="gear" label="Settings" />
      </>,
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveClass("size-control");
    }
    expect(screen.getByRole("link", { name: "Settings" })).toHaveClass("size-control");
  });

  it("makes every segmented option at least 44 tall", () => {
    render(
      <SegmentedControl
        label="Visitor"
        options={[
          { value: "new", label: "New visitor" },
          { value: "returning", label: "Returning visitor" },
        ]}
        value="new"
        onChange={vi.fn()}
      />,
    );

    for (const option of screen.getAllByRole("button")) {
      expect(option).toHaveClass("min-h-control");
    }
  });

  it("makes every tab at least 44 tall", () => {
    render(
      <Tabs
        label="Student"
        tabs={[
          { id: "applications", label: "Applications" },
          { id: "documents", label: "Documents", count: "5/9" },
        ]}
        selected="applications"
        onSelect={vi.fn()}
      >
        <p>Content</p>
      </Tabs>,
    );

    for (const tab of screen.getAllByRole("tab")) {
      expect(tab).toHaveClass("min-h-control");
    }
  });
});
