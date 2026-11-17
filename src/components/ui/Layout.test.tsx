import { render, screen } from "@testing-library/react";

import { PageHeader } from "./PageHeader";
import { Panel } from "./Panel";
import { RowItem } from "./RowItem";
import { Section } from "./Section";

describe("PageHeader", () => {
  it("shows the page title, the line under it and the page actions", () => {
    render(
      <PageHeader
        title="Consultancies"
        subtitle="Each client, and the extra features they have."
        actions={<button type="button">New consultancy</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Consultancies" })).toBeInTheDocument();
    expect(screen.getByText("Each client, and the extra features they have.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New consultancy" })).toBeInTheDocument();
  });

  it("lines up a labelled field and a button by their bottoms, so the button sits beside the box", () => {
    render(
      <PageHeader
        title="My working hours"
        actions={
          <>
            <label>
              Month
              <select />
            </label>
            <button type="button">Everyone&apos;s hours</button>
          </>
        }
      />,
    );

    const actions = screen.getByRole("button", { name: "Everyone's hours" }).parentElement;
    expect(actions).toHaveClass("items-end");
    expect(actions).not.toHaveClass("items-center");
  });
});

describe("Section", () => {
  it("puts its title above the content and names the region by it", () => {
    render(
      <Section title="Appearance" aside={<span>Saved</span>}>
        <Panel>Body</Panel>
      </Section>,
    );

    expect(screen.getByRole("region", { name: "Appearance" })).toHaveTextContent("Body");
    expect(screen.getByRole("heading", { level: 2, name: "Appearance" })).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});

describe("RowItem", () => {
  it("shows a title, a secondary line and right-side content", () => {
    render(
      <ul>
        <RowItem title="ABC Education" meta="abc.crm.example.com" right={<span>Active</span>} />
      </ul>,
    );

    const row = screen.getByRole("listitem");
    expect(row).toHaveTextContent("ABC Education");
    expect(row).toHaveTextContent("abc.crm.example.com");
    expect(row).toHaveTextContent("Active");
  });

  it("marks a picked row with a line in the good colour, keeping its text in line", () => {
    render(
      <ul>
        <RowItem title="Deakin University" isMarked />
        <RowItem title="RMIT University" />
      </ul>,
    );

    const [marked, plain] = screen.getAllByRole("listitem");
    expect(marked).toHaveClass("border-l-good", "border-l-4", "pl-5");
    expect(plain).toHaveClass("pl-6");
    expect(plain).not.toHaveClass("border-l-4");
  });
});
