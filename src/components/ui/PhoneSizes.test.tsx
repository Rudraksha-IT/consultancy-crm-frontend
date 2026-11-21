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

describe("phone sizes", () => {
  it("make fields 48 tall with 16 px text, so phones never zoom in", () => {
    render(<TextField label="Name" name="name" />);

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveClass(
      "max-phone:min-h-field-phone",
      "text-body",
    );
    expect(GLOBALS_CSS).toContain("--spacing-field-phone: 3rem;");
    expect(GLOBALS_CSS).toContain("--spacing-action-phone: 3rem;");
  });

  it("give every button a pressed state", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("max-phone:active:scale-97");
  });

  it("make cards flat, with 16 corners and a hairline border", () => {
    render(<Panel>list</Panel>);

    expect(screen.getByText("list")).toHaveClass("rounded-panel", "border", "shadow-raise");
    expect(phoneSizes()).toContain("--size-panel-corner: 1rem;");
    expect(phoneSizes()).toContain("--raise: none;");
  });

  it("follow the phone type scale and 16 margins", () => {
    const sizes = phoneSizes();

    expect(sizes).toContain("--size-title-sm: 1.625rem;"); // page title 26
    expect(sizes).toContain("--size-section-title: 1.1875rem;"); // section 19
    expect(sizes).toContain("--size-secondary: 0.875rem;"); // secondary 14
    expect(sizes).toContain("--size-small: 0.8125rem;"); // caption 13
    expect(sizes).toContain("--size-page-margin: 1rem;"); // 16 side margins
    expect(sizes).toContain("--size-topbar: 3.75rem;"); // a 60 top bar
  });

  it("keep the laptop and tablet sizes above 640", () => {
    expect(GLOBALS_CSS).toContain("--size-page-margin: 1.625rem;");
    expect(GLOBALS_CSS).toContain("--size-topbar: 4.5rem;");
    expect(GLOBALS_CSS).toContain("--size-title-sm: 1.5rem;");
    expect(GLOBALS_CSS).toContain("--size-panel-corner: 0.875rem;");
  });
});
