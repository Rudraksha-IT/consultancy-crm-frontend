import { TEST_COLOURS } from "@/lib/theme/testColours";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { DEFAULT_THEME, type ThemeConfig } from "@/lib/theme";

import { ThemeEditor } from "./ThemeEditor";

function Harness({ onChange }: { onChange: (theme: ThemeConfig) => void }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  return (
    <ThemeEditor
      value={theme}
      onChange={(next) => {
        setTheme(next);
        onChange(next);
      }}
    />
  );
}

function lastTheme(handleChange: ReturnType<typeof vi.fn>): unknown {
  return handleChange.mock.lastCall?.[0];
}

describe("ThemeEditor", () => {
  it("changes the page background from the fixed list", async () => {
    const handleChange = vi.fn();
    render(<Harness onChange={handleChange} />);

    await userEvent.selectOptions(screen.getByLabelText("Page background"), "Ice grey");

    expect(lastTheme(handleChange)).toMatchObject({ page: "ice" });
  });

  it("picks the sidebar and accent from presets", async () => {
    const handleChange = vi.fn();
    render(<Harness onChange={handleChange} />);

    await userEvent.selectOptions(screen.getByLabelText("Sidebar"), "Navy");
    await userEvent.selectOptions(screen.getByLabelText("Accent"), "Crimson");

    expect(lastTheme(handleChange)).toMatchObject({
      sidebar: TEST_COLOURS.navy,
      accent: TEST_COLOURS.crimson,
    });
  });

  it("takes any colour from the custom colour picker", () => {
    const handleChange = vi.fn();
    render(<Harness onChange={handleChange} />);

    // jsdom has no colour dialog; set the value the way the browser would.
    fireEvent.input(screen.getByLabelText("Custom accent colour"), {
      target: { value: TEST_COLOURS.custom },
    });

    expect(lastTheme(handleChange)).toMatchObject({ accent: TEST_COLOURS.custom });
    expect(screen.getByLabelText("Accent")).toHaveDisplayValue(`Custom (${TEST_COLOURS.custom})`);
  });

  it("sets the dark-mode background, sidebar and accent", async () => {
    const handleChange = vi.fn();
    render(<Harness onChange={handleChange} />);

    await userEvent.selectOptions(screen.getByLabelText("Dark background"), "Pine black");
    await userEvent.selectOptions(screen.getByLabelText("Dark sidebar"), "Pure black");
    await userEvent.selectOptions(
      screen.getByLabelText("Dark accent"),
      "Automatic, from the light accent",
    );

    expect(lastTheme(handleChange)).toMatchObject({
      dark: { base: "pine", sidebar: "black", accent: "auto" },
    });
  });

  it("says when the accent was darkened to keep text readable", () => {
    render(<Harness onChange={vi.fn()} />);
    expect(screen.queryByText(/darkened/)).not.toBeInTheDocument();

    fireEvent.input(screen.getByLabelText("Custom accent colour"), {
      target: { value: TEST_COLOURS.paleSky },
    });

    expect(
      screen.getByText("We made this accent a little darker so white text on it stays readable."),
    ).toBeInTheDocument();
  });
});
