import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";

import { Button } from "./Button";
import { ButtonLink } from "./ButtonLink";
import { PageHeader } from "./PageHeader";
import { Panel } from "./Panel";
import { TextField } from "./TextField";

const GLOBALS_CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** The block of size tokens that applies at 640 px and below. */
function phoneSizes(): string {
  const start = GLOBALS_CSS.indexOf("@media (width < 40.0625rem)");
  return GLOBALS_CSS.slice(start, GLOBALS_CSS.indexOf("}\n}", start));
}

describe("phone page actions", () => {
  function showHeader() {
    render(
      <PageHeader
        title="Students"
        actions={
          <>
            <Button icon="send">Email this list</Button>
            <Button>Export</Button>
            <Button variant="primary" icon="plus">
              Add a visitor
            </Button>
          </>
        }
      />,
    );
    return screen.getByRole("button", { name: "Export" }).parentElement;
  }

  it("put the main action full width on top, 48 tall", () => {
    const actions = showHeader();

    expect(screen.getByRole("button", { name: "Add a visitor" })).toHaveAttribute(
      "data-variant",
      "primary",
    );
    expect(actions).toHaveClass(
      "max-phone:w-full",
      "max-phone:*:data-[variant=primary]:order-first",
      "max-phone:*:data-[variant=primary]:basis-full",
      "max-phone:*:data-[variant=primary]:min-h-action-phone",
    );
  });

  it("let the other actions share one row under it", () => {
    const actions = showHeader();

    expect(actions).toHaveClass("max-phone:*:grow", "max-phone:*:basis-0");
    expect(screen.getByRole("button", { name: "Export" })).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });

  it("mark link buttons the same way", () => {
    render(
      <ButtonLink href="/x" variant="primary">
        New Consultancy
      </ButtonLink>,
    );

    expect(screen.getByRole("link", { name: "New Consultancy" })).toHaveAttribute(
      "data-variant",
      "primary",
    );
  });
});

/** The block of size tokens that applies above 640 px (the first `:root`). */
function computerSizes(): string {
  const start = GLOBALS_CSS.indexOf(":root {");
  return GLOBALS_CSS.slice(start, GLOBALS_CSS.indexOf("\n}", start));
}

describe("phone sizes", () => {
  it("make fields 48 tall with 16 px text on every width, so phones never zoom in", () => {
    render(<TextField label="Name" name="name" />);

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveClass(
      "max-phone:min-h-field-phone",
      "text-input",
    );
    expect(GLOBALS_CSS).toContain("--text-input: 1rem;");
    expect(GLOBALS_CSS).toContain("--spacing-field-phone: 3rem;");
    expect(GLOBALS_CSS).toContain("--spacing-action-phone: 3rem;");
  });

  it("give every button a pressed state", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("max-phone:active:scale-97");
  });

  it("show sections without a box: no border around them and nothing raised", () => {
    render(<Panel>list</Panel>);

    expect(screen.getByText("list")).not.toHaveClass("rounded-panel", "shadow-raise");
    expect(GLOBALS_CSS).toMatch(/:root \{[^}]*--raise: none;/);
  });

  it("follow the phone type scale (ticket 03) and 16 margins", () => {
    const sizes = phoneSizes();

    expect(sizes).toContain("--size-body: 0.9375rem;"); // page text 15
    expect(sizes).toContain("--size-name: 1rem;"); // names 16
    expect(sizes).toContain("--size-secondary: 0.84375rem;"); // sub-lines and chips 13.5
    expect(sizes).toContain("--size-head: 0.8125rem;"); // column heads 13
    expect(sizes).toContain("--size-title: 1.5rem;"); // page title 24
    expect(sizes).toContain("--size-section-title: 1.03125rem;"); // section 16.5
    expect(sizes).toContain("--size-figure: 1.5rem;"); // figures 24
    expect(sizes).toContain("--size-button: 0.90625rem;"); // buttons 14.5
    expect(sizes).toContain("--size-button-pad: 0.875rem;"); // with 14 side padding
    expect(sizes).toContain("--size-button-sm: 0.875rem;"); // small buttons 14
    expect(sizes).toContain("--size-button-pad-sm: 0.625rem;"); // with 10
    expect(sizes).toContain("--size-page-margin: 1rem;"); // 16 side margins
    expect(sizes).toContain("--size-topbar: 3.75rem;"); // a 60 top bar
  });

  it("follow the computer type scale above 640 (ticket 03)", () => {
    const sizes = computerSizes();

    expect(sizes).toContain("--size-body: 1rem;"); // page text 16
    expect(sizes).toContain("--size-name: 1.0625rem;"); // names in lists 17
    expect(sizes).toContain("--size-secondary: 0.9375rem;"); // the line under them 15
    expect(sizes).toContain("--size-head: 0.90625rem;"); // column heads 14.5
    expect(sizes).toContain("--size-button: 0.96875rem;"); // buttons 15.5 (14.5 + 1)
    expect(sizes).toContain("--size-title: 1.75rem;"); // page title 28
    expect(sizes).toContain("--size-section-title: 1.0625rem;"); // section 17
    expect(sizes).toContain("--size-page-margin: 1.625rem;");
    expect(sizes).toContain("--size-topbar: 4.5rem;");
  });
});
