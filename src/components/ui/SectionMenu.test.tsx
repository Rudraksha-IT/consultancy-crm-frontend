import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";

import { fakeMatchMedia } from "@/test/matchMedia";

import { SectionMenu, useSectionChoice, type MenuSection } from "./SectionMenu";
import { PHONE_QUERY } from "./usePhoneWidth";

const SECTIONS: readonly MenuSection[] = [
  { id: "general", title: "General", description: "How the office looks.", content: <p>Logo</p> },
  {
    id: "documents",
    title: "Documents",
    description: "What Students bring.",
    content: <p>Docs</p>,
  },
  { id: "exports", title: "Exports", hasOwnTitle: true, content: <p>Export records</p> },
];

type MenuProps = {
  sections?: readonly MenuSection[];
  keepsAllMounted?: boolean;
  footer?: ReactNode;
};

function Menu({ sections = SECTIONS, keepsAllMounted = false, footer }: MenuProps) {
  const choice = useSectionChoice(sections[0]?.id ?? "");
  return (
    <SectionMenu
      label="Configuration"
      backLabel="All of Configuration"
      sections={sections}
      choice={choice}
      keepsAllMounted={keepsAllMounted}
      footer={footer}
    />
  );
}

function atPhoneWidth(isPhone: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    fakeMatchMedia(
      () => false,
      (query) => isPhone && query === PHONE_QUERY,
    ).matchMedia,
  );
}

function menu() {
  return screen.getByRole("navigation", { name: "Configuration" });
}

function menuItem(name: string) {
  return within(menu()).getByRole("button", { name });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SectionMenu above phone width", () => {
  beforeEach(() => {
    atPhoneWidth(false);
  });

  it("shows the menu and only the first section, with its title and description", () => {
    render(<Menu />);

    expect(
      within(menu())
        .getAllByRole("button")
        .map((item) => item.textContent),
    ).toEqual(["General", "Documents", "Exports"]);
    expect(menuItem("General")).toHaveAttribute("aria-current", "true");
    const general = screen.getByRole("region", { name: "General" });
    expect(within(general).getByText("How the office looks.")).toBeVisible();
    expect(screen.getByText("Logo")).toBeVisible();
    expect(screen.queryByText("Docs")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /All of Configuration/ })).not.toBeInTheDocument();
  });

  it("shows only the chosen section", async () => {
    const user = userEvent.setup();
    render(<Menu />);

    await user.click(menuItem("Documents"));

    expect(menuItem("Documents")).toHaveAttribute("aria-current", "true");
    expect(menuItem("General")).toHaveAttribute("aria-current", "false");
    expect(screen.getByText("Docs")).toBeVisible();
    expect(screen.queryByText("Logo")).not.toBeInTheDocument();
    expect(menu()).toBeInTheDocument();
  });

  it("leaves the title to a section that shows its own", async () => {
    const user = userEvent.setup();
    render(<Menu />);

    await user.click(menuItem("Exports"));

    expect(screen.queryByRole("heading", { name: "Exports" })).not.toBeInTheDocument();
    expect(screen.getByText("Export records")).toBeVisible();
  });

  it("keeps every section in the page, only hidden, when asked", async () => {
    const user = userEvent.setup();
    render(<Menu keepsAllMounted />);

    expect(screen.getByText("Docs")).not.toBeVisible();
    await user.click(menuItem("Documents"));

    expect(screen.getByText("Docs")).toBeVisible();
    expect(screen.getByText("Logo")).not.toBeVisible();
  });

  it("shows the first section when the chosen one goes away", async () => {
    const user = userEvent.setup();
    function Shrinking() {
      const [isAll, setIsAll] = useState(true);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setIsAll(false);
            }}
          >
            Drop exports
          </button>
          <Menu sections={isAll ? SECTIONS : SECTIONS.slice(0, 2)} />
        </>
      );
    }
    render(<Shrinking />);

    await user.click(menuItem("Exports"));
    await user.click(screen.getByRole("button", { name: "Drop exports" }));

    expect(screen.getByText("Logo")).toBeVisible();
    expect(menuItem("General")).toHaveAttribute("aria-current", "true");
  });

  it("keeps the chosen section in view in the tablet strip", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    const strip = menu();
    Object.defineProperty(strip, "scrollWidth", { configurable: true, value: 600 });
    Object.defineProperty(strip, "clientWidth", { configurable: true, value: 300 });
    strip.getBoundingClientRect = () => new DOMRect(0, 0, 300, 44);
    menuItem("Exports").getBoundingClientRect = () => new DOMRect(500, 0, 100, 44);

    await user.click(menuItem("Exports"));

    expect(strip.scrollLeft).toBe(300);
  });

  it("shows the footer under the section", () => {
    render(<Menu footer={<button type="button">Save all changes</button>} />);

    expect(screen.getByRole("button", { name: "Save all changes" })).toBeVisible();
  });
});

describe("SectionMenu at phone width", () => {
  beforeEach(() => {
    atPhoneWidth(true);
  });

  it("starts at the list of sections, with no section shown", () => {
    render(<Menu />);

    expect(within(menu()).getAllByRole("button")).toHaveLength(3);
    expect(screen.queryByText("Logo")).not.toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("opens one section alone with a way back, then goes back to the list", async () => {
    const user = userEvent.setup();
    render(<Menu />);

    await user.click(menuItem("Documents"));

    expect(screen.queryByRole("navigation", { name: "Configuration" })).not.toBeInTheDocument();
    expect(screen.getByText("Docs")).toBeVisible();
    const back = screen.getByRole("button", { name: "All of Configuration" });
    expect(back).toHaveFocus();

    await user.click(back);

    expect(menu()).toBeInTheDocument();
    expect(screen.queryByText("Docs")).not.toBeInTheDocument();
    expect(menuItem("Documents")).toHaveFocus();
  });

  it("starts at the list again each time the page is opened", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Menu />);
    await user.click(menuItem("Documents"));
    unmount();

    render(<Menu />);

    expect(menu()).toBeInTheDocument();
    expect(screen.queryByText("Docs")).not.toBeInTheDocument();
  });

  it("keeps the footer under the list too", () => {
    render(<Menu footer={<button type="button">Save all changes</button>} />);

    expect(screen.getByRole("button", { name: "Save all changes" })).toBeVisible();
  });

  it("hides every kept section while the list is shown", () => {
    render(<Menu keepsAllMounted />);

    expect(screen.getByText("Logo")).not.toBeVisible();
    expect(screen.getByText("Docs")).not.toBeVisible();
  });
});
