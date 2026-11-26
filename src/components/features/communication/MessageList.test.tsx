import { render, screen, within } from "@testing-library/react";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import type { Message, StaffContext } from "@/lib/api";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

import { MessageList } from "./MessageList";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Ramesh Adhikari", email: "admin@office.com", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "communication"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const SENT: Message = {
  id: uid(1),
  student: { id: uid(7), name: "Aarav Sharma" },
  channel: "email",
  subject: "Your visa interview is on Monday.",
  body: "Dear Aarav,",
  status: "sent",
  error: "",
  sentTo: "aarav@office.com",
  attachments: [],
  sentAt: "2026-10-09T15:20:00+05:45",
  sentBy: { id: uid(2), name: "Anita Gurung" },
};

const FAILED: Message = {
  ...SENT,
  id: uid(2),
  status: "failed",
  error: "The email couldn't be sent. Try again in a few minutes.",
  attachments: ["brochure.pdf"],
};

function showRows(messages: readonly Message[]) {
  render(
    <StaffContextContext value={ADMIN}>
      <MessageList label="Email" messages={messages} showsStudent />
    </StaffContextContext>,
  );
  return within(screen.getByRole("list", { name: "Email" })).getAllByRole("listitem");
}

function firstRow(messages: readonly Message[]): HTMLElement {
  const [row] = showRows(messages);
  if (row === undefined) throw new Error("no row");
  return row;
}

function topOf(row: HTMLElement): HTMLElement {
  const top = row.querySelector<HTMLElement>("[data-row-top]");
  if (top === null) throw new Error("the row has no top line");
  return top;
}

function detailsOf(row: HTMLElement): HTMLElement {
  const details = row.querySelector<HTMLElement>("[data-details]");
  if (details === null) throw new Error("the row has no details");
  return details;
}

describe("An Email list row (ticket 13)", () => {
  it("leads with the Student's name, bold and the biggest line, linked to their page", () => {
    const row = firstRow([SENT]);

    const name = within(row).getByRole("link", { name: "Aarav Sharma" });
    expect(name).toHaveAttribute("href", `/students/${uid(7)}`);
    expect(name).toHaveClass("text-email-name", "text-ink", "min-h-control");
    expect(topOf(row).firstElementChild).toBe(name);
  });

  it('puts "Email · date · By …" small and muted on the name\'s line on computers', () => {
    const row = firstRow([SENT]);

    const top = topOf(row);
    const details = detailsOf(row);
    expect(top).toContainElement(details);
    expect(top).toHaveClass("flex", "flex-wrap", "items-baseline");
    expect(details).toHaveTextContent(/^Email · 9 Oct 2026, 15:20 · By Anita Gurung$/);
    expect(details).toHaveClass("text-small", "text-ink-3", "font-normal");
  });

  it("puts the details under the name on phones, without who sent it", () => {
    const row = firstRow([SENT]);

    expect(topOf(row)).toHaveClass("max-phone:block");
    const details = detailsOf(row);
    expect(details).toHaveClass("max-phone:text-secondary", "max-phone:text-ink-2");
    expect(details).toHaveClass("max-phone:truncate");
    const by = within(details).getByText(/By Anita Gurung/);
    expect(by).toHaveClass("max-phone:hidden");
    expect(by).toHaveTextContent(/^· By Anita Gurung$/);
    expect(within(details).getByText("Email")).not.toHaveClass("max-phone:hidden");
  });

  it("keeps the dots between the details away from screen readers", () => {
    const details = detailsOf(firstRow([SENT]));

    const dots = [...details.querySelectorAll("[aria-hidden='true']")];
    expect(dots).toHaveLength(2);
    for (const dot of dots) expect(dot).toHaveTextContent("·");
  });

  it("shows the subject under the name, lighter, cut to two lines on phones", () => {
    const row = firstRow([SENT]);

    const subject = within(row).getByText(SENT.subject);
    expect(subject).toHaveClass("font-medium", "max-phone:line-clamp-2");
    expect(topOf(row)).not.toContainElement(subject);
  });

  it("shows a past SMS's words where the subject would be", () => {
    const row = firstRow([{ ...SENT, channel: "sms", subject: "", body: "Namaste, class at 7." }]);

    expect(detailsOf(row)).toHaveTextContent(/^SMS \(no longer available\) · /);
    expect(within(row).getByText("Namaste, class at 7.")).toHaveClass("max-phone:line-clamp-2");
  });

  it("keeps the status as a word on the right, beside the text on phones too", () => {
    const [sent, failed] = showRows([SENT, FAILED]);
    if (sent === undefined || failed === undefined) throw new Error("two rows expected");

    expect(within(sent).getByText("Sent")).toBeInTheDocument();
    expect(within(failed).getByText("Failed")).toBeInTheDocument();
    expect(sent).toHaveClass("max-phone:grid-cols-[minmax(0,1fr)_auto]");
    expect(topOf(sent)).not.toContainElement(within(sent).getByText("Sent"));
  });

  it("lists the attachments and the reason it failed under the subject", () => {
    const [, failed] = showRows([SENT, FAILED]);
    if (failed === undefined) throw new Error("two rows expected");

    expect(failed).toHaveTextContent("Attached: brochure.pdf");
    expect(within(failed).getByText(FAILED.error)).toHaveClass("text-bad");
    expect(topOf(failed)).not.toHaveTextContent("Attached");
  });

  it("shows a markup-shaped name and subject as plain text", () => {
    const row = firstRow([
      {
        ...SENT,
        student: { id: uid(7), name: "<img src=x onerror=alert(1)>" },
        subject: "<script>alert(1)</script>",
        sentBy: { id: uid(2), name: "<b>Anita</b>" },
      },
    ]);

    expect(row.querySelector("img, script, b")).toBeNull();
    expect(within(row).getByRole("link")).toHaveTextContent("<img src=x onerror=alert(1)>");
    expect(detailsOf(row)).toHaveTextContent("By <b>Anita</b>");
  });

  it("leads with the kind of message where the Student isn't named", () => {
    render(
      <StaffContextContext value={ADMIN}>
        <MessageList label="Email" messages={[SENT]} showsStudent={false} />
      </StaffContextContext>,
    );

    const row = screen.getByRole("listitem");
    expect(within(row).queryByRole("link")).not.toBeInTheDocument();
    expect(topOf(row).firstElementChild).toHaveTextContent(/^Email$/);
    expect(detailsOf(row)).toHaveTextContent(/^9 Oct 2026, 15:20 · By Anita Gurung$/);
  });
});
