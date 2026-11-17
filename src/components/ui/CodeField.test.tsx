import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CodeField } from "./CodeField";

function boxes(): string[] {
  return [...document.querySelectorAll("[data-code-box]")].map((box) => box.textContent);
}

describe("CodeField (issue 66)", () => {
  it("shows six empty digit boxes over one labelled input", () => {
    render(<CodeField label="Code" name="code" />);

    const input = screen.getByLabelText("Code");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(document.querySelectorAll("[data-code-box]")).toHaveLength(6);
    expect(document.querySelector("[data-code-boxes]")).toHaveAttribute("aria-hidden", "true");
  });

  it("fills a box per digit as it is typed, keeping only digits, at most six", async () => {
    render(<CodeField label="Code" name="code" />);
    const input = screen.getByLabelText("Code");

    await userEvent.type(input, "12a3 45678");

    expect(input).toHaveValue("123456");
    expect(
      boxes()
        .slice(0, 6)
        .map((box) => box.replace("·", "")),
    ).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("takes a pasted code with its space", async () => {
    render(<CodeField label="Code" name="code" />);
    const input = screen.getByLabelText("Code");
    input.focus();

    await userEvent.paste("654 321");

    expect(input).toHaveValue("654321");
  });

  it("is sent with its form under its name", async () => {
    let sent = "";
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("code");
          sent = typeof value === "string" ? value : "";
        }}
      >
        <CodeField label="Code" name="code" />
        <button type="submit">Send</button>
      </form>,
    );

    await userEvent.type(screen.getByLabelText("Code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(sent).toBe("123456");
  });

  it("is described by its error", () => {
    render(<CodeField label="Code" name="code" errors={["Enter the 6-digit code."]} />);

    expect(screen.getByLabelText("Code")).toHaveAccessibleDescription("Enter the 6-digit code.");
    expect(screen.getByLabelText("Code")).toHaveAttribute("aria-invalid", "true");
  });
});
