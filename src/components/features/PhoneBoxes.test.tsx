import { render, screen, within } from "@testing-library/react";

import { MessageList } from "@/components/features/communication/MessageList";
import { PaperworkList } from "@/components/features/documents/PaperworkList";
import { BatchMeta } from "@/components/features/batches/BatchMeta";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { BarList } from "@/components/ui/BarList";
import { Journey } from "@/components/ui/Journey";
import { StageMeter } from "@/components/ui/StageMeter";
import { Stage } from "@/constants/stages";
import { Country } from "@/constants/students";
import { BatchSchema } from "@/lib/api/classes/batches";
import type { Message, PaperworkRow, StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Ramesh Adhikari", email: "admin@office.com", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "tasks"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

function inOffice(node: React.ReactNode) {
  return render(<StaffContextContext value={ADMIN}>{node}</StaffContextContext>);
}

/** Whether the element, or a box around it, is hidden at 640 and below. */
function isHiddenOnPhone(element: Element | null | undefined): boolean {
  for (let node = element ?? null; node !== null; node = node.parentElement) {
    if (node.classList.contains("max-phone:hidden")) return true;
  }
  return false;
}

function paperworkRow(counts: Partial<PaperworkRow>): PaperworkRow {
  return {
    student: {
      id: uid(7),
      name: "Aarav Sharma",
      stage: Stage.Applying,
      country: Country.Australia,
      assignedCounsellor: { id: uid(2), name: "Sita Karki" },
    },
    done: 5,
    total: 13,
    rejected: 0,
    waiting: 0,
    missing: 0,
    verified: 0,
    ...counts,
  };
}

describe("Documents on a phone", () => {
  function showRow(counts: Partial<PaperworkRow>) {
    render(<PaperworkList rows={[paperworkRow(counts)]} showsCounsellor onOpen={vi.fn()} />);
  }

  it("keep only the to check and rejected chips", () => {
    showRow({ rejected: 1, waiting: 2, missing: 4, verified: 6 });

    expect(isHiddenOnPhone(screen.getByText(/1 rejected/i))).toBe(false);
    expect(isHiddenOnPhone(screen.getByText(/2 to check/i))).toBe(false);
    expect(isHiddenOnPhone(screen.getByText(/4 missing/i))).toBe(true);
    expect(isHiddenOnPhone(screen.getByText(/6 correct/i))).toBe(true);
  });

  it("drop the chips box when nothing needs anyone", () => {
    showRow({ missing: 4, verified: 6 });

    expect(isHiddenOnPhone(screen.getByText(/4 missing/i).closest("div"))).toBe(true);
  });

  it("show '5 of 13' without the bar, the name on one line and no Stage line", () => {
    showRow({ waiting: 1 });

    expect(isHiddenOnPhone(screen.getByRole("progressbar"))).toBe(true);
    expect(isHiddenOnPhone(screen.getByText(/5 of 13/))).toBe(false);
    expect(screen.getByText("Aarav Sharma")).toHaveClass("max-phone:truncate");
    expect(isHiddenOnPhone(screen.getByText(/Applying, Australia/))).toBe(true);
    expect(isHiddenOnPhone(screen.getByRole("button", { name: /Open checklist/ }))).toBe(false);
  });
});

describe("Email on a phone", () => {
  const MESSAGE: Message = {
    id: uid(1),
    student: { id: uid(7), name: "Aarav Sharma" },
    channel: "email",
    subject: "Your visa interview is on Monday.",
    body: "Dear Aarav,",
    status: "sent",
    error: "",
    sentTo: "aarav@example.com",
    attachments: [],
    sentAt: "2026-11-10T09:20:00+05:45",
    sentBy: { id: uid(2), name: "Sita Karki" },
  };

  it("show name and status, kind and time, and the subject line cut to two lines", () => {
    inOffice(<MessageList label="Messages" messages={[MESSAGE]} showsStudent />);

    expect(isHiddenOnPhone(screen.getByText(/Sita Karki/))).toBe(true);
    expect(isHiddenOnPhone(screen.getByText("Email"))).toBe(false);
    expect(screen.getByText(MESSAGE.subject)).toHaveClass("max-phone:line-clamp-2");
    expect(screen.getByText("Sent").closest("li")).toHaveClass(
      "max-phone:grid-cols-[minmax(0,1fr)_auto]",
    );
  });
});

describe("Classes on a phone", () => {
  const BATCH = BatchSchema.parse({
    id: uid(1),
    name: "IELTS Morning",
    test_type: "ielts",
    teacher: { id: uid(3), name: "Hari Thapa" },
    time_slot: "7:00 to 8:30",
    starts_on: "2026-11-01",
    ends_on: "2026-12-20",
    timing: "running",
    student_count: 12,
    attendance_taken_today: false,
    can_change: true,
  });

  it("drop the teacher in a list, and keep the time and how many Students", () => {
    render(<BatchMeta batch={BATCH} hidesTeacherOnPhone />);

    expect(isHiddenOnPhone(screen.getByText("Hari Thapa"))).toBe(true);
    expect(isHiddenOnPhone(screen.getByText("7:00 to 8:30"))).toBe(false);
    expect(isHiddenOnPhone(screen.getByText(/12 Students/))).toBe(false);
  });

  it("keep the teacher on the class's own page", () => {
    render(<BatchMeta batch={BATCH} />);

    expect(isHiddenOnPhone(screen.getByText("Hari Thapa"))).toBe(false);
  });
});

describe("Bar lists on a phone", () => {
  it("put the name and amount on one line and the bar under them", () => {
    render(<BarList label="Money by type" rows={[{ label: "Visa fees", value: 40000 }]} />);

    const row = within(screen.getByRole("list", { name: "Money by type" })).getByRole("listitem");
    expect(row).toHaveClass("max-phone:grid-cols-[minmax(0,1fr)_auto]");
    const [name, bar, amount] = [...row.children];
    expect(name).toHaveClass("max-phone:row-start-1");
    expect(amount).toHaveClass("max-phone:row-start-1", "max-phone:col-start-2");
    expect(bar).toHaveClass("max-phone:row-start-2", "max-phone:col-span-2");
  });
});

describe("The Stage on a phone", () => {
  it("is the name alone in a list, without the dots", () => {
    const { container } = render(<StageMeter stage={Stage.Applying} />);

    expect(isHiddenOnPhone(container.querySelector("[data-step]"))).toBe(true);
    expect(isHiddenOnPhone(screen.getByText("Applying"))).toBe(false);
  });

  it("is a compact stepper on the Student's page: five dots in a row, small names under them", () => {
    render(<Journey stage={Stage.Applying} nextStep="Add the Offer Letter" />);

    const steps = screen.getByRole("list");
    expect(steps).toHaveClass("grid-cols-[repeat(5,minmax(0,1fr))]");
    expect(steps).not.toHaveClass("grid-cols-1");
    const stop = within(steps).getAllByRole("listitem")[0];
    expect(stop).toHaveClass("justify-items-center", "before:left-1/2", "phone:before:left-5");
    expect(screen.getByText("Lead")).toHaveClass("max-phone:text-tiny", "max-phone:truncate");
  });

  it("cuts the next step to two lines", () => {
    render(<Journey stage={Stage.Applying} nextStep="Add the Offer Letter" />);

    expect(screen.getByText("Add the Offer Letter").closest("p")).toHaveClass(
      "max-phone:line-clamp-2",
    );
  });
});
