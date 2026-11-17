import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Pager } from "./Pager";
import { SearchBox } from "./SearchBox";

describe("Pager", () => {
  it("shows an optional note beside the summary", () => {
    render(
      <Pager
        summary="3 applications"
        note="Applied is recorded automatically."
        count={3}
        page={1}
        pageSize={25}
        onPage={vi.fn()}
      />,
    );

    expect(screen.getByText("3 applications")).toBeInTheDocument();
    expect(screen.getByText("Applied is recorded automatically.")).toBeInTheDocument();
  });

  it("says how many match and hides the buttons when one page holds them all", () => {
    render(<Pager summary="3 universities" count={3} page={1} pageSize={25} onPage={vi.fn()} />);

    expect(screen.getByText("3 universities")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
  });

  it("moves between pages and can't go past either end", async () => {
    const onPage = vi.fn();
    render(<Pager summary="60 rows" count={60} page={1} pageSize={25} onPage={onPage} />);

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(onPage).toHaveBeenCalledWith(2);
  });

  it("goes back from the last page", async () => {
    const onPage = vi.fn();
    render(<Pager summary="60 rows" count={60} page={3} pageSize={25} onPage={onPage} />);

    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));

    expect(onPage).toHaveBeenCalledWith(2);
  });
});

describe("SearchBox", () => {
  it("is named for screen readers and passes on what is typed", async () => {
    const onChange = vi.fn();
    render(<SearchBox label="Search universities" value="" onChange={onChange} />);

    await userEvent.type(screen.getByRole("searchbox", { name: "Search universities" }), "d");

    expect(onChange).toHaveBeenCalledWith("d");
  });

  it("keeps room for its hint in a busy filter row, letting the filters wrap instead (issue 91)", () => {
    render(
      <SearchBox
        label="Search"
        placeholder="Search by Student or university"
        value=""
        onChange={vi.fn()}
      />,
    );

    // A flex child with no basis shrinks to its icon when the row is full; 240 keeps the hint readable.
    const box = screen.getByRole("searchbox").parentElement;
    expect(box).toHaveClass("phone:basis-60", "phone:flex-1");
  });

  it("limits a search to what the API accepts", () => {
    render(<SearchBox label="Search" value="" onChange={vi.fn()} />);

    expect(screen.getByRole("searchbox")).toHaveAttribute("maxLength", "100");
  });
});
