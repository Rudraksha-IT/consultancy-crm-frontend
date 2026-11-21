import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccountsPage } from "@/components/features/accounts/AccountsPage";
import { HomePage } from "@/components/features/home/HomePage";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Sunita Shrestha", email: "sunita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "payments", "accounts"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const OWING_URL = "/api/accounts/student-fees/?page=1";
/** The Admin's Home leaves Lost Students out, as Fees by type does. */
const HOME_OWING_URL = "/api/accounts/student-fees/?page=1&leave_out=lost";
const LIST_URL = "/api/accounts/commission/";
const PAGE_URL = "/api/accounts/commission/?page=1";
const STATUS_URL = `/api/accounts/commission/${uid(702)}/status/`;
const CATALOGUE_URL = "/api/catalogue/universities/";
const SEARCH_SITA = "/api/students/?q=Sita";
const PAYMENTS_URL = "/api/payments/?from=2026-11-01&to=2026-11-03&page=1";
const RECEIVED_THIS_MONTH = "/api/accounts/commission/received/?from=2026-11-01&to=2026-11-03";
const MONEY_OUT = "/api/accounts/expenses/?page=1";

const WAITING = {
  id: uid(703),
  student: { id: uid(1), name: "Aarav Sharma" },
  university: { id: uid(3), name: "Federation University" },
  intake: "2027-03",
  amount: 260000,
  status: "waiting_for_enrolment",
  received_on: null,
};
const CLAIMED = {
  ...WAITING,
  id: uid(702),
  student: { id: uid(2), name: "Sita Karki" },
  university: { id: uid(6), name: "RMIT University" },
  intake: "2027-02",
  amount: 290000,
  status: "claim_sent",
};
const RECEIVED = {
  ...WAITING,
  id: uid(701),
  student: { id: uid(4), name: "Hari Lama" },
  intake: "2027-01",
  amount: 340000,
  status: "received",
  received_on: "2026-10-20",
};

function pageOf(results: unknown[]) {
  return {
    count: results.length,
    page: 1,
    page_size: 25,
    totals: {
      waiting_for_enrolment: 260000,
      claim_sent: 290000,
      received: 340000,
      to_come: 550000,
    },
    results,
  };
}

const PAGE = pageOf([WAITING, CLAIMED, RECEIVED]);
const NO_COMMISSION = {
  ...pageOf([]),
  totals: { waiting_for_enrolment: 0, claim_sent: 0, received: 0, to_come: 0 },
};

const CATALOGUE = {
  count: 2,
  page: 1,
  page_size: 25,
  results: [
    {
      id: uid(3),
      name: "Federation University",
      country: "australia",
      archived: false,
      documents: [],
      courses: [
        {
          id: uid(4),
          university_id: uid(3),
          name: "Master of IT",
          level: "master",
          intakes: ["2027-07", "2027-03"],
          archived: false,
          documents: [],
          applications: 0,
          files: [],
          file_count: 0,
        },
        {
          id: uid(5),
          university_id: uid(3),
          name: "Bachelor of Nursing",
          level: "bachelor",
          intakes: ["2027-03"],
          archived: false,
          documents: [],
          applications: 0,
          files: [],
          file_count: 0,
        },
      ],
    },
    {
      id: uid(6),
      name: "RMIT University",
      country: "australia",
      archived: false,
      documents: [],
      courses: [
        {
          id: uid(9),
          university_id: uid(6),
          name: "Master of Data Science",
          level: "master",
          intakes: ["2027-02"],
          archived: false,
          documents: [],
          applications: 0,
          files: [],
          file_count: 0,
        },
      ],
    },
  ],
};

