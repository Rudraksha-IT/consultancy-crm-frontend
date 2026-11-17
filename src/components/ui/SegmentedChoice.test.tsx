import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SegmentedChoice } from "./SegmentedChoice";

const OPTIONS = [
  { value: "present", label: "Present", tone: "good" },
  { value: "absent", label: "Absent", tone: "bad" },
] as const;

describe("SegmentedChoice", () => {
  it("is a named radio group with one radio per choice, none chosen yet", () => {
    render(
      <SegmentedChoice
        label="Attendance for Sita"
        name="sita"
        options={OPTIONS}
        value={null}
        onChange={vi.fn()}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Attendance for Sita" });
    expect(within(group).getAllByRole("radio")).toHaveLength(2);
    expect(within(group).queryByRole("radio", { checked: true })).toBeNull();
  });

  it("shows the chosen value and reports a new choice", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedChoice
        label="Attendance"
        name="sita"
        options={OPTIONS}
        value="present"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("radio", { name: "Present" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Absent" }));

    expect(onChange).toHaveBeenCalledWith("absent");
  });

  it("moves between choices with the arrow keys, as radios do", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedChoice
        label="Attendance"
        name="sita"
        options={OPTIONS}
        value="present"
        onChange={onChange}
      />,
    );

    screen.getByRole("radio", { name: "Present" }).focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith("absent");
  });
});
