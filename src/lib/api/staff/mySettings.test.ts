import { API_PATHS } from "@/constants/api";

import {
  ApiRequestError,
  InvalidFieldsError,
  PasswordRulesNotMetError,
  WrongCurrentPasswordError,
} from "../core/errors";
import {
  changeMyPassword,
  fetchMyDetails,
  fetchSignedInDevices,
  saveColourMode,
  saveMyDetails,
  saveNotificationChoices,
  signOutOtherDevices,
} from "./mySettings";
import { jsonResponse } from "../core/test-helpers";

const ME = {
  name: "Sita Sharma",
  mobile: "9812345670",
  email: "sita@acme.test",
  job_title: "Senior Counsellor",
  role: "counsellor",
  joined_on: "2026-11-01",
  colour_mode: "light",
  notifications: { task_given: true, task_due_tomorrow: true, morning_summary: false },
  page_swipe: false,
};

const MY_DETAILS = {
  name: "Sita Sharma",
  mobile: "9812345670",
  email: "sita@acme.test",
  jobTitle: "Senior Counsellor",
  role: "counsellor",
  joinedOn: "2026-11-01",
  colourMode: "light",
  notifications: { taskGiven: true, taskDueTomorrow: true, morningSummary: false },
  pageSwipe: false,
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function sentBody(fetchFn: ReturnType<typeof answering>): unknown {
  const init = fetchFn.mock.calls[0]?.[1];
  const body = init?.body;
  return JSON.parse(typeof body === "string" ? body : "");
}

function sentMethod(fetchFn: ReturnType<typeof answering>): string | undefined {
  return fetchFn.mock.calls[0]?.[1]?.method;
}

describe("fetchMyDetails", () => {
  it("returns my details in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(ME));

    await expect(fetchMyDetails(fetchFn)).resolves.toEqual(MY_DETAILS);
    expect(fetchFn.mock.calls[0]?.[0]).toBe(API_PATHS.me);
  });

  it.each([
    ["an unknown Role", { ...ME, role: "owner" }],
    ["an unknown colour mode", { ...ME, colour_mode: "blue" }],
    ["a missing choice", { ...ME, notifications: { task_given: true } }],
    [
      "a choice that isn't true or false",
      { ...ME, notifications: { ...ME.notifications, task_given: "yes" } },
    ],
  ])("refuses an answer with %s", async (_, body) => {
    await expect(fetchMyDetails(answering(jsonResponse(body)))).rejects.toThrow();
  });
});

