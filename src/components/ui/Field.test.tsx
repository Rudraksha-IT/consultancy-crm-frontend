import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FileField } from "./FileField";
import { SelectField } from "./SelectField";
import { TextAreaField } from "./TextAreaField";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("is labelled, required and described by its hint", () => {
    render(<TextField label="Subdomain" name="subdomain" hint="Lowercase letters only." />);

    const input = screen.getByRole("textbox", { name: "Subdomain" });
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription("Lowercase letters only.");
    expect(input).not.toHaveAttribute("aria-invalid", "true");
  });

  it("shows its errors instead of the hint and is marked invalid", () => {
    render(
      <TextField
        label="Subdomain"
        name="subdomain"
        hint="Lowercase letters only."
        errors={["This subdomain is already taken."]}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Subdomain" });
    expect(input).toHaveAccessibleDescription("This subdomain is already taken.");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("can be optional, which the label says", () => {
    render(<TextField label="Email" name="email" type="email" isOptional />);

    const input = screen.getByRole("textbox", { name: "Email (optional)" });
    expect(input).not.toBeRequired();
  });

  it("reports what is typed when controlled", async () => {
    const handleChange = vi.fn();
    render(<TextField label="Name" name="name" value="" onChange={handleChange} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "S");

    expect(handleChange).toHaveBeenCalledWith("S");
  });

  it("has no description without a hint or errors", () => {
    render(<TextField label="Name" name="name" errors={[]} />);

    expect(screen.getByRole("textbox", { name: "Name" })).not.toHaveAttribute("aria-describedby");
  });
});

describe("TextField suggestions", () => {
  it("offers its suggestions as a list tied to the input", () => {
    const { container } = render(
      <TextField
        label="What it's for"
        name="purpose"
        suggestions={["IELTS class fee", "Visa fee"]}
      />,
    );

    const input = screen.getByRole("combobox", { name: "What it's for" });
    const list = container.querySelector(
      `datalist#${CSS.escape(input.getAttribute("list") ?? "")}`,
    );
    expect([...(list?.querySelectorAll("option") ?? [])].map((o) => o.value)).toEqual([
      "IELTS class fee",
      "Visa fee",
    ]);
  });

  it("has no list without suggestions", () => {
    const { container } = render(<TextField label="Name" name="name" suggestions={[]} />);

    expect(screen.getByRole("textbox", { name: "Name" })).not.toHaveAttribute("list");
    expect(container.querySelector("datalist")).toBeNull();
  });
});

describe("SelectField", () => {
  const OPTIONS = [
    { value: "ice", label: "Ice grey" },
    { value: "stone", label: "Stone grey" },
  ];

  it("offers its options and reports the chosen one", async () => {
    const handleChange = vi.fn();
    render(
      <SelectField
        label="Page background"
        name="page"
        options={OPTIONS}
        value="ice"
        onChange={handleChange}
      />,
    );

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Page background" }),
      "Stone grey",
    );

    expect(handleChange).toHaveBeenCalledWith("stone");
  });

  it("is described by its hint", () => {
    render(<SelectField label="Page background" name="page" options={OPTIONS} hint="Pick one." />);

    expect(screen.getByRole("combobox", { name: "Page background" })).toHaveAccessibleDescription(
      "Pick one.",
    );
  });
});

