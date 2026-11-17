import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { todayIso } from "@/lib/dates";
import { ageOn } from "@/lib/students";
import { DEFAULT_THEME } from "@/lib/theme";
import { consultancySummary } from "@/test/consultancy";
import { PROFILE } from "@/test/studentProfile";

import { StudentProfilePage } from "./StudentProfilePage";

const COUNSELLOR: StaffContext = {
  staff: { id: 5, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const EMPTY_ADDRESS = { province: "", district: "", municipality: "", ward: null, street: "" };

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

function profile(body: object = PROFILE): Answer {
  return (path, init) =>
    method(init) === "GET" && path === "/api/students/7/" ? jsonResponse(body) : undefined;
}

async function renderOnProfileTab(context: StaffContext = COUNSELLOR): Promise<void> {
  render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <StudentProfilePage studentId={7} />
      </ToastProvider>
    </StaffContextContext>,
  );
  await userEvent.click(await screen.findByRole("tab", { name: "Profile" }));
}

function section(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

function valueOf(where: HTMLElement, label: string): Element | null {
  return within(where).getByText(label, { selector: "dt" }).nextElementSibling;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Profile tab sections", () => {
  it("shows every section's details", async () => {
    backend(profile());
    await renderOnProfileTab();

    const personal = section("Personal");
    const age = ageOn("2003-04-12", todayIso());
    expect(valueOf(personal, "Date of birth")).toHaveTextContent(
      `12 Apr 2003 (${String(age)} years old)`,
    );
    expect(valueOf(personal, "Gender")).toHaveTextContent("Female");
    expect(valueOf(personal, "Marital status")).toHaveTextContent("Single");
    expect(valueOf(personal, "Nationality")).toHaveTextContent("Nepali");
    expect(valueOf(section("Family"), "Guardian")).toHaveTextContent(
      "Hari Prasad Gurung (Father)9846012345",
    );
    const passport = section("Passport");
    expect(valueOf(passport, "Number")).toHaveTextContent("PA1234567");
    expect(valueOf(passport, "Place of issue")).toHaveTextContent("Kaski");
    expect(valueOf(passport, "Expires on")).toHaveTextContent("10 Mar 2037");
    const addresses = section("Addresses");
    expect(valueOf(addresses, "Permanent")).toHaveTextContent(
      "Lakeside, Ward 6, Pokhara Metropolitan City, Kaski, Gandaki Province",
    );
    expect(valueOf(addresses, "Mailing")).toHaveTextContent("Same as permanent");
    expect(valueOf(section("Plans"), "Target level")).toHaveTextContent("Master");
    const work = section("Work experience");
    expect(within(work).getByText("Staff nurse")).toBeInTheDocument();
    expect(within(work).getByText("Bir Hospital")).toBeInTheDocument();
    expect(within(work).getByText("Apr 2024 to now, still working here")).toBeInTheDocument();
  });

  it("shows dashes for details not given, and the mailing address when it differs", async () => {
    backend(
      profile({
        ...PROFILE,
        gender: "",
        guardian_name: "",
        mailing_same_as_permanent: false,
        mailing_address: { ...EMPTY_ADDRESS, district: "Kathmandu", ward: 4 },
        permanent_address: EMPTY_ADDRESS,
      }),
    );
    await renderOnProfileTab();

    expect(valueOf(section("Personal"), "Gender")).toHaveTextContent("—");
    expect(valueOf(section("Family"), "Guardian")).toHaveTextContent("—");
    expect(valueOf(section("Addresses"), "Permanent")).toHaveTextContent("—");
    expect(valueOf(section("Addresses"), "Mailing")).toHaveTextContent("Ward 4, Kathmandu");
  });

  it("only shows: no Edit, Add, Change or Remove anywhere, even for their counsellor", async () => {
    backend(profile());
    await renderOnProfileTab();

    await screen.findByRole("region", { name: "Personal" });
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Add a / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^(Change|Remove) / })).toBeNull();
    expect(screen.getByRole("link", { name: "Edit details" })).toHaveAttribute(
      "href",
      "/students/7/edit",
    );
  });

  it("offers no Edit details to someone who may not edit the details", async () => {
    backend(profile({ ...PROFILE, can_change: false, can_edit_details: false }));
    await renderOnProfileTab();

    await screen.findByRole("region", { name: "Personal" });
    expect(screen.queryByRole("link", { name: "Edit details" })).toBeNull();
  });
});

describe("the passport warning", () => {
  it.each([
    ["expires_soon", "Passport expires on 10 Mar 2027"],
    ["expired", "Passport expired on 10 Mar 2027"],
  ])(
    "shows %s in the header and the Passport section, with a word and an icon",
    async (warning, text) => {
      backend(
        profile({ ...PROFILE, passport_expiry_date: "2027-03-10", passport_warning: warning }),
      );
      await renderOnProfileTab();

      const chip = await screen.findByText(text, { selector: "span" });
      expect(chip.querySelector("svg")).not.toBeNull();
      expect(within(section("Passport")).getByRole("status")).toHaveTextContent(
        `${text}. Renew it before applying or lodging a visa.`,
      );
    },
  );

  it("is not shown when the passport is fine", async () => {
    backend(profile());
    await renderOnProfileTab();

    await screen.findByRole("region", { name: "Passport" });
    expect(screen.queryByText(/Passport expire/)).toBeNull();
  });
});

describe("work experience", () => {
  it("shows each job with its dates", async () => {
    backend(profile());
    await renderOnProfileTab();

    expect(
      await within(await screen.findByRole("region", { name: "Work experience" })).findByText(
        /Staff nurse/,
      ),
    ).toBeVisible();
  });

  it("invites adding the job Front Desk noted when there are none", async () => {
    backend(profile({ ...PROFILE, work_experience: [], previous_job: "Accountant, 2 years" }));
    await renderOnProfileTab();

    expect(
      await screen.findByText(
        "Front desk noted: Accountant, 2 years. Add it as a job to keep the dates.",
      ),
    ).toBeInTheDocument();
  });
});