describe("saveMyDetails", () => {
  it("sends only the name and mobile", async () => {
    const fetchFn = answering(jsonResponse(ME));

    await expect(saveMyDetails({ name: "sita sharma", mobile: "" }, fetchFn)).resolves.toEqual(
      MY_DETAILS,
    );
    expect(sentMethod(fetchFn)).toBe("PATCH");
    expect(sentBody(fetchFn)).toEqual({ name: "sita sharma", mobile: "" });
  });

  it("names the fields the server refused", async () => {
    const fetchFn = answering(jsonResponse({ mobile: ["Enter a mobile number."] }, 400));

    const saving = saveMyDetails({ name: "Sita", mobile: "12" }, fetchFn);

    await expect(saving).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(saving).rejects.toMatchObject({
      fieldErrors: { mobile: ["Enter a mobile number."] },
    });
  });

  it("passes on any other failure", async () => {
    const saving = saveMyDetails({ name: "Sita", mobile: "" }, answering(jsonResponse({}, 500)));

    await expect(saving).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("saveNotificationChoices", () => {
  it("sends the choices in API naming", async () => {
    const fetchFn = answering(jsonResponse(ME));

    await saveNotificationChoices({ morningSummary: true }, fetchFn);

    expect(sentBody(fetchFn)).toEqual({ notifications: { morning_summary: true } });
  });
});

describe("saveColourMode", () => {
  it("sends the chosen mode", async () => {
    const fetchFn = answering(jsonResponse({ ...ME, colour_mode: "dark" }));

    const saved = await saveColourMode("dark", fetchFn);

    expect(saved.colourMode).toBe("dark");
    expect(sentBody(fetchFn)).toEqual({ colour_mode: "dark" });
  });
});

describe("changeMyPassword", () => {
  const CHANGE = { currentPassword: "Old!pass1", newPassword: "Kathmandu!2027" };

  it("sends both passwords; the new tokens never reach the browser", async () => {
    const fetchFn = answering(jsonResponse({}));

    await expect(changeMyPassword(CHANGE, fetchFn)).resolves.toBeUndefined();
    expect(fetchFn.mock.calls[0]?.[0]).toBe(API_PATHS.myPassword);
    expect(sentBody(fetchFn)).toEqual({
      current_password: "Old!pass1",
      new_password: "Kathmandu!2027",
    });
  });

  it("says when the current password is wrong", async () => {
    const answer = jsonResponse({ current_password: ["That isn't your current password."] }, 400);

    await expect(changeMyPassword(CHANGE, answering(answer))).rejects.toBeInstanceOf(
      WrongCurrentPasswordError,
    );
  });

  it("lists the rules a new password breaks", async () => {
    const answer = jsonResponse({ detail: "No.", unmet_rules: ["capital", "made_up"] }, 400);

    const changing = changeMyPassword(CHANGE, answering(answer));

    await expect(changing).rejects.toBeInstanceOf(PasswordRulesNotMetError);
    await expect(changing).rejects.toMatchObject({ unmet: ["capital"] });
  });

  it("passes on any other failure", async () => {
    await expect(changeMyPassword(CHANGE, answering(jsonResponse({}, 400)))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe("fetchSignedInDevices", () => {
  it("returns each device in frontend naming", async () => {
    const body = [
      {
        name: "Chrome on Windows",
        signed_in_at: "2026-11-01T09:00:00+05:45",
        last_used_at: "2026-11-03T10:00:00+05:45",
        logged_out_at: null,
        is_current: true,
      },
      {
        name: "Safari on iOS",
        signed_in_at: "2026-10-01T09:00:00+05:45",
        last_used_at: "2026-10-03T10:00:00+05:45",
        logged_out_at: "2026-11-12T08:00:00+05:45",
        is_current: false,
      },
    ];

    await expect(fetchSignedInDevices(answering(jsonResponse(body)))).resolves.toEqual([
      {
        name: "Chrome on Windows",
        signedInAt: "2026-11-01T09:00:00+05:45",
        lastUsedAt: "2026-11-03T10:00:00+05:45",
        loggedOutAt: null,
        isCurrent: true,
      },
      {
        name: "Safari on iOS",
        signedInAt: "2026-10-01T09:00:00+05:45",
        lastUsedAt: "2026-10-03T10:00:00+05:45",
        loggedOutAt: "2026-11-12T08:00:00+05:45",
        isCurrent: false,
      },
    ]);
  });

  it.each([
    [{ is_current: "yes" }],
    [{ name: 1, signed_in_at: "x", last_used_at: "x", logged_out_at: null, is_current: true }],
    [{ name: "x", signed_in_at: "x", last_used_at: "x", is_current: true }],
    [
      {
        name: "x".repeat(61),
        signed_in_at: "x",
        last_used_at: "x",
        logged_out_at: null,
        is_current: true,
      },
    ],
  ])("refuses an answer that isn't a list of devices (%j)", async (...body) => {
    await expect(fetchSignedInDevices(answering(jsonResponse(body)))).rejects.toThrow();
  });
});

describe("signOutOtherDevices", () => {
  it("posts with no body", async () => {
    const fetchFn = answering(jsonResponse({}));

    await signOutOtherDevices(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe(API_PATHS.signOutOtherDevices);
    expect(sentMethod(fetchFn)).toBe("POST");
  });
});
