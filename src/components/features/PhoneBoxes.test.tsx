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
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Ramesh Adhikari", email: "admin@office.com", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "tasks"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
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
    items: [],
    ...counts,
  };
}

describe("Documents on a phone", () => {
  function showRow(counts: Partial<PaperworkRow>) {
    render(<PaperworkList rows={[paperworkRow(counts)]} showsCounsellor onOpen={vi.fn()} />);
  }

  it("keep the short counts for what needs someone, only on a phone", () => {
    showRow({ rejected: 1, waiting: 2, missing: 4, verified: 6 });

    expect(isHiddenOnPhone(screen.getByText(/1 rejected/i))).toBe(false);
    expect(isHiddenOnPhone(screen.getByText(/2 to check/i))).toBe(false);
    expect(screen.getByText(/1 rejected/i).closest("[data-counts]")).toHaveClass("phone:hidden");
    expect(screen.queryByText(/4 missing|6 correct/i)).not.toBeInTheDocument();
  });

  it("have no counts when nothing needs anyone", () => {
    showRow({ missing: 4, verified: 6 });

    expect(document.querySelector("[data-counts]")).toBeNull();
  });

  it("show no pills", () => {
    showRow({ missing: 1, items: [{ name: "Passport", state: "missing" }] });

    expect(isHiddenOnPhone(screen.getByText("Passport"))).toBe(true);
  });

  it("show '5 of 13' without 'received', the name on one line and no Stage line", () => {
    showRow({ waiting: 1 });

    const received = document.querySelector("[data-received]");
    expect(received).toHaveTextContent("5 of 13 received");
    expect(isHiddenOnPhone(received)).toBe(false);
    expect(isHiddenOnPhone(screen.getByText("received"))).toBe(true);
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
  it("shows five small beads before the name in a list (UI revamp 08)", () => {
    const { container } = render(<StageMeter stage={Stage.Applying} />);

    expect(container.querySelectorAll("[data-step]")).toHaveLength(5);
    expect(isHiddenOnPhone(container.querySelector("[data-step]"))).toBe(false);
    expect(isHiddenOnPhone(screen.getByText("Applying"))).toBe(false);
  });

  it("cuts the Stage's name with … in a narrow cell, keeping the beads (ticket 25)", () => {
    const { container } = render(<StageMeter stage={Stage.Counselling} />);

    const name = screen.getByText("Counselling");
    expect(name).toHaveClass("min-w-0", "truncate");
    expect(container.firstElementChild).toHaveClass("max-w-full");
    expect(container.querySelector("[data-step]")?.parentElement).toHaveClass("flex-none");
  });

  it("is only the five Stage names in a row on the Student's page: no dots and no line (owner, 2026-11-27)", () => {
    render(<Journey stage={Stage.Applying} nextStep="Add the Offer Letter" />);

    const steps = screen.getByRole("list");
    expect(steps).toHaveClass("grid-cols-[repeat(5,minmax(0,1fr))]");
    expect(steps).not.toHaveClass("grid-cols-1");
    const stops = within(steps).getAllByRole("listitem");
    for (const stop of stops) {
      // The line between the dots, and the dot itself, are for wider screens.
      expect(stop).toHaveClass("max-phone:before:hidden", "justify-items-center");
      expect(stop.firstElementChild).toHaveClass("max-phone:hidden");
    }
    expect(screen.getByText("Lead")).toHaveClass("max-phone:text-tiny", "max-phone:truncate");
    // Where the Student is: its name in bold with a line under it; the rest have none.
    expect(screen.getByText("Applying")).toHaveClass("font-semibold", "max-phone:border-accent");
    expect(screen.getByText("Lead")).toHaveClass("max-phone:border-transparent");
    expect(screen.getByText("Visa")).toHaveClass("max-phone:border-transparent");
  });

  it("cuts the next step to two lines", () => {
    render(<Journey stage={Stage.Applying} nextStep="Add the Offer Letter" />);

    expect(screen.getByText("Add the Offer Letter").closest("p")).toHaveClass(
      "max-phone:line-clamp-2",
    );
  });
});
