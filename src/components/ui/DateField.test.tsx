import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { DateField } from "./DateField";

/** The AD date the form would send, read the way the dialogs read their fields. */
function sentValue(name: string): string {
  const form = document.querySelector("form");
  if (form === null) throw new Error("no form");
  const value = new FormData(form).get(name);
  return typeof value === "string" ? value : "";
}

function Controlled({
  display,
  start,
  onChange,
}: {
  display: "AD" | "BS";
  start: string;
  onChange: (iso: string) => void;
}) {
  const [value, setValue] = useState(start);
  return (
    <form>
      <DateField
        label="Date"
        name="paidOn"
        display={display}
        value={value}
        onChange={(iso) => {
          setValue(iso);
          onChange(iso);
        }}
        showsOtherCalendar
      />
      <button
        type="button"
        onClick={() => {
          setValue("2026-04-14");
        }}
      >
        Reset
      </button>
    </form>
  );
}

describe("DateField in AD", () => {
  it("is a labelled date input that sends the AD date", () => {
    render(
      <form>
        <DateField label="Joining date" name="joinedOn" display="AD" defaultValue="2026-11-02" />
      </form>,
    );

    const input = screen.getByLabelText("Joining date");
    expect(input).toHaveAttribute("type", "date");
    expect(input).toBeRequired();
    expect(sentValue("joinedOn")).toBe("2026-11-02");
  });

  it("shows the BS date under it when asked, following what is typed", async () => {
    const onChange = vi.fn<(iso: string) => void>();
    render(<Controlled display="AD" start="2026-11-02" onChange={onChange} />);
    const input = screen.getByLabelText("Date");
    expect(input).toHaveAccessibleDescription("16 Kartik 2083 BS");

    await userEvent.clear(input);
    await userEvent.type(input, "2026-04-14");

    expect(onChange).toHaveBeenLastCalledWith("2026-04-14");
    expect(input).toHaveAccessibleDescription("1 Baisakh 2083 BS");
  });

  it("passes min and max to the input and can be optional", () => {
    render(<DateField label="Date of birth" name="dob" display="AD" max="2026-11-02" isOptional />);

    const input = screen.getByLabelText("Date of birth (optional)");
    expect(input).toHaveAttribute("max", "2026-11-02");
    expect(input).not.toBeRequired();
  });

  it("shows errors instead of the hint", () => {
    render(
      <DateField
        label="Date"
        name="paidOn"
        display="AD"
        defaultValue="2026-11-02"
        showsOtherCalendar
        errors={["Enter a date from 1 Jan 2000 to today."]}
      />,
    );

    const input = screen.getByLabelText("Date");
    expect(input).toHaveAccessibleDescription("Enter a date from 1 Jan 2000 to today.");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});

describe("DateField in BS", () => {
  it("takes the day, BS month and year, and sends the AD date", () => {
    render(
      <form>
        <DateField label="Joining date" name="joinedOn" display="BS" defaultValue="2026-11-02" />
      </form>,
    );

    const group = screen.getByRole("group", { name: "Joining date" });
    expect(within(group).getByRole("combobox", { name: "Day" })).toHaveValue("16");
    expect(within(group).getByRole("combobox", { name: "Month" })).toHaveValue("7");
    expect(within(group).getByRole("textbox", { name: "Year" })).toHaveValue("2083");
    expect(screen.queryByLabelText("Joining date", { selector: "input[type=date]" })).toBeNull();
    expect(sentValue("joinedOn")).toBe("2026-11-02");
  });

  it("shows Day and Month in the boxes until chosen, but never as a choice in the list", () => {
    render(<DateField label="Date" name="paidOn" display="BS" />);

    const day = screen.getByRole("combobox", { name: "Day" });
    const month = screen.getByRole("combobox", { name: "Month" });
    expect(day).toHaveDisplayValue("Day");
    expect(month).toHaveDisplayValue("Month");
    expect(
      within(day)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).not.toContain("Day");
    expect(within(day).getAllByRole("option")[0]).toHaveTextContent("1");
    const placeholder = day.querySelector('option[value=""]');
    expect(placeholder).toHaveAttribute("disabled");
    expect(placeholder).toHaveAttribute("hidden");
  });

  it("offers Clear date only on an optional date that has something chosen", async () => {
    const { unmount } = render(
      <DateField label="Paid on" name="paidOn" display="BS" defaultValue="2026-11-02" />,
    );
    expect(screen.queryByRole("button", { name: "Clear date" })).toBeNull();
    unmount();

    render(<DateField label="Date of birth" name="dob" display="BS" isOptional />);
    expect(screen.queryByRole("button", { name: "Clear date" })).toBeNull();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Month" }), "3");
    expect(screen.getByRole("button", { name: "Clear date" })).toBeVisible();
  });

  it("names the months as offices write them", () => {
    render(<DateField label="Date" name="paidOn" display="BS" />);

    const month = screen.getByRole("combobox", { name: "Month" });
    const names = within(month)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(names).toEqual([
      "Baisakh",
      "Jestha",
      "Asar",
      "Shrawan",
      "Bhadra",
      "Ashwin",
      "Kartik",
      "Mangsir",
      "Poush",
      "Magh",
      "Falgun",
      "Chaitra",
    ]);
  });

  it("turns what is chosen into AD and shows the AD date under it", async () => {
    const onChange = vi.fn<(iso: string) => void>();
    render(<Controlled display="BS" start="2026-11-02" onChange={onChange} />);
    const group = screen.getByRole("group", { name: "Date" });

    await userEvent.selectOptions(within(group).getByRole("combobox", { name: "Month" }), "1");
    await userEvent.selectOptions(within(group).getByRole("combobox", { name: "Day" }), "1");

    expect(onChange).toHaveBeenLastCalledWith("2026-04-14");
    expect(sentValue("paidOn")).toBe("2026-04-14");
    expect(within(group).getByRole("combobox", { name: "Day" })).toHaveAccessibleDescription(
      "14 Apr 2026 AD",
    );
  });

  it("offers only the days the chosen month has", async () => {
    render(<DateField label="Date" name="paidOn" display="BS" defaultValue="2026-12-01" />);
    const day = screen.getByRole("combobox", { name: "Day" });
    // Mangsir 2083 has 29 days ("Day" itself is not a choice).
    expect(within(day).getAllByRole("option")).toHaveLength(29);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Month" }), "3");

    // Asar 2083 has 32.
    expect(within(day).getAllByRole("option")).toHaveLength(32);
  });

  it("keeps the day inside a shorter month", async () => {
    render(
      <form>
        <DateField label="Date" name="paidOn" display="BS" defaultValue="2026-07-16" />
      </form>,
    );
    // 32 Asar 2083.
    expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("32");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Month" }), "8");

    expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("29");
    expect(sentValue("paidOn")).toBe("2026-12-15");
  });

  it("sends nothing and says so while the year isn't a BS year it knows", async () => {
    render(
      <form>
        <DateField label="Date" name="paidOn" display="BS" defaultValue="2026-11-02" />
      </form>,
    );
    const year = screen.getByRole("textbox", { name: "Year" });

    await userEvent.clear(year);
    await userEvent.type(year, "1990");

    expect(sentValue("paidOn")).toBe("");
    expect(year).toHaveAccessibleDescription("Enter a BS year from 2000 to 2086.");
    expect(year).toHaveAttribute("aria-invalid", "true");
  });

  it("takes only digits for the year", async () => {
    render(<DateField label="Date" name="paidOn" display="BS" />);
    const year = screen.getByRole("textbox", { name: "Year" });

    await userEvent.type(year, "20<b>83");

    expect(year).toHaveValue("2083");
  });

  it("is required unless optional, and an optional date can be cleared", async () => {
    const onChange = vi.fn<(iso: string) => void>();
    render(
      <form>
        <DateField
          label="Date of birth"
          name="dob"
          display="BS"
          isOptional
          value="2005-06-14"
          onChange={onChange}
        />
      </form>,
    );
    const group = screen.getByRole("group", { name: "Date of birth (optional)" });
    const day = within(group).getByRole("combobox", { name: "Day" });
    expect(day).not.toBeRequired();

    await userEvent.click(within(group).getByRole("button", { name: "Clear date" }));

    expect(within(group).getByRole("combobox", { name: "Month" })).toHaveDisplayValue("Month");
    expect(within(group).getByRole("textbox", { name: "Year" })).toHaveValue("");
    expect(within(group).queryByRole("button", { name: "Clear date" })).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(sentValue("dob")).toBe("");
    expect(day).not.toHaveAttribute("aria-invalid", "true");
  });

  it("asks for the rest of a date that is only partly chosen", async () => {
    render(<DateField label="Date of birth" name="dob" display="BS" isOptional />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Month" }), "2");

    expect(screen.getByRole("combobox", { name: "Day" })).toHaveAccessibleDescription(
      "Choose the day, month and year.",
    );
  });

  it("follows a new value given from outside", async () => {
    render(<Controlled display="BS" start="2026-11-02" onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("1");
    expect(screen.getByRole("combobox", { name: "Month" })).toHaveValue("1");
    expect(screen.getByRole("textbox", { name: "Year" })).toHaveValue("2083");
  });

  it("shows errors from the server on every part", () => {
    render(
      <DateField
        label="Date"
        name="paidOn"
        display="BS"
        defaultValue="2026-11-02"
        errors={["Enter a date from 1 Jan 2000 to today."]}
      />,
    );

    for (const part of [
      screen.getByRole("combobox", { name: "Day" }),
      screen.getByRole("combobox", { name: "Month" }),
      screen.getByRole("textbox", { name: "Year" }),
    ]) {
      expect(part).toHaveAttribute("aria-invalid", "true");
      expect(part).toHaveAccessibleDescription("Enter a date from 1 Jan 2000 to today.");
    }
  });
});
