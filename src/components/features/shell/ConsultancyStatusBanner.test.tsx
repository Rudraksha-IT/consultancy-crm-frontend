import { act, render, screen } from "@testing-library/react";

import { ConsultancyStatus, STATUS_TEXT } from "@/constants/consultancyStatus";
import { reportRestriction } from "@/lib/api/core/restriction";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { ConsultancyStatusBanner } from "./ConsultancyStatusBanner";

const path = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.current }));

const READ_ONLY_MESSAGE =
  "Your office's account is suspended, so you can look things up but not make changes. Ask your Admin to contact the CRM team.";

const ACTIVE = { status: ConsultancyStatus.Active, statusMessage: null, evaluationEndsAt: null };
const SUSPENDED = {
  status: ConsultancyStatus.Suspended,
  statusMessage: READ_ONLY_MESSAGE,
  evaluationEndsAt: null,
};

function endingInHours(hours: number) {
  return {
    status: ConsultancyStatus.Evaluation,
    statusMessage: null,
    evaluationEndsAt: new Date(Date.now() + hours * 3_600_000).toISOString(),
  };
}

afterEach(() => {
  path.current = "/";
});

describe.each(THEME_CASES)("ConsultancyStatusBanner in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows nothing while the office is Active", () => {
    const { container } = render(<ConsultancyStatusBanner shown={ACTIVE} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("warns on every screen, in words, while the office is read-only", () => {
    render(<ConsultancyStatusBanner shown={SUSPENDED} />);

    expect(screen.getByRole("status")).toHaveTextContent(READ_ONLY_MESSAGE);
  });

  it("warns when the evaluation ends within 3 days", () => {
    render(<ConsultancyStatusBanner shown={endingInHours(50)} />);

    expect(screen.getByRole("status")).toHaveTextContent(/trial ends/);
  });

  it("says nothing about an evaluation with weeks left", () => {
    const { container } = render(<ConsultancyStatusBanner shown={endingInHours(24 * 10)} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("ConsultancyStatusBanner when a change is refused", () => {
  it("shows the server's reason as a problem instead of the warning", () => {
    render(<ConsultancyStatusBanner shown={SUSPENDED} />);

    act(() => {
      reportRestriction({ status: ConsultancyStatus.Suspended, message: READ_ONLY_MESSAGE });
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(STATUS_TEXT.changeRefusedTitle);
    expect(alert).toHaveTextContent(READ_ONLY_MESSAGE);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("goes back to the warning on another page", () => {
    const { rerender } = render(<ConsultancyStatusBanner shown={SUSPENDED} />);
    act(() => {
      reportRestriction({ status: ConsultancyStatus.Suspended, message: READ_ONLY_MESSAGE });
    });

    path.current = "/students";
    rerender(<ConsultancyStatusBanner shown={SUSPENDED} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(READ_ONLY_MESSAGE);
  });

  it("shows the server's words as text, never as markup", () => {
    render(<ConsultancyStatusBanner shown={ACTIVE} />);

    act(() => {
      reportRestriction({
        status: ConsultancyStatus.PastDue,
        message: '<img src=x onerror="alert(1)">',
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent('<img src=x onerror="alert(1)">');
    expect(document.querySelector("img")).toBeNull();
  });
});
