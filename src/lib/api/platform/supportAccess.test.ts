import { DEFAULT_THEME } from "@/lib/theme";

import { InvalidFieldsError } from "../core/errors";
import {
  downloadOfficeData,
  enterSupportVisit,
  fetchSupportVisits,
  isEntryCode,
  sendResetCodeTo,
  signOutStaff,
  startSupportVisit,
  switchOfficeModules,
} from "./supportAccess";
import { jsonResponse } from "../core/test-helpers";
import { testHost } from "@/test/hosts";

const VISIT = {
  id: 7,
  platform_admin: { name: "Ramesh" },
  consultancy: { id: 3, name: "Acme Education" },
  reason: "Admin asked for help with fees",
  consultancy_status: "past_due",
  started_at: "2026-11-04T05:00:00+00:00",
  ended_at: null,
};
const CODE = "Xy_9-abcdefghijklmnopqrstuvwxyz0123456789AB";
const CONTEXT = {
  staff: {
    id: 0,
    name: "Ramesh",
    email: "ramesh@platform.test",
    role: "admin",
    colour_mode: "light",
  },
  consultancy: {
    name: "Acme Education",
    logo: null,
    status: "past_due",
    status_message: "Read only.",
    evaluation_ends_at: null,
  },
  modules: ["students"],
  date_display: "AD",
  theme: DEFAULT_THEME,
  support_access: { platform_admin_name: "Ramesh", platform_host: testHost("admin") },
};

function fieldErrorsOf(error: unknown): Partial<Record<string, string[]>> {
  if (!(error instanceof InvalidFieldsError)) throw new Error("Not refused input");
  return error.fieldErrors;
}

function answering(response: Response): typeof fetch {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function sent(fetchFn: typeof fetch): { path: unknown; init: RequestInit | undefined } {
  const [path, init] = vi.mocked(fetchFn).mock.calls[0] ?? [];
  return { path, init };
}

describe("startSupportVisit", () => {
  it("sends the reason and returns the visit, the office's address and the code", async () => {
    const fetchFn = answering(
      jsonResponse({ visit: VISIT, host: testHost("acme"), entry_code: CODE }, 201),
    );

    const started = await startSupportVisit(3, "Admin asked for help with fees", fetchFn);

    expect(started).toEqual({
      visit: {
        id: 7,
        platformAdminName: "Ramesh",
        consultancy: { id: 3, name: "Acme Education" },
        reason: "Admin asked for help with fees",
        consultancyStatus: "past_due",
        startedAt: "2026-11-04T05:00:00+00:00",
        endedAt: null,
      },
      host: testHost("acme"),
      entryCode: CODE,
    });
    const { path, init } = sent(fetchFn);
    expect(path).toBe("/api/platform/consultancies/3/support-visits/");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ reason: "Admin asked for help with fees" }));
  });

  it.each([
    ["an address with a path", `${testHost("acme")}/evil`],
    ["another scheme", "javascript:alert(1)"],
    ["an address with a user", "me@evil.test"],
  ])("refuses %s it would be sent to", async (_name, host) => {
    const fetchFn = answering(jsonResponse({ visit: VISIT, host, entry_code: CODE }, 201));

    await expect(startSupportVisit(3, "Help", fetchFn)).rejects.toThrow();
  });

  it("refuses an entry code with characters a code never has", async () => {
    const fetchFn = answering(
      jsonResponse({ visit: VISIT, host: testHost("acme"), entry_code: "a b#c" }, 201),
    );

    await expect(startSupportVisit(3, "Help", fetchFn)).rejects.toThrow();
  });

  it("names the refused reason", async () => {
    const fetchFn = answering(jsonResponse({ reason: ["This field may not be blank."] }, 400));

    const error = await startSupportVisit(3, "", fetchFn).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvalidFieldsError);
    expect(fieldErrorsOf(error)).toEqual({
      reason: ["This field may not be blank."],
    });
  });

  it("passes on why the office can't be opened", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "This office's account has been closed." }, 400),
    );

    const error = await startSupportVisit(3, "Help", fetchFn).catch((caught: unknown) => caught);

    expect(fieldErrorsOf(error)).toEqual({
      detail: ["This office's account has been closed."],
    });
  });

  it("keeps other failures as they are", async () => {
    const fetchFn = answering(jsonResponse({}, 500));

    const error = await startSupportVisit(3, "Help", fetchFn).catch((caught: unknown) => caught);

    expect(error).not.toBeInstanceOf(InvalidFieldsError);
  });

  it("keeps a refusal it can't read as it is", async () => {
    const fetchFn = answering(jsonResponse(["odd"], 400));

    const error = await startSupportVisit(3, "Help", fetchFn).catch((caught: unknown) => caught);

    expect(error).not.toBeInstanceOf(InvalidFieldsError);
  });
});

