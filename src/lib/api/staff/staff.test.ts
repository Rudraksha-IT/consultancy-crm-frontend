import { ApiRequestError, InvalidFieldsError, TooManyCodesError } from "../core/errors";
import {
  cancelInvite,
  changeEmployeeRole,
  deactivateEmployee,
  fetchAssignedStudents,
  fetchCounsellorChoices,
  fetchEmployees,
  inviteEmployee,
  resendInvite,
  resetEmployeeTwoFactor,
  setEmployeeTwoFactor,
} from "./staff";
import { jsonResponse } from "../core/test-helpers";

const SITA = {
  id: 7,
  name: "Sita Sharma",
  email: "sita@acme.test",
  mobile: "9812345670",
  job_title: "Counsellor",
  role: "counsellor",
  joined_on: "2026-11-01",
  two_factor_required: false,
  two_factor_set_up: false,
  status: "invited",
};

const NEW_SITA = {
  name: "Sita Sharma",
  mobile: "9812345670",
  email: "sita@acme.test",
  jobTitle: "Counsellor",
  role: "counsellor",
  joinedOn: "2026-11-01",
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

describe("fetchEmployees", () => {
  it("returns each employee in frontend naming", async () => {
    const employees = await fetchEmployees(answering(jsonResponse([SITA])));

    expect(employees).toEqual([
      {
        id: 7,
        name: "Sita Sharma",
        email: "sita@acme.test",
        mobile: "9812345670",
        jobTitle: "Counsellor",
        role: "counsellor",
        joinedOn: "2026-11-01",
        status: "invited",
        twoFactorRequired: false,
        twoFactorSetUp: false,
      },
    ]);
  });

  it.each([
    { ...SITA, role: "owner" },
    { ...SITA, status: "paused" },
    { ...SITA, two_factor_required: "yes" },
    { ...SITA, two_factor_set_up: undefined },
    { ...SITA, joined_on: "1 Nov 2026" },
    { ...SITA, id: "7" },
  ])("refuses an answer of the wrong shape", async (row) => {
    await expect(fetchEmployees(answering(jsonResponse([row])))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe("inviteEmployee", () => {
  it("posts the details in API naming", async () => {
    const fetchFn = answering(jsonResponse(SITA, 201));

    const employee = await inviteEmployee(NEW_SITA, fetchFn);

    expect(employee.status).toBe("invited");
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/staff/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Sita Sharma",
          mobile: "9812345670",
          email: "sita@acme.test",
          job_title: "Counsellor",
          role: "counsellor",
          joined_on: "2026-11-01",
        }),
      }),
    );
  });

  it("names refused fields in frontend naming", async () => {
    const refusal = {
      email: ["Someone here already uses this email."],
      job_title: ["This field may not be blank."],
    };

    const caught: unknown = await inviteEmployee(
      NEW_SITA,
      answering(jsonResponse(refusal, 400)),
    ).catch((error: unknown) => error);

    if (!(caught instanceof InvalidFieldsError)) throw new Error("expected field errors");
    expect(caught.fieldErrors).toEqual({
      email: ["Someone here already uses this email."],
      jobTitle: ["This field may not be blank."],
    });
  });

  it("passes on a refusal that names no form field", async () => {
    await expect(
      inviteEmployee(NEW_SITA, answering(jsonResponse({ detail: "No." }, 400))),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("changing an employee", () => {
  it("patches only the Role", async () => {
    const fetchFn = answering(jsonResponse({ ...SITA, role: "admin" }));

    const employee = await changeEmployeeRole(7, "admin", fetchFn);

    expect(employee.role).toBe("admin");
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/staff/7/",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ role: "admin" }) }),
    );
  });

  it("deactivates", async () => {
    const fetchFn = answering(jsonResponse({ ...SITA, status: "deactivated" }));

    const employee = await deactivateEmployee(7, fetchFn);

    expect(employee.status).toBe("deactivated");
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/staff/7/deactivate/",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("invites", () => {
  it("sends the code again", async () => {
    const fetchFn = answering(jsonResponse(SITA, 202));

    await resendInvite(7, fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/staff/7/invite/",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects with TooManyCodesError at the hourly limit", async () => {
    await expect(resendInvite(7, answering(jsonResponse({}, 429)))).rejects.toBeInstanceOf(
      TooManyCodesError,
    );
  });

  it("passes other failures on", async () => {
    await expect(resendInvite(7, answering(jsonResponse({}, 500)))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it("cancels with DELETE", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await cancelInvite(7, fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/staff/7/invite/",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("fails a refused cancel", async () => {
    await expect(cancelInvite(7, answering(jsonResponse({}, 400)))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe("fetchCounsellorChoices", () => {
  it("returns Counsellors and Admins", async () => {
    const choices = [
      { id: 1, name: "Asha", role: "admin" },
      { id: 2, name: "Ram", role: "counsellor" },
    ];

    expect(await fetchCounsellorChoices(answering(jsonResponse(choices)))).toEqual(choices);
  });
});

describe("fetchAssignedStudents", () => {
  it("returns the Students someone still counsels", async () => {
    const fetchFn = answering(jsonResponse([{ id: 3, name: "Sita Karki", stage: "applying" }]));

    const students = await fetchAssignedStudents(7, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/staff/7/assigned-students/");
    expect(students).toEqual([{ id: 3, name: "Sita Karki", stage: "applying" }]);
  });

  it("refuses a Stage it doesn't know", async () => {
    const fetchFn = answering(jsonResponse([{ id: 3, name: "Sita Karki", stage: "gone" }]));

    await expect(fetchAssignedStudents(7, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("two-step login on Employees (issue 62)", () => {
  it("switches someone's two-step login on with a JSON true", async () => {
    const fetchFn = answering(jsonResponse({ ...SITA, two_factor_required: true }));

    const saved = await setEmployeeTwoFactor(7, true, fetchFn);

    expect(saved.twoFactorRequired).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/staff/7/two-factor/",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ required: true }) }),
    );
  });

  it("resets someone's two-step login with an empty body", async () => {
    const fetchFn = answering(jsonResponse({ ...SITA, two_factor_required: true }));

    const saved = await resetEmployeeTwoFactor(7, fetchFn);

    expect(saved.twoFactorSetUp).toBe(false);
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/staff/7/two-factor/reset/",
      expect.objectContaining({ method: "POST", body: "{}" }),
    );
  });

  it("refuses an answer that isn't an employee", async () => {
    await expect(
      setEmployeeTwoFactor(7, true, answering(jsonResponse({ ok: true }))),
    ).rejects.toThrow();
  });
});
