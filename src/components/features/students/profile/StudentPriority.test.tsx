import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";
import { PROFILE } from "@/test/studentProfile";

import { StudentProfilePage } from "./StudentProfilePage";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(5), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const FRONT_DESK: StaffContext = {
  ...COUNSELLOR,
  staff: { id: uid(8), name: "Ramesh KC", email: "ramesh@acme.test", role: "front_desk" },
};

type Answer = (path: string, init?: RequestInit) => Response | undefined;

const method = (init?: RequestInit): string => init?.method ?? "GET";

function backend(...answers: Answer[]) {
  const fetchFn = vi.fn((path: string, init?: RequestInit) => {
    for (const answer of answers) {
      const response = answer(path, init);
      if (response !== undefined) return Promise.resolve(response);
    }
    return Promise.resolve(jsonResponse({}, 500));
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

function on(verb: string, path: string, body: unknown, status = 200): Answer {
  return (calledPath, init) =>
    method(init) === verb && calledPath.startsWith(path) ? jsonResponse(body, status) : undefined;
}

const profile =
  (body: unknown = PROFILE): Answer =>
  (path, init) =>
    method(init) === "GET" && path === `/api/students/${uid(7)}/` ? jsonResponse(body) : undefined;

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const call = fetchFn.mock.calls.find(([p, init]) => method(init) === verb && p === path);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function renderPage(context: StaffContext = COUNSELLOR) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <StudentProfilePage studentId={uid(7)} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

const PRIORITY_PATH = `/api/students/${uid(7)}/priority/`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a Student's Priority (ticket 10)", () => {
  it("shows the Priority in words beside the name", async () => {
    backend(profile({ ...PROFILE, priority: "high" }));
    renderPage();

    const button = await screen.findByRole("button", { name: "Priority: High. Change it" });
    expect(button).toHaveTextContent("PriorityHigh");
  });

  it("sits with the actions, not in the line with the name", async () => {
    backend(profile());
    renderPage();

    const button = await screen.findByRole("button", { name: "Priority: Normal. Change it" });
    const name = screen.getByRole("heading", { level: 1, name: "Sita Gurung" });
    expect(name.parentElement).not.toContainElement(button);
  });

  it("says what each choice means in the menu", async () => {
    backend(profile());
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "Priority: Normal. Change it" }),
    );

    const menu = screen.getByRole("menu", { name: "Set priority" });
    expect(menu).toHaveTextContent("Set priority");
    expect(screen.getByRole("menuitemradio", { name: /High/ })).toHaveTextContent(
      "Needs attention first",
    );
    expect(screen.getByRole("menuitemradio", { name: /Normal/ })).toHaveTextContent(
      "The usual pace",
    );
    expect(screen.getByRole("menuitemradio", { name: /Low/ })).toHaveTextContent("Can wait");
  });

  it("changes it from the menu, records it and says so", async () => {
    const fetchFn = backend(profile(), on("PUT", PRIORITY_PATH, { ...PROFILE, priority: "high" }));
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "Priority: Normal. Change it" }),
    );
    const menu = screen.getByRole("menu", { name: "Set priority" });
    expect(screen.getByRole("menuitemradio", { name: /^Normal/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await userEvent.click(screen.getByRole("menuitemradio", { name: /^High/ }));

    expect(await screen.findByText("Priority set to High")).toBeInTheDocument();
    expect(menu).not.toBeInTheDocument();
    expect(sentBody(fetchFn, "PUT", PRIORITY_PATH)).toEqual({ priority: "high" });
    const button = screen.getByRole("button", { name: "Priority: High. Change it" });
    await waitFor(() => {
      expect(button).toHaveFocus();
    });
  });

  it("works from the keyboard and closes with Escape", async () => {
    backend(profile());
    renderPage();
    const button = await screen.findByRole("button", { name: "Priority: Normal. Change it" });

    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("menuitemradio", { name: /^High/ })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitemradio", { name: /^Normal/ })).toHaveFocus();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu", { name: "Set priority" })).toBeNull();
    expect(button).toHaveFocus();
  });

  it("sends nothing when the same Priority is chosen", async () => {
    const fetchFn = backend(profile());
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "Priority: Normal. Change it" }),
    );
    await userEvent.click(screen.getByRole("menuitemradio", { name: /^Normal/ }));

    expect(fetchFn.mock.calls.filter(([, init]) => method(init) === "PUT")).toHaveLength(0);
  });

  it("says so when the change can't be saved", async () => {
    backend(profile(), on("PUT", PRIORITY_PATH, { detail: "Server error" }, 500));
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "Priority: Normal. Change it" }),
    );
    await userEvent.click(screen.getByRole("menuitemradio", { name: /^Low/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't change the priority. Try again.",
    );
    expect(screen.getByRole("button", { name: "Priority: Normal. Change it" })).toBeVisible();
  });

  it("shows the Priority without a menu to someone who can't change it", async () => {
    backend(profile({ ...PROFILE, priority: "low", can_set_priority: false }));
    renderPage(FRONT_DESK);

    expect(await screen.findByText("Low")).toBeVisible();
    expect(screen.getByText("Priority")).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Priority:/ })).toBeNull();
  });

  it("shows a priority change in Activity", async () => {
    backend(
      profile(),
      on("GET", `/api/students/${uid(7)}/visits/?page=1`, {
        count: 0,
        page: 1,
        page_size: 50,
        results: [],
      }),
      on("GET", `/api/students/${uid(7)}/history/`, {
        count: 1,
        page: 1,
        page_size: 50,
        results: [
          {
            id: uid(90),
            kind: "priority_changed",
            at: "2026-11-23T10:00:00+05:45",
            by: { name: "Bikash Thapa", is_platform_admin: false },
            before: "Normal",
            after: "High",
            detail: "",
          },
        ],
      }),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    expect(await screen.findByText("Priority changed from Normal to High")).toBeInTheDocument();
  });
});
