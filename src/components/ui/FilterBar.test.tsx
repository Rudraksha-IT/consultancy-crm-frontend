import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { fakeMatchMedia } from "@/test/matchMedia";

import { FilterBar, type ListFilter } from "./FilterBar";
import { isFilterSet } from "./filters";
import { Panel } from "./Panel";
import { SearchBox } from "./SearchBox";
import { PHONE_QUERY } from "./usePhoneWidth";

const STAGES = [
  { value: "", label: "All Stages" },
  { value: "lead", label: "Lead" },
  { value: "offer", label: "Offer" },
];
const COUNTRIES = [
  { value: "", label: "Any country" },
  { value: "au", label: "Australia" },
];
const LEVELS = [
  { value: "", label: "Any level" },
  { value: "phd", label: "PhD" },
];
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

type Values = { stage: string; country: string; level: string; sort: string };
const NOTHING: Values = { stage: "", country: "", level: "", sort: "newest" };
/** Each Student of the list under the bar, by Stage. */
const STUDENTS = ["lead", "lead", "lead", "offer", "offer"];

function onPhone(): void {
  vi.stubGlobal(
    "matchMedia",
    fakeMatchMedia(
      () => false,
      (query) => query === PHONE_QUERY,
    ).matchMedia,
  );
}

/** A list with its filters, as a page uses the bar: the count follows the Stage chosen. */
function List({ start = NOTHING, hasSearch = true }: { start?: Values; hasSearch?: boolean }) {
  const [values, setValues] = useState(start);
  const set = (key: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };
  const filters: ListFilter[] = [
    { id: "stage", label: "Stage", value: values.stage, options: STAGES, onChange: set("stage") },
    {
      id: "sort",
      label: "Order",
      value: values.sort,
      options: SORTS,
      onChange: set("sort"),
      isSort: true,
    },
    {
      id: "country",
      label: "Wants to study in",
      value: values.country,
      options: COUNTRIES,
      onChange: set("country"),
      isMore: true,
    },
    {
      id: "level",
      label: "Target level",
      value: values.level,
      options: LEVELS,
      onChange: set("level"),
      isMore: true,
    },
  ];
  const shown = STUDENTS.filter((stage) => values.stage === "" || stage === values.stage);
  return (
    <>
      <FilterBar
        label="Filter Students"
        search={
          hasSearch ? <SearchBox label="Search Students" value="" onChange={vi.fn()} /> : undefined
        }
        filters={filters}
        resultText={`${String(shown.length)} Students`}
      />
      <p>The list: {shown.length}</p>
    </>
  );
}

describe("which filters are set", () => {
  const stage = { id: "stage", label: "Stage", options: STAGES, onChange: vi.fn() };

  it("is any choice but the first", () => {
    expect(isFilterSet({ ...stage, value: "" })).toBe(false);
    expect(isFilterSet({ ...stage, value: "lead" })).toBe(true);
  });

  it("never counts the order of the list", () => {
    expect(isFilterSet({ ...stage, options: SORTS, value: "oldest", isSort: true })).toBe(false);
  });
});

