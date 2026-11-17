import type { ThemeConfig } from "@/lib/theme";
import { TEST_COLOURS } from "@/lib/theme/testColours";
import {
  ApiRequestError,
  InvalidCredentialsError,
  InvalidFieldsError,
  NotLoggedInError,
} from "./errors";
import {
  changeConsultancyStatus,
  createConsultancy,
  fetchConsultancies,
  fetchPlatformAdmin,
  logInToPlatform,
  logOutOfPlatform,
  retryConsultancySetup,
  updateConsultancyTheme,
  updateModules,
} from "./platform";
import { jsonResponse } from "./test-helpers";
import { CONTRASTING_THEME } from "@/test/themes";
import { testHost } from "@/test/hosts";

const THEME: ThemeConfig = {
  page: "ice",
  sidebar: TEST_COLOURS.deepTeal,
  accent: TEST_COLOURS.arcticTeal,
  dark: { base: "teal", sidebar: "brand", accent: "auto" },
};

const ADMIN = { id: 1, name: "Platform Ops", email: "ops@platform.test" };

const ACME = {
  id: 3,
  name: "Acme Education",
  subdomain: "acme",
  host: testHost("acme"),
  status: "evaluation",
  status_reason: "",
  evaluation_ends_at: "2026-11-18T03:15:00Z",
  paid_until: null,
  modules: ["students", "batches"],
  theme: THEME,
  setup_state: "ready",
};

const ACME_OVERVIEW = {
  id: 3,
  name: "Acme Education",
  subdomain: "acme",
  host: testHost("acme"),
  status: "evaluation",
  statusReason: "",
  evaluationEndsAt: "2026-11-18T03:15:00Z",
  paidUntil: null,
  modules: ["students", "batches"],
  theme: THEME,
  setupState: "ready",
};

const NEW_CONSULTANCY = {
  name: "Acme Education",
  subdomain: "acme",
  theme: THEME,
  status: "evaluation",
  paidUntil: "",
} as const;

describe("logInToPlatform", () => {
  it("posts the credentials and returns the Platform Admin", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ platform_admin: ADMIN }));

    await expect(
      logInToPlatform({ email: "ops@platform.test", password: "pw" }, fetchFn),
    ).resolves.toEqual({ kind: "loggedIn", admin: ADMIN });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/auth/login/",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it.each(["setup", "verify"])(
    "says what comes next when two-step login is on (%s)",
    async (step) => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ two_factor: step }));

      await expect(
        logInToPlatform({ email: "ops@platform.test", password: "pw" }, fetchFn),
      ).resolves.toEqual({ kind: "twoFactor", step });
    },
  );

  it("refuses an unknown next step", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ two_factor: "sms" }));

    await expect(logInToPlatform({ email: "a@b.test", password: "pw" }, fetchFn)).rejects.toThrow();
  });

  it("rejects with InvalidCredentialsError when the API refuses the credentials", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ detail: "no" }, 400));

    await expect(
      logInToPlatform({ email: "x@y.z", password: "bad" }, fetchFn),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("passes other failures through", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 404));

    await expect(
      logInToPlatform({ email: "x@y.z", password: "pw" }, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("logOutOfPlatform", () => {
  it("posts to the Platform logout endpoint", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));

    await logOutOfPlatform(fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/auth/logout/",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("fetchPlatformAdmin", () => {
  it("returns the logged-in Platform Admin", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ platform_admin: ADMIN }));

    await expect(fetchPlatformAdmin(fetchFn)).resolves.toEqual(ADMIN);
    expect(fetchFn).toHaveBeenCalledWith("/api/platform/me/", expect.anything());
  });

  it("rejects with NotLoggedInError when nobody is logged in", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 403));

    await expect(fetchPlatformAdmin(fetchFn)).rejects.toBeInstanceOf(NotLoggedInError);
  });

  it("passes other failures through", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 404));

    await expect(fetchPlatformAdmin(fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("fetchConsultancies", () => {
  it("returns every Consultancy in frontend naming", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([ACME]));

    await expect(fetchConsultancies(fetchFn)).resolves.toEqual([ACME_OVERVIEW]);
    expect(fetchFn).toHaveBeenCalledWith("/api/platform/consultancies/", expect.anything());
  });
});

describe("createConsultancy", () => {
  it("posts the new Consultancy in API naming, without any password, and returns it setting up", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...ACME, setup_state: "setting_up" }, 202));

    await expect(createConsultancy(NEW_CONSULTANCY, fetchFn)).resolves.toEqual({
      ...ACME_OVERVIEW,
      setupState: "setting_up",
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/consultancies/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Acme Education",
          subdomain: "acme",
          status: "evaluation",
          theme: THEME,
        }),
      }),
    );
  });

  it("sends the paid-until date only for an office starting Active", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(ACME, 202));

    await createConsultancy(
      { ...NEW_CONSULTANCY, status: "active", paidUntil: "2026-12-31" },
      fetchFn,
    );

    const body = fetchFn.mock.calls[0]?.[1]?.body;
    const sent: unknown = typeof body === "string" ? JSON.parse(body) : null;
    expect(sent).toMatchObject({ status: "active", paid_until: "2026-12-31" });
  });

  it("rejects with the field errors, in frontend naming, when the API refuses the input", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          subdomain: ["This subdomain is already taken."],
          admin_email: ["Not a field any more."],
        },
        400,
      ),
    );

    const error: unknown = await createConsultancy(NEW_CONSULTANCY, fetchFn).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(InvalidFieldsError);
    expect(error).toHaveProperty("fieldErrors", {
      subdomain: ["This subdomain is already taken."],
    });
  });

  it("passes a refusal without field errors through", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ detail: "no" }, 403));

    await expect(createConsultancy(NEW_CONSULTANCY, fetchFn)).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it("refuses an answer whose setup state it doesn't know", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...ACME, setup_state: "<b>done</b>" }, 202));

    await expect(createConsultancy(NEW_CONSULTANCY, fetchFn)).rejects.toThrow();
  });

  it("refuses an answer without a setup state", async () => {
    const withoutState = Object.fromEntries(
      Object.entries(ACME).filter(([key]) => key !== "setup_state"),
    );
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(withoutState, 202));

    await expect(createConsultancy(NEW_CONSULTANCY, fetchFn)).rejects.toThrow();
  });
});

