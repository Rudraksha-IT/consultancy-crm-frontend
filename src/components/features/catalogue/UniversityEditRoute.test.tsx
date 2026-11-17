import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";
import { consultancySummary } from "@/test/consultancy";

import { UniversityEditRoute } from "./UniversityEditRoute";

const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Asha Admin", email: "asha@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["catalogue"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const NURSING = {
  id: 11,
  university_id: 1,
  name: "Bachelor of Nursing",
  level: "bachelor",
  intakes: ["2027-02"],
  archived: false,
  documents: [{ id: 21, name: "Work Reference" }],
  applications: 3,
};
const OLD = {
  ...NURSING,
  id: 12,
  name: "Diploma of Old Things",
  level: "diploma",
  intakes: [],
  archived: true,
  documents: [],
  applications: 0,
};
const USED_OLD = { ...OLD, id: 13, name: "Master of Used Things", applications: 2 };
const DEAKIN = {
  id: 1,
  name: "Deakin University",
  country: "australia",
  archived: false,
  courses: [NURSING, OLD],
};
const TYPES = [
  { id: 21, name: "Work Reference", needed_by_everyone: false, usual_group: "applying" },
  { id: 22, name: "Passport", needed_by_everyone: true, usual_group: "applying" },
  { id: 23, name: "Statement of Purpose", needed_by_everyone: false, usual_group: "statements" },
];
const ONE = "/api/catalogue/universities/1/";

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

const stored =
  (body: unknown = DEAKIN, status = 200): Answer =>
  (path, init) =>
    method(init) === "GET" && path === ONE ? jsonResponse(body, status) : undefined;
const types: Answer = (path, init) =>
  method(init) === "GET" && path === "/api/documents/types/"
    ? jsonResponse({ results: TYPES })
    : undefined;
const saving =
  (body: unknown = DEAKIN, status = 200): Answer =>
  (path, init) =>
    method(init) === "PUT" && path === ONE ? jsonResponse(body, status) : undefined;
const deleting =
  (response: Response = new Response(null, { status: 204 })): Answer =>
  (path, init) =>
    method(init) === "DELETE" && path === ONE ? response : undefined;

function sent(fetchFn: ReturnType<typeof backend>, verb: string): unknown {
  const [, init] = fetchFn.mock.calls.find(([, given]) => method(given) === verb) ?? [];
  const body = init?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function calls(fetchFn: ReturnType<typeof backend>, verb: string): number {
  return fetchFn.mock.calls.filter(([, given]) => method(given) === verb).length;
}

function renderPage(context: StaffContext = ADMIN, idText = "1") {
  render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <UniversityEditRoute idText={idText} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function opened(): Promise<void> {
  await screen.findByRole("heading", { level: 1, name: "Edit Deakin University" });
}

function course(name: string, index = 0): HTMLElement {
  const found = screen.getAllByRole("listitem", { name })[index];
  if (found === undefined) throw new Error(`No course ${name}`);
  return found;
}

function save(): Promise<void> {
  return userEvent.click(screen.getByRole("button", { name: "Save all changes" }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 16));
  router.push.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a university's edit page", () => {
  it("shows the university and every course with what is stored", async () => {
    backend(stored(), types);
    renderPage();
    await opened();

    expect(
      screen.getByText(
        "The university, every course and every intake on one page. Nothing is saved until you press Save.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Deakin University");
    expect(screen.getByLabelText("Country")).toHaveValue("australia");
    const nursing = course("Bachelor of Nursing");
    expect(within(nursing).getByLabelText("Course name")).toHaveValue("Bachelor of Nursing");
    expect(within(nursing).getByLabelText("Level")).toHaveValue("bachelor");
    expect(within(nursing).getByRole("button", { name: "Feb 2027" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await within(nursing).findByRole("checkbox", { name: "Work Reference" })).toBeChecked();
    expect(within(nursing).queryByRole("checkbox", { name: "Passport" })).toBeNull();
    expect(within(course("Diploma of Old Things")).getByText("Archived")).toBeInTheDocument();
  });

  it("saves the university and every course in one go, then goes back to the Catalogue", async () => {
    const fetchFn = backend(stored(), types, saving());
    renderPage();
    await opened();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const nursing = course("Bachelor of Nursing");

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Deakin University Melbourne");
    await user.click(within(nursing).getByRole("button", { name: "Jul 2027" }));
    await user.click(
      await within(nursing).findByRole("checkbox", { name: "Statement of Purpose" }),
    );
    await user.click(screen.getByRole("button", { name: "Add a course" }));
    const added = course("New course");
    await user.type(within(added).getByLabelText("Course name"), "Master of IT");
    await user.selectOptions(within(added).getByLabelText("Level"), "master");
    await user.click(within(added).getByRole("button", { name: "Next year" }));
    await user.click(within(added).getByRole("button", { name: "Mar 2027" }));
    await save();

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/catalogue");
    });
    expect(sent(fetchFn, "PUT")).toEqual({
      name: "Deakin University Melbourne",
      country: "australia",
      archived: false,
      courses: [
        {
          id: 11,
          name: "Bachelor of Nursing",
          level: "bachelor",
          intakes: ["2027-02", "2027-07"],
          archived: false,
          documents: [21, 23],
        },
        {
          id: 12,
          name: "Diploma of Old Things",
          level: "diploma",
          intakes: [],
          archived: true,
          documents: [],
        },
        {
          name: "Master of IT",
          level: "master",
          intakes: ["2027-03"],
          archived: false,
          documents: [],
        },
      ],
      deleted_courses: [],
    });
    expect(await screen.findByText("Deakin University saved")).toBeInTheDocument();
  });

  it("archives and restores on Save only", async () => {
    const fetchFn = backend(stored(), types, saving());
    renderPage();
    await opened();

    await userEvent.click(screen.getByRole("button", { name: "Archive university" }));
    await userEvent.click(
      within(course("Bachelor of Nursing")).getByRole("button", { name: "Archive course" }),
    );
    await userEvent.click(
      within(course("Diploma of Old Things")).getByRole("button", { name: "Restore course" }),
    );
    expect(screen.getByText("Archived: hidden when adding applications.")).toBeInTheDocument();
    expect(calls(fetchFn, "PUT")).toBe(0);
    // A restored course needs an intake again.
    await save();
    const old = course("Diploma of Old Things");
    expect(
      within(old).getByText("Add at least one intake, or archive the course."),
    ).toBeInTheDocument();
    expect(calls(fetchFn, "PUT")).toBe(0);
    await userEvent.click(within(old).getByRole("button", { name: "Dec 2026" }));
    await save();

    await waitFor(() => {
      expect(sent(fetchFn, "PUT")).toMatchObject({
        archived: true,
        courses: [
          { id: 11, archived: true },
          { id: 12, archived: false },
        ],
      });
    });
  });

  it("checks names and intakes before sending, and moves the cursor to the first", async () => {
    const fetchFn = backend(stored(), types);
    renderPage();
    await opened();
    const nursing = course("Bachelor of Nursing");

    await userEvent.clear(within(nursing).getByLabelText("Course name"));
    await userEvent.click(screen.getByRole("button", { name: "Add a course" }));
    await save();

    expect(
      screen.getByText("Some details need fixing. They are marked below."),
    ).toBeInTheDocument();
    const [first] = screen.getAllByText("Enter the course's name.");
    expect(first).toBeInTheDocument();
    expect(screen.getByText("Add at least one intake, or archive the course.")).toBeInTheDocument();
    await waitFor(() => {
      expect(within(course("New course", 0)).getByLabelText("Course name")).toHaveFocus();
    });
    expect(calls(fetchFn, "PUT")).toBe(0);
  });

  it("matches the server's refusal to the right course when one is being deleted", async () => {
    backend(
      stored({ ...DEAKIN, archived: false, courses: [OLD, NURSING] }),
      types,
      saving(
        { courses: { "0": { name: ["This university already has a course with this name."] } } },
        400,
      ),
    );
    renderPage();
    await opened();

    await userEvent.click(
      within(course("Diploma of Old Things")).getByRole("button", { name: "Delete course" }),
    );
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete course" }),
    );
    await save();

    expect(
      await within(course("Bachelor of Nursing")).findByText(
        "This university already has a course with this name.",
      ),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows a refusal that isn't about one field in the banner", async () => {
    backend(
      stored(),
      types,
      saving({ deleted_courses: ["Used by 1 application, so it stays archived."] }, 400),
    );
    renderPage();
    await opened();

    await save();

    expect(
      await screen.findByText(
        "Some details need fixing. They are marked below. Used by 1 application, so it stays archived.",
      ),
    ).toBeInTheDocument();
  });

  it("says when saving failed for another reason", async () => {
    backend(stored(), types, saving({}, 500));
    renderPage();
    await opened();

    await save();

    expect(
      await screen.findByText("We couldn't save the change. Please try again."),
    ).toBeInTheDocument();
  });
});

describe("deleting courses", () => {
  it("deletes an archived course nobody uses on Save, with Undo until then", async () => {
    const fetchFn = backend(stored(), types, saving());
    renderPage();
    await opened();
    const old = course("Diploma of Old Things");

    await userEvent.click(within(old).getByRole("button", { name: "Delete course" }));
    const confirm = screen.getByRole("dialog", { name: "Delete Diploma of Old Things?" });
    expect(
      within(confirm).getByText(
        "It is removed from the Catalogue for good when you save. No application uses it.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete course" }));
    expect(within(old).getByText("Will be deleted when you save.")).toBeInTheDocument();
    expect(within(old).getByLabelText("Course name")).toBeDisabled();
    await userEvent.click(within(old).getByRole("button", { name: "Undo" }));
    expect(within(old).getByLabelText("Course name")).toBeEnabled();
    await userEvent.click(within(old).getByRole("button", { name: "Delete course" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete course" }),
    );
    await save();

    await waitFor(() => {
      expect(sent(fetchFn, "PUT")).toMatchObject({ courses: [{ id: 11 }], deleted_courses: [12] });
    });
  });

  it("offers Delete only once a course is saved as archived", async () => {
    backend(stored(), types);
    renderPage();
    await opened();
    const nursing = course("Bachelor of Nursing");

    await userEvent.click(within(nursing).getByRole("button", { name: "Archive course" }));

    expect(within(nursing).queryByRole("button", { name: "Delete course" })).toBeNull();
  });

  it("keeps a course an application uses, and says why", async () => {
    backend(stored({ ...DEAKIN, courses: [NURSING, USED_OLD] }), types);
    renderPage();
    await opened();
    const used = course("Master of Used Things");

    expect(within(used).getByRole("button", { name: "Delete course" })).toBeDisabled();
    expect(
      within(used).getByText("Used by 2 applications, so it stays archived."),
    ).toBeInTheDocument();
  });

  it("takes a course added on the page off again with Remove", async () => {
    backend(stored(), types);
    renderPage();
    await opened();

    await userEvent.click(screen.getByRole("button", { name: "Add a course" }));
    await userEvent.click(within(course("New course")).getByRole("button", { name: "Remove" }));

    expect(screen.queryByRole("listitem", { name: "New course" })).toBeNull();
  });
});

describe("deleting the university", () => {
  const ARCHIVED = { ...DEAKIN, archived: true, courses: [OLD] };

  it("is offered only once it is saved as archived", async () => {
    backend(stored(), types);
    renderPage();
    await opened();

    await userEvent.click(screen.getByRole("button", { name: "Archive university" }));

    expect(screen.queryByRole("button", { name: "Delete university" })).toBeNull();
  });

  it("deletes it and its courses after asking, then goes back to the Catalogue", async () => {
    const fetchFn = backend(stored(ARCHIVED), types, deleting());
    renderPage();
    await opened();

    await userEvent.click(screen.getByRole("button", { name: "Delete university" }));
    const confirm = screen.getByRole("dialog", { name: "Delete Deakin University?" });
    expect(
      within(confirm).getByText(
        "It and its 1 course are removed from the Catalogue for good. No application uses them. Unsaved changes on this page are dropped.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete university" }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/catalogue");
    });
    expect(calls(fetchFn, "DELETE")).toBe(1);
    expect(await screen.findByText("Deakin University deleted")).toBeInTheDocument();
  });

  it("shows the server's reason it stays", async () => {
    backend(
      stored(ARCHIVED),
      types,
      deleting(jsonResponse({ detail: "Used by 1 commission, so it stays archived." }, 400)),
    );
    renderPage();
    await opened();

    await userEvent.click(screen.getByRole("button", { name: "Delete university" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete university" }),
    );

    expect(
      await screen.findByText("Used by 1 commission, so it stays archived."),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("can't be deleted while an application uses a course", async () => {
    backend(stored({ ...ARCHIVED, courses: [USED_OLD] }), types);
    renderPage();
    await opened();

    const university = screen.getByRole("region", { name: "University" });
    expect(within(university).getByRole("button", { name: "Delete university" })).toBeDisabled();
    expect(
      within(university).getByText("Used by 2 applications, so it stays archived."),
    ).toBeInTheDocument();
  });
});

describe("leaving and access", () => {
  it("goes straight back on Cancel when nothing was changed", async () => {
    backend(stored(), types);
    renderPage();
    await opened();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(router.push).toHaveBeenCalledWith("/catalogue");
  });

  it("asks before leaving with unsaved changes", async () => {
    backend(stored(), types);
    renderPage();
    await opened();

    await userEvent.type(screen.getByLabelText("Name"), " Melbourne");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const confirm = screen.getByRole("dialog", { name: "Leave without saving?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Keep editing" }));
    expect(router.push).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Leave without saving" }));

    expect(router.push).toHaveBeenCalledWith("/catalogue");
  });

  it.each(["counsellor", "front_desk", "teacher"] as const)(
    "is only for Admins, not a %s",
    async (role) => {
      const fetchFn = backend(stored(), types);
      renderPage({ ...ADMIN, staff: { ...ADMIN.staff, role } });

      expect(
        await screen.findByText("Only an Admin can change the Catalogue."),
      ).toBeInTheDocument();
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );

  it("finds nothing for an address that isn't an id, without asking the server", async () => {
    const fetchFn = backend();
    renderPage(ADMIN, "1;drop");

    expect(await screen.findByText("This university isn't in the Catalogue.")).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("says when the university is not found", async () => {
    backend(stored({ detail: "Not found." }, 404));
    renderPage();

    expect(await screen.findByText("This university isn't in the Catalogue.")).toBeInTheDocument();
  });

  it("shows typed names as text, never as markup", async () => {
    backend(stored({ ...DEAKIN, name: "<img src=x onerror=alert(1)>", courses: [] }), types);
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Edit <img src=x onerror=alert(1)>" }),
    ).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
