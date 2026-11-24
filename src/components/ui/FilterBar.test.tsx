import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FilterBar, MoreFiltersButton } from "./FilterBar";
import { FilterSelect } from "./FilterSelect";
import { SearchBox } from "./SearchBox";

const STAGES = [
  { value: "", label: "All Stages" },
  { value: "lead", label: "Lead" },
];

function Bar({ count = 0, isMoreOpen = false }: { count?: number; isMoreOpen?: boolean }) {
  return (
    <FilterBar
      label="Student filters"
      search={<SearchBox label="Search Students" value="" onChange={vi.fn()} />}
      more={
        isMoreOpen ? (
          <FilterSelect
            label="How they found us"
            isLabelShown
            value=""
            options={[{ value: "", label: "Any way" }]}
            onChange={vi.fn()}
          />
        ) : undefined
      }
    >
      <FilterSelect label="Stage" value="" options={STAGES} onChange={vi.fn()} />
      <FilterSelect label="Counsellor" value="" options={STAGES} onChange={vi.fn()} />
      <span>{count}</span>
    </FilterBar>
  );
}

function rows(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-filter-row]")];
}

describe("filters on a phone", () => {
  it("put the search on its own line and every other filter in one row that never wraps", () => {
    render(<Bar />);

    const [row] = rows();
    expect(row).toContainElement(screen.getByRole("combobox", { name: "Stage" }));
    expect(row).not.toContainElement(screen.getByRole("searchbox", { name: "Search Students" }));
    expect(row).toHaveClass("max-phone:flex", "max-phone:flex-nowrap", "max-phone:overflow-x-auto");
    expect(row).not.toHaveClass("max-phone:flex-wrap");
  });

  it("leave the laptop and tablet layout alone: the row is invisible to it above 640", () => {
    render(<Bar />);

    expect(rows()[0]).toHaveClass("contents");
  });

  it("show each choice as a small pill that is still a 44 tall target", () => {
    render(<Bar />);

    const pill = screen.getByRole("combobox", { name: "Stage" }).parentElement;
    expect(pill).toHaveAttribute("data-pill");
    expect(pill).toHaveClass("max-phone:min-h-control", "max-phone:before:rounded-pill");
    expect(pill).toHaveClass("max-phone:before:inset-y-1");
  });

  it("show More filters as pills too, the name in grey, then the choice", () => {
    render(<Bar isMoreOpen />);

    const more = rows()[1];
    const select = screen.getByRole("combobox", { name: "How they found us" });
    expect(more).toContainElement(select);
    expect(more).toHaveClass("max-phone:flex-nowrap", "max-phone:overflow-x-auto");
    const pill = select.closest("[data-pill]");
    expect(pill).toHaveTextContent("How they found us");
    expect(pill).toHaveClass("max-phone:text-ink-3");
    expect(select).toHaveClass("max-phone:text-ink", "max-phone:font-semibold");
  });

  it("keep their sideways position when the list under them redraws", () => {
    const { rerender } = render(<Bar count={1} />);
    const [row] = rows();
    if (row === undefined) throw new Error("no filter row");

    row.scrollLeft = 120;
    fireEvent.scroll(row);
    rerender(<Bar count={2} />);

    expect(rows()[0]?.scrollLeft).toBe(120);
  });

  it("keep their sideways position when the bar is drawn again", () => {
    const { unmount } = render(<Bar />);
    const [row] = rows();
    if (row === undefined) throw new Error("no filter row");
    row.scrollLeft = 80;
    fireEvent.scroll(row);
    unmount();

    render(<Bar />);

    expect(rows()[0]?.scrollLeft).toBe(80);
  });
});

describe("More filters", () => {
  it("is a button that opens the other filters, a pill on phones", async () => {
    const onOpen = vi.fn();
    render(<MoreFiltersButton onClick={onOpen}>More filters</MoreFiltersButton>);

    const button = screen.getByRole("button", { name: "More filters" });
    expect(button).toHaveClass("min-h-control", "max-phone:before:border-dashed");
    await userEvent.click(button);
    expect(onOpen).toHaveBeenCalledOnce();
  });
});

describe("More filters close when the person moves on (list tidy-ups 18)", () => {
  function Opened({ onClose }: { onClose: () => void }) {
    return (
      <>
        <FilterBar
          label="Student filters"
          onMoreClose={onClose}
          more={
            <FilterSelect
              label="Country"
              isLabelShown
              value=""
              options={[{ value: "", label: "Any country" }]}
              onChange={vi.fn()}
            />
          }
        >
          <FilterSelect label="Stage" value="" options={STAGES} onChange={vi.fn()} />
        </FilterBar>
        <p>The list below</p>
      </>
    );
  }

  it("closes on a press anywhere outside the filters", () => {
    const onClose = vi.fn();
    render(<Opened onClose={onClose} />);

    fireEvent.pointerDown(screen.getByText("The list below"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("stays open while the person uses the filters", () => {
    const onClose = vi.fn();
    render(<Opened onClose={onClose} />);

    fireEvent.pointerDown(screen.getByRole("combobox", { name: "Country" }));
    fireEvent.pointerDown(screen.getByRole("combobox", { name: "Stage" }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Esc inside the filters", () => {
    const onClose = vi.fn();
    render(<Opened onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Country" }), { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("listens only while More filters are open", () => {
    const onClose = vi.fn();
    render(
      <FilterBar label="Student filters" onMoreClose={onClose}>
        <span>Stage</span>
      </FilterBar>,
    );

    fireEvent.pointerDown(document.body);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("says on the button how many of them are set", () => {
    render(
      <MoreFiltersButton onClick={vi.fn()} setCount={2}>
        More filters
      </MoreFiltersButton>,
    );

    expect(screen.getByRole("button", { name: "More filters · 2" })).toBeInTheDocument();
  });
});

describe("filter boxes fit their choice, with room each side (list tidy-ups 10)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const start = css.indexOf("Filter boxes fit their choice");
  const rules = css.slice(start, css.indexOf("End of filter boxes", start));

  it("marks every filter's select", () => {
    render(<Bar />);

    expect(screen.getByRole("combobox", { name: "Stage" })).toHaveAttribute("data-filter");
  });

  it("sizes each box to the chosen text and draws the arrow inside, with even padding", () => {
    expect(rules).toMatch(/select\[data-filter\][^{]*\{[^}]*field-sizing: content/);
    expect(rules).toMatch(/select\[data-filter\][^{]*\{[^}]*appearance: none/);
    expect(rules).toMatch(/select\[data-filter\][^{]*\{[^}]*padding-inline: 0\.875rem 2\.5rem/);
    expect(rules).toMatch(/background-position: right 0\.875rem center/);
  });
});