const SITA = {
  id: uid(2),
  name: "Sita Karki",
  phone: "9841000001",
  email: "",
  country: "australia",
  source: "walk_in",
  stage: "applying",
  assigned_counsellor: null,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-03T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function withProviders(page: React.ReactNode) {
  return render(
    <StaffContextContext value={ADMIN}>
      <ToastProvider>{page}</ToastProvider>
    </StaffContextContext>,
  );
}

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const [call] = callsTo(fetchFn, verb, path);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function tile(label: string): HTMLElement {
  const tileElement = screen.getByText(label, { selector: "span" }).parentElement;
  if (tileElement === null) throw new Error(`No tile for ${label}`);
  return tileElement;
}

async function openCommission() {
  withProviders(<AccountsPage />);
  await userEvent.click(screen.getByRole("button", { name: "Commission" }));
}

async function openAddDialog() {
  const [button] = await screen.findAllByRole("button", { name: "Add commission" });
  if (button === undefined) throw new Error("No Add commission button");
  await userEvent.click(button);
  return screen.getByRole("dialog", { name: "Add commission" });
}

describe("Accounts -> Commission", () => {
  it("shows the totals by status, then each Student's commission with its status", async () => {
    backend(on("GET", OWING_URL, pageOf([])), on("GET", PAGE_URL, PAGE));
    await openCommission();

    expect(await screen.findByText("Commission by Student")).toBeInTheDocument();
    expect(within(tile("Waiting for enrolment")).getByText("NPR 2,60,000")).toBeInTheDocument();
    expect(within(tile("Claim sent")).getByText("NPR 2,90,000")).toHaveClass("text-warn");
    expect(within(tile("Received")).getByText("NPR 3,40,000")).toHaveClass("text-good");
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(4);
    const sita = rows[2];
    if (sita === undefined) throw new Error("No row for Sita");
    expect(within(sita).getByRole("link", { name: "Sita Karki" })).toHaveAttribute(
      "href",
      `/students/${uid(2)}`,
    );
    expect(within(sita).getByText("Intake Feb 2027")).toBeInTheDocument();
    expect(within(sita).getByText("RMIT University")).toBeInTheDocument();
    expect(within(sita).getByText("NPR 2,90,000")).toBeInTheDocument();
    expect(
      within(sita).getByRole("combobox", { name: "Commission status for Sita Karki" }),
    ).toHaveValue("claim_sent");
    expect(screen.getByText("Received 20 Oct 2026")).toBeInTheDocument();
    expect(
      screen.getByText("Amounts are converted to NPR when the claim is sent."),
    ).toBeInTheDocument();
  });

  it("says when there is none yet", async () => {
    backend(on("GET", OWING_URL, pageOf([])), on("GET", PAGE_URL, NO_COMMISSION));
    await openCommission();

    expect(await screen.findByText("No commission recorded yet.")).toBeInTheDocument();
  });

  it("says when it can't be loaded", async () => {
    backend(on("GET", OWING_URL, pageOf([])));
    await openCommission();

    expect(
      await screen.findByText("We couldn't load the commission. Please refresh the page."),
    ).toBeInTheDocument();
  });

  it("marks commission Received and loads the totals again", async () => {
    let isReceived = false;
    const fetchFn = backend(
      on("GET", OWING_URL, pageOf([])),
      onEach("GET", PAGE_URL, () =>
        isReceived
          ? {
              ...pageOf([WAITING, { ...CLAIMED, status: "received", received_on: "2026-11-03" }]),
              totals: {
                waiting_for_enrolment: 260000,
                claim_sent: 0,
                received: 630000,
                to_come: 260000,
              },
            }
          : PAGE,
      ),
      (path, init) => {
        if (path !== STATUS_URL || init?.method !== "PUT") return undefined;
        isReceived = true;
        return on("PUT", STATUS_URL, { ...CLAIMED, status: "received" })(path, init);
      },
    );
    await openCommission();

    await userEvent.selectOptions(
      await screen.findByRole("combobox", { name: "Commission status for Sita Karki" }),
      "Received",
    );

    expect(await screen.findByText("Commission marked Received")).toBeInTheDocument();
    expect(sentBody(fetchFn, "PUT", STATUS_URL)).toEqual({ status: "received" });
    expect(await screen.findByText("NPR 6,30,000")).toBeInTheDocument();
    expect(screen.getByText("Received 3 Nov 2026")).toBeInTheDocument();
  });

  it("says when a status can't be changed, and keeps the old one", async () => {
    backend(on("GET", OWING_URL, pageOf([])), on("GET", PAGE_URL, PAGE));
    await openCommission();

    const picker = await screen.findByRole("combobox", {
      name: "Commission status for Sita Karki",
    });
    await userEvent.selectOptions(picker, "Received");

    expect(
      await screen.findByText("We couldn't change the status. Please try again."),
    ).toBeInTheDocument();
    expect(picker).toHaveValue("claim_sent");
  });

  it("shows typed HTML as text", async () => {
    const odd = { ...WAITING, student: { id: uid(1), name: "<b>Aarav</b>" } };
    backend(on("GET", OWING_URL, pageOf([])), on("GET", PAGE_URL, pageOf([odd])));
    await openCommission();

    expect(await screen.findByRole("link", { name: "<b>Aarav</b>" })).toBeInTheDocument();
    expect(document.querySelector("main b, table b")).toBeNull();
  });
});

describe("adding commission", () => {
  it("picks a Student, a University and one of its intakes, then saves", async () => {
    let isAdded = false;
    const fetchFn = backend(
      on("GET", OWING_URL, pageOf([])),
      onEach("GET", PAGE_URL, () => (isAdded ? pageOf([CLAIMED]) : NO_COMMISSION)),
      on("GET", CATALOGUE_URL, CATALOGUE),
      on("GET", SEARCH_SITA, { count: 1, page: 1, page_size: 25, results: [SITA] }),
      (path, init) => {
        if (path !== LIST_URL || init?.method !== "POST") return undefined;
        isAdded = true;
        return on("POST", LIST_URL, CLAIMED, 201)(path, init);
      },
    );
    await openCommission();
    const dialog = await openAddDialog();

    expect(within(dialog).getByLabelText("Find a Student")).toHaveFocus();
    await userEvent.type(within(dialog).getByLabelText("Find a Student"), "Sita");
    await within(dialog).findByRole("option", { name: "Sita Karki" });
    await userEvent.selectOptions(within(dialog).getByLabelText("Student"), "Sita Karki");
    await userEvent.selectOptions(
      await within(dialog).findByLabelText("University"),
      "Federation University",
    );
    const intakes = within(within(dialog).getByLabelText("Intake")).getAllByRole("option");
    expect(intakes.map((option) => option.textContent)).toEqual([
      "Choose an intake",
      "Mar 2027",
      "Jul 2027",
    ]);
    await userEvent.selectOptions(within(dialog).getByLabelText("Intake"), "Jul 2027");
    await userEvent.type(within(dialog).getByLabelText("Expected amount (NPR)"), "290000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Commission added")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", LIST_URL)).toEqual({
      student: uid(2),
      university: uid(3),
      intake: "2027-07",
      amount: 290000,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Sita Karki" })).toBeInTheDocument();
  });

  it("changing the University clears the intake", async () => {
    backend(
      on("GET", OWING_URL, pageOf([])),
      on("GET", PAGE_URL, NO_COMMISSION),
      on("GET", CATALOGUE_URL, CATALOGUE),
    );
    await openCommission();
    const dialog = await openAddDialog();

    await userEvent.selectOptions(
      await within(dialog).findByLabelText("University"),
      "Federation University",
    );
    await userEvent.selectOptions(within(dialog).getByLabelText("Intake"), "Mar 2027");
    await userEvent.selectOptions(within(dialog).getByLabelText("University"), "RMIT University");

    expect(within(dialog).getByLabelText("Intake")).toHaveValue("");
  });

  it("checks every field before sending anything", async () => {
    const fetchFn = backend(
      on("GET", OWING_URL, pageOf([])),
      on("GET", PAGE_URL, NO_COMMISSION),
      on("GET", CATALOGUE_URL, CATALOGUE),
    );
    await openCommission();
    const dialog = await openAddDialog();
    await within(dialog).findByLabelText("University");

    await userEvent.type(within(dialog).getByLabelText("Expected amount (NPR)"), "0");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText("Choose a Student.")).toBeInTheDocument();
    expect(within(dialog).getByText("Choose a University from the Catalogue.")).toBeInTheDocument();
    expect(within(dialog).getByText("Choose a month and year from 2000 on.")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Enter a whole amount from NPR 1 to NPR 10,00,00,000."),
    ).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", LIST_URL)).toHaveLength(0);
  });

  it("shows the server's refusal beside the field, and a 403 as a message", async () => {
    backend(
      on("GET", OWING_URL, pageOf([])),
      on("GET", PAGE_URL, NO_COMMISSION),
      on("GET", CATALOGUE_URL, CATALOGUE),
      on("GET", SEARCH_SITA, { count: 1, page: 1, page_size: 25, results: [SITA] }),
      on("POST", LIST_URL, { student: ["Choose a Student."] }, 400),
    );
    await openCommission();
    const dialog = await openAddDialog();
    await userEvent.type(within(dialog).getByLabelText("Find a Student"), "Sita");
    await within(dialog).findByRole("option", { name: "Sita Karki" });
    await userEvent.selectOptions(within(dialog).getByLabelText("Student"), "Sita Karki");
    await userEvent.selectOptions(
      await within(dialog).findByLabelText("University"),
      "RMIT University",
    );
    await userEvent.selectOptions(within(dialog).getByLabelText("Intake"), "Feb 2027");
    await userEvent.type(within(dialog).getByLabelText("Expected amount (NPR)"), "1");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText("Choose a Student.")).toBeInTheDocument();
  });

  it("says when the Catalogue can't be loaded", async () => {
    backend(on("GET", OWING_URL, pageOf([])), on("GET", PAGE_URL, NO_COMMISSION));
    await openCommission();
    const dialog = await openAddDialog();

    expect(
      await within(dialog).findByText("We couldn't load the Catalogue. Please try again."),
    ).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    backend(
      on("GET", OWING_URL, pageOf([])),
      on("GET", PAGE_URL, NO_COMMISSION),
      on("GET", CATALOGUE_URL, CATALOGUE),
    );
    await openCommission();
    await openAddDialog();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Received commission in Money in", () => {
  it("adds received commission to the payments for the same days", async () => {
    backend(
      on("GET", OWING_URL, pageOf([])),
      on("GET", PAYMENTS_URL, { count: 3, page: 1, page_size: 25, total: 58000, results: [] }),
      on("GET", RECEIVED_THIS_MONTH, { total: 340000, count: 1 }),
    );
    withProviders(<AccountsPage />);
    await userEvent.click(screen.getByRole("button", { name: "Money in" }));

    expect(await screen.findByText("From university commission")).toBeInTheDocument();
    expect(
      within(tile("From university commission")).getByText("NPR 3,40,000"),
    ).toBeInTheDocument();
    expect(
      within(tile("From university commission")).getByText("1 commission received"),
    ).toBeInTheDocument();
    expect(within(tile("Total money in")).getByText("NPR 3,98,000")).toHaveClass("text-good");
  });
});

describe("Commission on the Admin's Home", () => {
  it("shows the commission to come, money in with commission, and the profit", async () => {
    backend(
      on("GET", HOME_OWING_URL, {
        count: 0,
        page: 1,
        page_size: 25,
        totals: { agreed: 0, collected: 0, still_to_collect: 0, students: 0, owing: 0 },
        results: [],
      }),
      on("GET", PAYMENTS_URL, { count: 3, page: 1, page_size: 25, total: 58000, results: [] }),
      on("GET", RECEIVED_THIS_MONTH, { total: 340000, count: 1 }),
      on("GET", MONEY_OUT, {
        month: "2026-11",
        total: 98000,
        count: 2,
        page: 1,
        page_size: 50,
        by_category: [],
        results: [],
      }),
      on("GET", PAGE_URL, PAGE),
    );
    withProviders(<HomePage />);

    const glance = await screen.findByRole("region", { name: "This month at a glance" });
    expect(await within(glance).findByText("NPR 3,00,000")).toHaveClass("text-good");
    expect(within(glance).getByText("Profit this month")).toBeInTheDocument();
    expect(within(glance).getByText("NPR 3,98,000")).toBeInTheDocument();
    expect(
      within(glance).getByText("NPR 58,000 from Students, NPR 3,40,000 commission"),
    ).toBeInTheDocument();
    expect(within(glance).getByText("Commission to come")).toBeInTheDocument();
    expect(within(glance).getByText("NPR 5,50,000")).toBeInTheDocument();
  });

  it("calls a month that spent more than it took in a loss", async () => {
    backend(
      on("GET", HOME_OWING_URL, {
        count: 0,
        page: 1,
        page_size: 25,
        totals: { agreed: 0, collected: 0, still_to_collect: 0, students: 0, owing: 0 },
        results: [],
      }),
      on("GET", PAYMENTS_URL, { count: 0, page: 1, page_size: 25, total: 0, results: [] }),
      on("GET", RECEIVED_THIS_MONTH, { total: 0, count: 0 }),
      on("GET", MONEY_OUT, {
        month: "2026-11",
        total: 5000,
        count: 1,
        page: 1,
        page_size: 50,
        by_category: [],
        results: [],
      }),
      on("GET", PAGE_URL, NO_COMMISSION),
    );
    withProviders(<HomePage />);

    const glance = await screen.findByRole("region", { name: "This month at a glance" });
    expect(await within(glance).findByText("Loss this month")).toBeInTheDocument();
    expect(within(tile("Loss this month")).getByText("NPR 5,000")).toHaveClass("text-bad");
  });
});

describe.each(THEME_CASES)("Commission in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows the commission list", async () => {
    backend(on("GET", OWING_URL, pageOf([])), on("GET", PAGE_URL, PAGE));
    await openCommission();

    expect(await screen.findByRole("link", { name: "Sita Karki" })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe(mode);
  });
});