describe("retryConsultancySetup", () => {
  it("posts to the office's Try again endpoint and returns it setting up", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...ACME, setup_state: "setting_up" }, 202));

    await expect(retryConsultancySetup(3, fetchFn)).resolves.toMatchObject({
      id: 3,
      setupState: "setting_up",
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/consultancies/3/retry-setup/",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("passes a refusal through", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ detail: "Only an office whose setup failed…" }, 400));

    await expect(retryConsultancySetup(3, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("changeConsultancyStatus", () => {
  it("posts the change in API naming and returns the Consultancy as it is now", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        ...ACME,
        status: "active",
        evaluation_ends_at: null,
        paid_until: "2026-12-31",
      }),
    );

    await expect(
      changeConsultancyStatus(
        3,
        { status: "active", reason: "Paid", paidUntil: "2026-12-31", evaluationEndsAt: "x" },
        fetchFn,
      ),
    ).resolves.toEqual({
      ...ACME_OVERVIEW,
      status: "active",
      evaluationEndsAt: null,
      paidUntil: "2026-12-31",
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/consultancies/3/status/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ status: "active", reason: "Paid", paid_until: "2026-12-31" }),
      }),
    );
  });

  it("sends the evaluation's new end only when extending it, and no empty dates", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(jsonResponse(ACME)));

    await changeConsultancyStatus(
      3,
      { status: "evaluation", reason: "", evaluationEndsAt: "2026-11-30", paidUntil: "" },
      fetchFn,
    );
    await changeConsultancyStatus(3, { status: "active", reason: "", paidUntil: "" }, fetchFn);

    expect(fetchFn.mock.calls.map((call) => call[1]?.body)).toEqual([
      JSON.stringify({ status: "evaluation", reason: "", evaluation_ends_at: "2026-11-30" }),
      JSON.stringify({ status: "active", reason: "" }),
    ]);
  });

  it("names the refused fields in frontend naming", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ paid_until: ["Choose a date after today."] }, 400));

    const error: unknown = await changeConsultancyStatus(
      3,
      { status: "active", reason: "", paidUntil: "2020-01-01" },
      fetchFn,
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvalidFieldsError);
    expect(error).toHaveProperty("fieldErrors", { paidUntil: ["Choose a date after today."] });
  });

  it("gives a refused move as a whole as `detail`", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ detail: "A Terminated Consultancy can't be changed." }, 400),
      );

    const error: unknown = await changeConsultancyStatus(
      3,
      { status: "active", reason: "", paidUntil: "2026-12-31" },
      fetchFn,
    ).catch((caught: unknown) => caught);

    expect(error).toHaveProperty("fieldErrors", {
      detail: ["A Terminated Consultancy can't be changed."],
    });
  });

  it.each([
    { ...ACME, status: "closed" },
    { ...ACME, paid_until: "31/12/2026" },
    { ...ACME, evaluation_ends_at: "soon" },
    { ...ACME, status_reason: null },
  ])("refuses an answer that isn't a Consultancy: %j", async (answer) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(answer));

    await expect(
      changeConsultancyStatus(3, { status: "past_due", reason: "Unpaid" }, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("passes a failure that isn't a refusal through", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 500));

    await expect(
      changeConsultancyStatus(3, { status: "past_due", reason: "Unpaid" }, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("updateModules", () => {
  it("puts every switchable Module's switch and returns the updated Consultancy", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...ACME, modules: ["students", "reports"] }));
    const switches = {
      batches: false,
      communication: false,
      accounts: false,
      reports: true,
      clock_in: false,
    };

    await expect(updateModules(3, switches, fetchFn)).resolves.toEqual({
      ...ACME_OVERVIEW,
      modules: ["students", "reports"],
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/consultancies/3/modules/",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(switches) }),
    );
  });

  it("refuses an answer with an unknown Module", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...ACME, modules: ["students", "<script>"] }));
    const switches = {
      batches: true,
      communication: true,
      accounts: true,
      reports: true,
      clock_in: true,
    };

    await expect(updateModules(3, switches, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("updateConsultancyTheme", () => {
  const OVERVIEW = {
    id: 3,
    name: "Acme Education",
    subdomain: "acme",
    host: testHost("acme"),
    status: "active",
    status_reason: "",
    evaluation_ends_at: null,
    paid_until: "2027-03-31",
    modules: ["students"],
    theme: CONTRASTING_THEME,
    setup_state: "ready",
  };

  it("puts the colours to the office on the Platform and returns its summary", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(OVERVIEW));

    const updated = await updateConsultancyTheme(3, CONTRASTING_THEME, fetchFn);

    expect(updated.theme).toEqual(CONTRASTING_THEME);
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/consultancies/3/theme/",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(CONTRASTING_THEME) }),
    );
  });

  it("passes a refusal through", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ page: ["Bad"] }, 400));

    await expect(updateConsultancyTheme(3, CONTRASTING_THEME, fetchFn)).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});