describe("fetchSupportVisits", () => {
  it("returns every visit, ended or not", async () => {
    const fetchFn = answering(
      jsonResponse([VISIT, { ...VISIT, id: 6, ended_at: "2026-11-04T06:00:00+00:00" }]),
    );

    const visits = await fetchSupportVisits(fetchFn);

    expect(visits.map((visit) => visit.endedAt)).toEqual([null, "2026-11-04T06:00:00+00:00"]);
    expect(sent(fetchFn).path).toBe("/api/platform/support-visits/");
  });

  it("refuses an answer with an unknown Status", async () => {
    const fetchFn = answering(jsonResponse([{ ...VISIT, consultancy_status: "gone" }]));

    await expect(fetchSupportVisits(fetchFn)).rejects.toThrow();
  });
});

describe("isEntryCode", () => {
  it.each([
    [CODE, true],
    ["", false],
    ["a".repeat(101), false],
    ["<script>", false],
    ["abc def", false],
  ])("%s is %s", (code, expected) => {
    expect(isEntryCode(code)).toBe(expected);
  });
});

describe("enterSupportVisit", () => {
  it("sends the code and returns the context", async () => {
    const fetchFn = answering(jsonResponse({ context: CONTEXT }));

    const context = await enterSupportVisit(CODE, fetchFn);

    expect(context.supportAccess).toEqual({
      platformAdminName: "Ramesh",
      platformHost: testHost("admin"),
    });
    const { path, init } = sent(fetchFn);
    expect(path).toBe("/api/support-access/enter/");
    expect(init?.body).toBe(JSON.stringify({ code: CODE }));
  });

  it("refuses a context that would send the browser somewhere odd", async () => {
    const fetchFn = answering(
      jsonResponse({
        context: {
          ...CONTEXT,
          support_access: { platform_admin_name: "Ramesh", platform_host: "evil.test/x" },
        },
      }),
    );

    await expect(enterSupportVisit(CODE, fetchFn)).rejects.toThrow();
  });

  it("says why a code is refused", async () => {
    const fetchFn = answering(jsonResponse({ detail: "This link has expired." }, 400));

    const error = await enterSupportVisit(CODE, fetchFn).catch((caught: unknown) => caught);

    expect(fieldErrorsOf(error)).toEqual({
      detail: ["This link has expired."],
    });
  });
});

describe("Platform-only actions inside the office", () => {
  it("switches the office's Modules", async () => {
    const fetchFn = answering(jsonResponse({ modules: ["students", "batches"] }));
    const switches = {
      batches: true,
      communication: false,
      accounts: false,
      reports: false,
      clock_in: false,
    };

    expect(await switchOfficeModules(switches, fetchFn)).toEqual(["students", "batches"]);
    const { path, init } = sent(fetchFn);
    expect(path).toBe("/api/support-access/modules/");
    expect(init?.method).toBe("PUT");
    expect(init?.body).toBe(JSON.stringify(switches));
  });

  it("sends someone a reset Code", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Reset code sent." }));

    await sendResetCodeTo(4, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/support-access/staff/4/reset-code/");
  });

  it("says why a reset Code wasn't sent", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Send their invite again instead." }, 400));

    const error = await sendResetCodeTo(4, fetchFn).catch((caught: unknown) => caught);

    expect(fieldErrorsOf(error)).toEqual({
      detail: ["Send their invite again instead."],
    });
  });

  it("signs someone out", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await signOutStaff(4, fetchFn);

    const { path, init } = sent(fetchFn);
    expect(path).toBe("/api/support-access/staff/4/sign-out/");
    expect(init?.method).toBe("POST");
  });

  it("downloads the office's data as a file", async () => {
    const fetchFn = answering(
      new Response("zip", { headers: { "Content-Type": "application/zip" } }),
    );

    const file = await downloadOfficeData(fetchFn);

    expect(await file.text()).toBe("zip");
    const { path, init } = sent(fetchFn);
    expect(path).toBe("/api/support-access/export/");
    expect(init?.method).toBe("POST");
  });

  it("fails a refused download", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Only a Platform Admin can do this." }, 403));

    await expect(downloadOfficeData(fetchFn)).rejects.toThrow();
  });
});
