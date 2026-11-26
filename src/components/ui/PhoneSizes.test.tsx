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

  it("put the main action beside the title: compact, rounded, 44 tall with small text", () => {
    const actions = showHeader();

    expect(screen.getByRole("button", { name: "Add a visitor" })).toHaveAttribute(
      "data-variant",
      "primary",
    );
    // The title's own line: the title takes the room, the main action follows it.
    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveClass("max-phone:order-2", "max-phone:flex-1");
    // It never shrinks under its longest word, or the button would sit on top of it.
    expect(title).not.toHaveClass("max-phone:min-w-0");
    expect(actions).toHaveClass(
      "max-phone:contents",
      "max-phone:*:data-[variant=primary]:order-3",
      "max-phone:*:data-[variant=primary]:flex-none",
      "max-phone:*:data-[variant=primary]:rounded-pill",
      "max-phone:*:data-[variant=primary]:px-3.5",
      "max-phone:*:text-button-sm",
    );
    // No full-width bar, and 44 tall as every button is.
    expect(actions).not.toHaveClass("max-phone:*:data-[variant=primary]:basis-full");
    expect(screen.getByRole("button", { name: "Add a visitor" })).toHaveClass("min-h-control");
  });

  it("put the other actions on the next line as small text buttons, from the left", () => {
    const actions = showHeader();

    expect(actions).toHaveClass("max-phone:*:order-5", "max-phone:*:px-button-sm");
    // A full-width break between the title's line and theirs, so they never join the title.
    expect(actions).toHaveClass(
      "max-phone:before:order-4",
      "max-phone:before:basis-full",
      "max-phone:before:content-['']",
    );
    expect(actions).not.toHaveClass("max-phone:*:grow");
    expect(actions?.parentElement).toHaveClass("max-phone:justify-start");
    expect(screen.getByRole("button", { name: "Export" })).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });

  it("keep the line under the title between the title and the other actions", () => {
    render(<PageHeader title="Visas" subtitle="Every visa." actions={<Button>Export</Button>} />);

    expect(screen.getByText("Every visa.")).toHaveClass(
      "max-phone:order-4",
      "max-phone:basis-full",
    );
  });

  it("put a lone Export beside the title, small and outlined, when there is no main action", () => {
    render(<PageHeader title="Visas" isActionBesideTitle actions={<Button>Export</Button>} />);

    const actions = screen.getByRole("button", { name: "Export" }).parentElement;
    expect(actions).toHaveClass(
      "max-phone:*:data-variant:order-3",
      "max-phone:*:data-variant:flex-none",
      "max-phone:*:data-variant:rounded-pill",
      "max-phone:*:data-variant:border-rule",
    );
    expect(screen.getByRole("button", { name: "Export" })).toHaveClass("min-h-control");
  });

  it("leave an action alone on the next line unless the page asks for it beside the title", () => {
    render(<PageHeader title="Emails" actions={<Button>Email a Student</Button>} />);

    const actions = screen.getByRole("button", { name: "Email a Student" }).parentElement;
    expect(actions).not.toHaveClass("max-phone:*:data-variant:order-3");
  });

  it("give something that is not a button (the clock card) the whole width", () => {
    const actions = showHeader();

    expect(actions).toHaveClass("max-phone:*:not-data-variant:basis-full");
  });

  it("keep the page top of computers and tablets", () => {
    const actions = showHeader();

    expect(actions).toHaveClass("flex", "flex-wrap", "items-end", "gap-3");
    expect(actions?.parentElement).toHaveClass("justify-between", "items-end");
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

  it("show a section as a sheet on phones too, with 14 corners and 14 inside its sides", () => {
    render(<Panel>list</Panel>);

    expect(screen.getByText("list")).toHaveClass("rounded-panel", "border", "bg-paper");
    expect(phoneSizes()).toContain("--size-gutter: 0.875rem;");
    expect(phoneSizes()).not.toContain("--size-panel-corner");
  });

  it("follow the phone type scale (ticket 21) and 16 margins", () => {
    const sizes = phoneSizes();

    expect(sizes).toContain("--size-body: 0.9375rem;"); // page text 15
    expect(sizes).toContain("--size-name: 1rem;"); // names 16
    expect(sizes).toContain("--size-secondary: 0.875rem;"); // sub-lines and chips 14
    expect(sizes).toContain("--size-head: 0.8125rem;"); // column heads 13
    expect(sizes).toContain("--size-title: 1.5rem;"); // page title 24
    expect(sizes).toContain("--size-figure: 1.5rem;"); // figures 24
    expect(sizes).toContain("--size-button-pad: 0.875rem;"); // buttons with 14 side padding
    expect(sizes).toContain("--size-button-sm: 0.875rem;"); // small buttons 14
    expect(sizes).toContain("--size-button-pad-sm: 0.625rem;"); // with 10
    expect(sizes).toContain("--size-email-name: 1.125rem;"); // Email names 18
    expect(sizes).toContain("--size-page-margin: 1rem;"); // 16 side margins
    expect(sizes).toContain("--size-topbar: 3.75rem;"); // a 60 top bar
    // section titles (18) and buttons (15) are the same on every width
    expect(sizes).not.toContain("--size-section-title:");
    expect(sizes).not.toContain("--size-button:");
  });

  it("follow the computer type scale above 640 (ticket 21)", () => {
    const sizes = computerSizes();

    expect(sizes).toContain("--size-body: 1rem;"); // page text 16
    expect(sizes).toContain("--size-name: 1.125rem;"); // names in lists 18
    expect(sizes).toContain("--size-secondary: 0.9375rem;"); // the line under them 15
    expect(sizes).toContain("--size-head: 0.875rem;"); // column heads 14
    expect(sizes).toContain("--size-button: 0.9375rem;"); // buttons 15
    expect(sizes).toContain("--size-title: 1.75rem;"); // page title 28
    expect(sizes).toContain("--size-section-title: 1.125rem;"); // section 18
    expect(sizes).toContain("--size-figure: 2rem;"); // figures 32
    expect(sizes).toContain("--size-page-margin: 1.625rem;");
    expect(sizes).toContain("--size-topbar: 4.5rem;");
  });
});