describe("filters on a phone", () => {
  beforeEach(onPhone);

  it("fold behind a small button beside the search", () => {
    render(<List />);

    expect(screen.getByRole("searchbox", { name: "Search Students" })).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Filters" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveClass("size-control");
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("show a Filters button with its word where the list has no search", () => {
    render(<List hasSearch={false} />);

    expect(screen.getByRole("button", { name: "Filters" })).toHaveTextContent("Filters");
  });

  it("say on the button how many are set, the order never counted", () => {
    render(<List start={{ stage: "lead", country: "au", level: "", sort: "oldest" }} />);

    const button = screen.getByRole("button", { name: "Filters, 2 set" });
    expect(button).toHaveTextContent("2");
  });

  it("open as a sheet with every filter labelled, the More filters ones too", async () => {
    render(<List />);

    await userEvent.click(screen.getByRole("button", { name: "Filters" }));

    const sheet = screen.getByRole("dialog", { name: "Filters" });
    for (const name of ["Stage", "Order", "Wants to study in", "Target level"]) {
      expect(within(sheet).getByRole("combobox", { name })).toBeInTheDocument();
      expect(within(sheet).getByText(name)).toBeVisible();
    }
    expect(within(sheet).queryByRole("button", { name: /More filters/ })).toBeNull();
  });

  it("make each filter in the sheet 48 tall with 16 text", async () => {
    render(<List />);

    await userEvent.click(screen.getByRole("button", { name: "Filters" }));

    const stage = screen.getByRole("combobox", { name: "Stage" });
    expect(stage).toHaveClass("max-phone:min-h-field-phone", "text-input", "w-full");
  });

  it("move focus into the sheet", async () => {
    render(<List />);

    await userEvent.click(screen.getByRole("button", { name: "Filters" }));

    expect(screen.getByRole("combobox", { name: "Stage" })).toHaveFocus();
  });

  it("update the list and the main button's count as a choice is made", async () => {
    render(<List />);
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("button", { name: "Show 5 Students" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Stage" }), "Lead");

    expect(screen.getByText("The list: 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show 3 Students" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Stage" })).toHaveAttribute("data-set");
  });

  it("clear every filter at once with Clear all, leaving the order", async () => {
    render(<List start={{ stage: "lead", country: "au", level: "phd", sort: "oldest" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Filters, 3 set" }));
    const sheet = screen.getByRole("dialog", { name: "Filters" });

    await userEvent.click(within(sheet).getByRole("button", { name: "Clear all" }));

    expect(within(sheet).getByRole("combobox", { name: "Stage" })).toHaveValue("");
    expect(within(sheet).getByRole("combobox", { name: "Wants to study in" })).toHaveValue("");
    expect(within(sheet).getByRole("combobox", { name: "Target level" })).toHaveValue("");
    expect(within(sheet).getByRole("combobox", { name: "Order" })).toHaveValue("oldest");
    expect(within(sheet).getByRole("button", { name: "Clear all" })).toBeDisabled();
    expect(screen.getByText("The list: 5")).toBeInTheDocument();
  });

  it("has Clear all disabled when nothing is set", async () => {
    render(<List />);

    await userEvent.click(screen.getByRole("button", { name: "Filters" }));

    expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
  });

  it("close with the main button, focus back on the filter button", async () => {
    render(<List />);
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));

    await userEvent.click(screen.getByRole("button", { name: "Show 5 Students" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Filters" })).toHaveFocus();
  });

  it("close on Escape, focus back on the filter button", async () => {
    render(<List />);
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Filters" })).toHaveFocus();
  });

  it("close on a tap outside the sheet, focus back on the filter button", async () => {
    render(<List />);
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    const scrim = screen.getByRole("dialog", { name: "Filters" }).parentElement;
    if (scrim === null) throw new Error("no scrim");

    fireEvent.mouseDown(scrim);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Filters" })).toHaveFocus();
  });

  it("keep the filters that are set in view as chips, none for the order", () => {
    render(<List start={{ stage: "lead", country: "au", level: "", sort: "oldest" }} />);

    const chips = screen.getByRole("group", { name: "Filters that are set" });
    expect(within(chips).getByRole("button", { name: /^Lead/ })).toBeInTheDocument();
    expect(within(chips).getByRole("button", { name: /^Australia/ })).toBeInTheDocument();
    expect(within(chips).queryByRole("button", { name: /Oldest first/ })).toBeNull();
  });

  it("show no chips when nothing is set", () => {
    render(<List start={{ ...NOTHING, sort: "oldest" }} />);

    expect(screen.queryByRole("group", { name: "Filters that are set" })).toBeNull();
  });

  it("remove one filter with its chip, which is 44 tall to tap", async () => {
    render(<List start={{ stage: "lead", country: "au", level: "", sort: "newest" }} />);
    const chip = screen.getByRole("button", { name: "Lead, remove the Stage filter" });
    expect(chip).toHaveClass("min-h-control");

    await userEvent.click(chip);

    expect(screen.getByText("The list: 5")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Lead/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Australia/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters, 1 set" })).toHaveFocus();
  });

  it("offer Clear all beside the chips only when more than one is set", async () => {
    render(<List start={{ stage: "lead", country: "au", level: "", sort: "newest" }} />);
    const chips = screen.getByRole("group", { name: "Filters that are set" });

    await userEvent.click(within(chips).getByRole("button", { name: "Clear all" }));

    expect(screen.queryByRole("group", { name: "Filters that are set" })).toBeNull();
    expect(screen.getByRole("button", { name: "Filters" })).toHaveFocus();
  });

  it("has no Clear all beside one chip", () => {
    render(<List start={{ ...NOTHING, stage: "lead" }} />);

    const chips = screen.getByRole("group", { name: "Filters that are set" });
    expect(within(chips).queryByRole("button", { name: "Clear all" })).toBeNull();
  });
});

describe("filters on computers and tablets", () => {
  it("keep the bar: the search and each filter in the page, the extra ones folded away", () => {
    render(<List />);

    const bar = screen.getByRole("group", { name: "Filter Students" });
    expect(within(bar).getByRole("searchbox", { name: "Search Students" })).toBeInTheDocument();
    expect(within(bar).getByRole("combobox", { name: "Stage" })).toBeInTheDocument();
    expect(within(bar).getByRole("combobox", { name: "Order" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Target level" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Filters" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Filters that are set" })).toBeNull();
  });

  it("outline a filter that is set, never the order", () => {
    render(<List start={{ ...NOTHING, stage: "lead", sort: "oldest" }} />);

    const stage = screen.getByRole("combobox", { name: "Stage" });
    expect(stage).toHaveAttribute("data-set");
    expect(stage).toHaveClass("data-set:border-accent", "data-set:ring-accent");
    expect(screen.getByRole("combobox", { name: "Order" })).not.toHaveAttribute("data-set");
  });

  it("show Clear filters only once something is set", async () => {
    render(<List />);
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Stage" }), "Lead");

    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("clear every filter with Clear filters, the ones under More filters too", async () => {
    render(<List start={{ stage: "lead", country: "au", level: "", sort: "oldest" }} />);

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByRole("combobox", { name: "Stage" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Order" })).toHaveValue("oldest");
    expect(screen.getByRole("button", { name: "More filters" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    // The button is gone, so the cursor goes to the bar's first control (design-system rule 8).
    expect(screen.getByRole("searchbox", { name: "Search Students" })).toHaveFocus();
  });
});

describe("More filters", () => {
  it("is a button that says how many of its filters are set", () => {
    render(<List start={{ ...NOTHING, stage: "lead", country: "au" }} />);

    const button = screen.getByRole("button", { name: "More filters, 1 set" });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveClass("min-h-control");
  });

  it("opens a panel with each extra filter labelled, focus on the first", async () => {
    render(<List />);

    await userEvent.click(screen.getByRole("button", { name: "More filters" }));

    const panel = screen.getByRole("dialog", { name: "More filters" });
    expect(within(panel).getByText("Wants to study in")).toBeVisible();
    expect(within(panel).getByText("Target level")).toBeVisible();
    expect(within(panel).queryByRole("combobox", { name: "Stage" })).toBeNull();
    expect(within(panel).getByRole("combobox", { name: "Wants to study in" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "More filters" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("stays open while a choice updates the list and the button's count", async () => {
    render(<List />);
    await userEvent.click(screen.getByRole("button", { name: "More filters" }));

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Wants to study in" }),
      "Australia",
    );

    expect(screen.getByRole("dialog", { name: "More filters" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More filters, 1 set" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Wants to study in" })).toHaveAttribute("data-set");
  });

  it("clears only its own filters with Clear", async () => {
    render(<List start={{ stage: "lead", country: "au", level: "phd", sort: "newest" }} />);
    await userEvent.click(screen.getByRole("button", { name: "More filters, 2 set" }));
    const panel = screen.getByRole("dialog", { name: "More filters" });

    await userEvent.click(within(panel).getByRole("button", { name: "Clear" }));

    expect(within(panel).getByRole("combobox", { name: "Wants to study in" })).toHaveValue("");
    expect(within(panel).getByRole("combobox", { name: "Target level" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Stage" })).toHaveValue("lead");
    expect(within(panel).getByRole("button", { name: "Clear" })).toBeDisabled();
    expect(screen.getByRole("dialog", { name: "More filters" })).toBeInTheDocument();
  });

  it("closes with Done, focus back on the button", async () => {
    render(<List />);
    await userEvent.click(screen.getByRole("button", { name: "More filters" }));

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "More filters" })).toHaveFocus();
  });

  it("closes on Escape, focus back on the button", async () => {
    render(<List />);
    await userEvent.click(screen.getByRole("button", { name: "More filters" }));

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "More filters" })).toHaveFocus();
  });

  it("closes on a click outside, focus back on the button", async () => {
    render(<List />);
    await userEvent.click(screen.getByRole("button", { name: "More filters" }));

    fireEvent.mouseDown(screen.getByText("The list: 5"));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "More filters" })).toHaveFocus();
  });

  it("closes when its button is pressed again", async () => {
    render(<List />);
    await userEvent.click(screen.getByRole("button", { name: "More filters" }));

    await userEvent.click(screen.getByRole("button", { name: "More filters" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens to the right of its button where the left would leave the screen", async () => {
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(-40, 0, 320, 200));
    render(<List />);

    await userEvent.click(screen.getByRole("button", { name: "More filters" }));

    expect(screen.getByRole("dialog", { name: "More filters" })).toHaveAttribute(
      "data-side",
      "right",
    );
    rect.mockRestore();
  });

  it("is not cut off by the sheet it sits in", async () => {
    render(
      <Panel>
        <List />
      </Panel>,
    );

    await userEvent.click(screen.getByRole("button", { name: "More filters" }));

    const sheet = screen.getByRole("dialog", { name: "More filters" }).closest("[data-panel]");
    expect(sheet).toHaveClass("has-data-filter-panel:overflow-visible");
  });
});

describe("filter boxes fit their choice, with room each side (list tidy-ups 10)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const start = css.indexOf("Filter boxes fit their choice");
  const rules = css.slice(start, css.indexOf("End of filter boxes", start));

  it("marks every filter's select", () => {
    render(<List />);

    expect(screen.getByRole("combobox", { name: "Stage" })).toHaveAttribute("data-filter");
  });

  it("sizes each box to the chosen text and draws the arrow inside, with even padding", () => {
    expect(rules).toMatch(/select\[data-filter\][^{]*\{[^}]*field-sizing: content/);
    expect(rules).toMatch(/select\[data-filter\][^{]*\{[^}]*appearance: none/);
    expect(rules).toMatch(/select\[data-filter\][^{]*\{[^}]*padding-inline: 0\.875rem 2\.5rem/);
    expect(rules).toMatch(/background-position: right 0\.875rem center/);
  });
});
