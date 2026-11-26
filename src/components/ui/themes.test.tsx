import { render, screen } from "@testing-library/react";

import { buildThemeTokens } from "@/lib/theme";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { CodeField } from "./CodeField";
import { Avatar } from "./Avatar";
import { Banner } from "./Banner";
import { BarList } from "./BarList";
import { Button } from "./Button";
import { CheckboxGroup } from "./CheckboxGroup";
import { Chip } from "./Chip";
import { ColumnChart } from "./ColumnChart";
import { DetailList } from "./DetailList";
import { ConfirmDialog } from "./ConfirmDialog";
import { Dialog } from "./Dialog";
import { EmptyState } from "./EmptyState";
import { FigureTile } from "./FigureTile";
import { FileField } from "./FileField";
import { IconButton } from "./IconButton";
import { Journey } from "./Journey";
import { Menu } from "./Menu";
import { NoteCard } from "./NoteCard";
import { PageHeader } from "./PageHeader";
import { Pager } from "./Pager";
import { Panel } from "./Panel";
import { PasswordField } from "./PasswordField";
import { ProgressBar } from "./ProgressBar";
import { RowItem } from "./RowItem";
import { RowList } from "./RowList";
import { SearchBox } from "./SearchBox";
import { Section } from "./Section";
import { SegmentedChoice } from "./SegmentedChoice";
import { SegmentedControl } from "./SegmentedControl";
import { SelectField } from "./SelectField";
import { StageCards } from "./StageCards";
import { StageMeter } from "./StageMeter";
import { Switch } from "./Switch";
import { Tabs } from "./Tabs";
import { TextAreaField } from "./TextAreaField";
import { TextField } from "./TextField";
import { Thread } from "./Thread";
import { InfoTip } from "./InfoTip";
import { Timeline } from "./Timeline";
import { ToastProvider } from "./ToastProvider";

const COUNTS = {
  lead: 1,
  counselling: 1,
  applying: 1,
  offer: 1,
  visa: 2,
  lost: 0,
};

/** Every ui component on one page. */
function Gallery() {
  return (
    <ToastProvider>
      <PageHeader
        title="Gallery"
        subtitle="Every component"
        actions={<Button variant="primary">Go</Button>}
      />
      <Section title="Controls">
        <Panel isPadded>
          <Button variant="danger">Delete</Button>
          <Button variant="ghost">Skip</Button>
          <IconButton icon="bell" label="Notifications" />
          <TextField label="Name" name="name" />
          <SelectField label="Page" name="page" options={[{ value: "ice", label: "Ice" }]} />
          <TextAreaField label="Note" name="note" isOptional />
          <PasswordField />
          <FileField label="CSV file" name="file" accept=".csv" />
          <CodeField label="Code" name="code" />
          <SegmentedControl
            label="Mode"
            options={[{ value: "a", label: "A" }]}
            value="a"
            onChange={vi.fn()}
          />
          <SegmentedChoice
            label="Attendance"
            name="attendance"
            options={[
              { value: "present", label: "Present", tone: "good" },
              { value: "late", label: "Late", tone: "warn" },
            ]}
            value="late"
            onChange={vi.fn()}
          />
          <Switch label="Reports" isOn onChange={vi.fn()} />
          <SearchBox label="Search" value="" onChange={vi.fn()} />
          <Menu label="More" items={[{ label: "Edit", onSelect: vi.fn() }]} />
          <CheckboxGroup
            label="Also considering"
            name="countries"
            options={[{ value: "uk", label: "UK" }]}
            values={["uk"]}
            onChange={vi.fn()}
          />
        </Panel>
      </Section>
      <Section title="Status">
        <Chip tone="good">Verified</Chip>
        <ProgressBar label="Paid" value={1} max={2} />
        <Banner tone="warning">Careful</Banner>
        <FigureTile label="Visitors" value="3" />
        <EmptyState>Nothing yet.</EmptyState>
        <Avatar name="Sita Sharma" />
        <Thread stage="visa" />
        <StageMeter stage="lost" />
        <StageCards counts={COUNTS} hrefFor={(stage) => `/${stage}`} />
        <RowList>
          <RowItem title="Row" />
        </RowList>
        <Pager summary="30 rows" count={30} page={1} pageSize={25} onPage={vi.fn()} />
        <Journey
          stage="counselling"
          nextStep="Choose a course and apply"
          onMoveTo={() => undefined}
        />
        <NoteCard title="Note">
          <p>Wants Melbourne only.</p>
        </NoteCard>
        <DetailList items={[{ label: "Mobile", value: "9841000001" }]} />
        <Timeline
          label="Activity"
          items={[
            { kind: "gap", id: "g", text: "In Lost for 3 days so far", isCurrent: true },
            { id: "1", title: "Note edited", meta: "Asha" },
            {
              kind: "stage",
              id: "s",
              tone: "lost",
              tag: "Marked Lost",
              move: { from: "Counselling", to: "Lost" },
              meta: "Asha",
            },
          ]}
        />
        <InfoTip label="When they were Lost">Lost on 8 Oct 2026.</InfoTip>
        <Banner icon="lock">View only.</Banner>
      </Section>
      <Tabs label="Profile" tabs={[{ id: "a", label: "Apps" }]} selected="a" onSelect={vi.fn()}>
        <BarList label="Bars" rows={[{ label: "In", value: 2 }]} />
        <ColumnChart
          title="Chart"
          categories={[{ key: "m", label: "May", shortLabel: "May" }]}
          series={[{ name: "In", values: [2] }]}
        />
      </Tabs>
      <Dialog isOpen title="Dialog" onClose={vi.fn()}>
        <p>Body</p>
      </Dialog>
      <ConfirmDialog
        title="Remove TU?"
        actionLabel="Remove"
        onConfirm={vi.fn<() => Promise<void>>()}
        onClose={vi.fn()}
      >
        It comes off the profile.
      </ConfirmDialog>
    </ToastProvider>
  );
}

describe.each(THEME_CASES)("ui components in the $name Theme", ({ mode }) => {
  afterEach(resetTheme);

  it("render with the Theme's tokens on the page", () => {
    applyThemeCase(mode);
    const tokens = buildThemeTokens()[mode];

    render(<Gallery />);

    expect(document.documentElement.dataset.theme).toBe(mode);
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(tokens.accent);
    expect(screen.getByRole("heading", { level: 1, name: "Gallery" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Dialog" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Remove TU?" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Chart" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Stage: Visa" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Reports" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Note (optional)" })).toBeInTheDocument();
    expect(screen.getByText("Lost")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Stage: Counselling" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Note" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Activity" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "UK" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Late" })).toBeChecked();
    expect(screen.getByLabelText("CSV file")).toHaveAttribute("type", "file");
  });
});