describe("TextAreaField", () => {
  it("is a labelled, optional box for several lines, described by its hint", () => {
    render(<TextAreaField label="Note" name="note" hint="Shown to everyone." isOptional />);

    const box = screen.getByRole("textbox", { name: "Note (optional)" });
    expect(box.tagName).toBe("TEXTAREA");
    expect(box).not.toBeRequired();
    expect(box).toHaveAccessibleDescription("Shown to everyone.");
  });

  it("can hide its label visually but keep it for screen readers", () => {
    render(<TextAreaField label="Note" name="note" isLabelHidden />);

    expect(screen.getByRole("textbox", { name: "Note" })).toBeInTheDocument();
    expect(screen.getByText("Note")).toHaveClass("sr-only");
  });

  it("shows its errors and is marked invalid", () => {
    render(<TextAreaField label="Note" name="note" errors={["Too long."]} />);

    const box = screen.getByRole("textbox", { name: "Note" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription("Too long.");
  });

  it("tells its text after each change", async () => {
    const onChange = vi.fn<(value: string) => void>();
    render(<TextAreaField label="Note" name="note" defaultValue="Hi" onChange={onChange} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "!");

    expect(onChange).toHaveBeenLastCalledWith("Hi!");
  });

  it("keeps line breaks typed into it", async () => {
    render(<TextAreaField label="Note" name="note" />);
    const box = screen.getByRole("textbox", { name: "Note" });

    await userEvent.type(box, "First{Enter}Second");

    expect(box).toHaveValue("First\nSecond");
  });
});

describe("FileField", () => {
  it("is labelled, takes the given file types and is described by its hint", () => {
    render(<FileField label="CSV file" name="file" accept=".csv" hint="At most 500 KB." />);

    const input = screen.getByLabelText("CSV file");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", ".csv");
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription("At most 500 KB.");
  });

  it("reports the chosen file", async () => {
    const handleChange = vi.fn();
    render(<FileField label="CSV file" name="file" onChange={handleChange} />);
    const file = new File(["a,b"], "catalogue.csv", { type: "text/csv" });

    await userEvent.upload(screen.getByLabelText("CSV file"), file);

    expect(handleChange).toHaveBeenCalledWith(file);
  });

  it("takes one file unless asked for several", () => {
    render(<FileField label="CSV file" name="file" />);

    expect(screen.getByLabelText("CSV file")).not.toHaveAttribute("multiple");
  });

  it("takes several files when asked, and reports them all in order", async () => {
    const handleFiles = vi.fn();
    render(<FileField label="Pages" name="file" multiple onFilesChange={handleFiles} />);
    const front = new File(["%PDF"], "front.pdf", { type: "application/pdf" });
    const back = new File(["%PDF"], "back.pdf", { type: "application/pdf" });

    await userEvent.upload(screen.getByLabelText("Pages"), [front, back]);

    expect(screen.getByLabelText("Pages")).toHaveAttribute("multiple");
    expect(handleFiles).toHaveBeenCalledWith([front, back]);
  });

  it("shows its errors and is marked invalid", () => {
    render(<FileField label="CSV file" name="file" errors={["Choose a CSV file."]} />);

    const input = screen.getByLabelText("CSV file");
    expect(input).toHaveAccessibleDescription("Choose a CSV file.");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});

describe("TextField with a suffix (issue 64)", () => {
  it("shows the fixed text after the input, without changing its label or value", async () => {
    render(<TextField label="Subdomain" name="subdomain" suffix=".crm.example.com" />);

    await userEvent.type(screen.getByLabelText("Subdomain"), "acme");

    expect(screen.getByText(".crm.example.com")).toBeVisible();
    expect(screen.getByLabelText("Subdomain")).toHaveValue("acme");
  });

  it("shows nothing extra without one", () => {
    const { container } = render(<TextField label="Name" name="name" />);

    expect(container.querySelectorAll("span")).toHaveLength(0);
  });
});

it("keeps what was typed when a suffix arrives later (issue 64)", async () => {
  const { rerender } = render(<TextField label="Subdomain" name="subdomain" suffix="" />);
  const input = screen.getByLabelText("Subdomain");
  await userEvent.type(input, "ac");

  rerender(<TextField label="Subdomain" name="subdomain" suffix=".crm.example.com" />);
  await userEvent.type(screen.getByLabelText("Subdomain"), "me");

  expect(screen.getByLabelText("Subdomain")).toBe(input);
  expect(input).toHaveValue("acme");
});

describe("errors clear as you type", () => {
  function Form({ errors, cityErrors }: { errors?: string[]; cityErrors?: string[] }) {
    return (
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <TextField label="Subdomain" name="subdomain" errors={errors} hint="Letters only." />
        <TextField label="City" name="city" errors={cityErrors} />
        <SelectField
          label="Status"
          name="status"
          options={[
            { value: "a", label: "Active" },
            { value: "b", label: "Evaluation" },
          ]}
          errors={errors}
        />
        <button type="submit">Save</button>
      </form>
    );
  }

  it("hides a field's error once that field is changed, and shows its hint again", async () => {
    render(<Form errors={["Already taken."]} />);
    const field = screen.getByLabelText("Subdomain");
    expect(field).toHaveAccessibleDescription("Already taken.");

    await userEvent.type(field, "x");

    expect(field).toHaveAccessibleDescription("Letters only.");
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  it("leaves other fields' errors alone", async () => {
    render(<Form errors={["Already taken."]} cityErrors={["Enter a city."]} />);

    await userEvent.type(screen.getByLabelText("Subdomain"), "x");

    expect(screen.getByLabelText("City")).toHaveAccessibleDescription("Enter a city.");
  });

  it("hides a select's error once another choice is made", async () => {
    render(<Form errors={["Choose one."]} />);

    await userEvent.selectOptions(screen.getByLabelText("Status"), "b");

    expect(screen.getByLabelText("Status")).not.toHaveAccessibleDescription();
  });

  it("shows the same error again when the form is sent again", async () => {
    render(<Form errors={["Already taken."]} />);
    const field = screen.getByLabelText("Subdomain");
    await userEvent.type(field, "x");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(field).toHaveAccessibleDescription("Already taken.");
  });

  it("shows a new error at once, even after the old one was hidden", async () => {
    const { rerender } = render(<Form errors={["Already taken."]} />);
    await userEvent.type(screen.getByLabelText("Subdomain"), "x");

    rerender(<Form errors={["This subdomain is reserved."]} />);

    expect(screen.getByLabelText("Subdomain")).toHaveAccessibleDescription(
      "This subdomain is reserved.",
    );
  });

  it("shows an error again after it cleared and came back", async () => {
    const { rerender } = render(<Form errors={["Already taken."]} />);
    await userEvent.type(screen.getByLabelText("Subdomain"), "x");

    rerender(<Form />);
    rerender(<Form errors={["Already taken."]} />);

    expect(screen.getByLabelText("Subdomain")).toHaveAccessibleDescription("Already taken.");
  });
});
