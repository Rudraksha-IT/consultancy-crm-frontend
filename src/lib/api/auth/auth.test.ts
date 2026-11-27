import { uid } from "@/test/ids";
import { fetchStaffContext, logIn, logOut } from "./auth";
import {
  ApiRequestError,
  InvalidCredentialsError,
  NotLoggedInError,
  TooManyPasswordTriesError,
} from "../core/errors";
import { jsonResponse } from "../core/test-helpers";
import { NO_OFFICE_DETAILS } from "../core/types";

const CONTEXT = {
  staff: {
    id: uid(1),
    name: "Sita Sharma",
    email: "sita@acme.test",
    role: "counsellor",
    colour_mode: "light",
  },
  consultancy: {
    name: "Acme Education",
    logo: null,
    status: "evaluation",
    status_message: null,
    evaluation_ends_at: "2026-11-18T03:15:00Z",
    office_details: {
      contact_email: "info@acme.test",
      phone: "01-4412345",
      address_line1: "Putalisadak",
      address_line2: "",
      website: "https://acme.test",
    },
    has_contact_email: true,
  },
  modules: ["students", "tasks"],
  date_display: "AD",
  support_access: null,
};

const SESSION = {
  staff: { id: uid(1), name: "Sita Sharma", email: "sita@acme.test", role: "counsellor" },
  consultancy: {
    name: "Acme Education",
    logo: null,
    status: "evaluation",
    statusMessage: null,
    evaluationEndsAt: "2026-11-18T03:15:00Z",
    officeDetails: {
      contactEmail: "info@acme.test",
      phone: "01-4412345",
      addressLine1: "Putalisadak",
      addressLine2: "",
      website: "https://acme.test",
    },
    hasContactEmail: true,
  },
  modules: ["students", "tasks"],
  dateDisplay: "AD",
  colourMode: "light",
  pageSwipe: false,
  supportAccess: null,
};

describe("logIn", () => {
  it("posts the credentials and returns the session context", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ context: CONTEXT }));

    await expect(logIn({ email: "sita@acme.test", password: "pw" }, fetchFn)).resolves.toEqual({
      kind: "loggedIn",
      context: SESSION,
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/login/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "sita@acme.test", password: "pw" }),
      }),
    );
  });

  it.each(["setup", "verify"] as const)(
    "says when two-step login comes next (%s), with no context",
    async (step) => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ two_factor: step }));

      await expect(logIn({ email: "x@y.z", password: "pw" }, fetchFn)).resolves.toEqual({
        kind: "twoFactor",
        step,
      });
    },
  );

  it("refuses an answer that is neither a login nor a two-step step", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ two_factor: "maybe" }));

    await expect(logIn({ email: "x@y.z", password: "pw" }, fetchFn)).rejects.toThrow();
  });

  it("never takes the context from the top level of the answer", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(CONTEXT));

    await expect(logIn({ email: "x@y.z", password: "pw" }, fetchFn)).rejects.toEqual(
      new ApiRequestError("/api/auth/login/", 200),
    );
  });

  it("rejects with InvalidCredentialsError when the API refuses the credentials", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ detail: "Invalid email or password." }, 400));

    await expect(logIn({ email: "x@y.z", password: "bad" }, fetchFn)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it("rejects with TooManyPasswordTriesError once the wrong passwords are used up", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ detail: "x" }, 429));

    await expect(logIn({ email: "x@y.z", password: "pw" }, fetchFn)).rejects.toBeInstanceOf(
      TooManyPasswordTriesError,
    );
  });

  it("passes other failures through", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 500));

    await expect(logIn({ email: "x@y.z", password: "pw" }, fetchFn)).rejects.toEqual(
      new ApiRequestError("/api/auth/login/", 500, {}),
    );
  });
});

describe("logOut", () => {
  it("posts to the logout endpoint", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));

    await logOut(fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/logout/",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("fetchStaffContext", () => {
  it("returns the current session context", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(CONTEXT));

    await expect(fetchStaffContext(fetchFn)).resolves.toEqual(SESSION);
    expect(fetchFn).toHaveBeenCalledWith("/api/context/", expect.anything());
  });

  it.each([
    ["missing", undefined],
    ["not an object", "info@acme.test"],
    ["with a wrong field", { contact_email: 7 }],
    ["over-long", { ...CONTEXT.consultancy.office_details, website: `https://${"a".repeat(300)}` }],
  ])("reads Office details that are %s as none, so sending stays off", async (_case, details) => {
    const consultancy = { ...CONTEXT.consultancy, office_details: details };
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...CONTEXT, consultancy }));

    await expect(fetchStaffContext(fetchFn)).resolves.toMatchObject({
      consultancy: { officeDetails: NO_OFFICE_DETAILS, hasContactEmail: false },
    });
  });

  it("returns the office logo in frontend naming, or null for one that isn't ours", async () => {
    const logo = { url: "/api/consultancy/logo/2/", show_name: false };
    const withLogo = { ...CONTEXT, consultancy: { name: "Acme Education", logo } };
    const badLogo = { ...CONTEXT, consultancy: { name: "Acme", logo: { url: "//evil.test/x" } } };
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(withLogo))
      .mockResolvedValueOnce(jsonResponse(badLogo));

    await expect(fetchStaffContext(fetchFn)).resolves.toMatchObject({
      consultancy: { logo: { url: "/api/consultancy/logo/2/", showName: false } },
    });
    await expect(fetchStaffContext(fetchFn)).resolves.toMatchObject({
      consultancy: { logo: null },
    });
  });

  it.each([401, 403])("rejects with NotLoggedInError on %i", async (status) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, status));

    await expect(fetchStaffContext(fetchFn)).rejects.toBeInstanceOf(NotLoggedInError);
  });

  it("passes other failures through", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));

    await expect(fetchStaffContext(fetchFn)).rejects.toEqual(
      new ApiRequestError("/api/context/", null),
    );
  });

  it("rejects a context naming an unknown Role", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ ...CONTEXT, staff: { ...CONTEXT.staff, role: "janitor" } }),
      );

    await expect(fetchStaffContext(fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("office colours are gone (ticket 04)", () => {
  it("drops a theme an old answer still carries", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...CONTEXT, theme: { page: "purple" } }));

    const context = await fetchStaffContext(fetchFn);

    expect(context).not.toHaveProperty("theme");
  });
});
