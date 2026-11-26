import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ColumnChart } from "./ColumnChart";
import { Dialog } from "./Dialog";
import { IconLink } from "./IconLink";
import { ProgressBar } from "./ProgressBar";
import { SegmentedControl } from "./SegmentedControl";

describe("more ui behaviour", () => {
  it("closes a dialog when clicking outside it, but not inside", async () => {
    const handleClose = vi.fn();
    render(
      <Dialog isOpen title="Receipt" onClose={handleClose}>
        <p>Paid</p>
      </Dialog>,
    );

    await userEvent.click(screen.getByText("Paid"));
    expect(handleClose).not.toHaveBeenCalled();

    const scrim = screen.getByRole("dialog").parentElement;
    if (scrim === null) throw new Error("no scrim");
    fireEvent.mouseDown(scrim);
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it("keeps a button's own label while loading when it has no loading label", () => {
    render(<Button isLoading>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("marks the current page on an icon link", () => {
    render(<IconLink href="/settings" icon="gear" label="Settings" isCurrent />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
  });

  it("shows a finished progress bar and a large avatar", () => {
    const { container } = render(
      <>
        <ProgressBar label="Documents" value={9} max={9} />
        <Avatar name="Ram" size="lg" />
      </>,
    );

    expect(screen.getByText("100%")).toBeInTheDocument();
    // Money and progress bars are green, done or not (ticket 03).
    expect(screen.getByRole("progressbar").firstElementChild).toHaveClass("bg-good");
    expect(container).toHaveTextContent("R");
  });

  it("offers large segmented choices", () => {
    render(
      <SegmentedControl
        label="Visitor"
        size="lg"
        options={[{ value: "new", label: "New visitor" }]}
        value="new"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "New visitor" })).toBeInTheDocument();
  });

  it("reads a missing chart value as 0", () => {
    const chart = {
      title: "Money",
      categories: [
        { key: "a", label: "May", shortLabel: "May" },
        { key: "b", label: "June", shortLabel: "Jun" },
      ],
      series: [{ name: "In", values: [5] }],
      axisFormat: (value: number) => `${String(value)}k`,
      categoryHeading: "Month of year",
    };
    const { rerender } = render(<ColumnChart {...chart} />);

    fireEvent.focus(screen.getByRole("button", { name: "June: In 0" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("June");
    rerender(<ColumnChart {...chart} showsTable />);
    expect(screen.getByRole("columnheader", { name: "Month of year" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "June 0" })).toBeInTheDocument();
  });
});
