import { ApiRequestError } from "../core/errors";
import { fetchNotifications, markAllNotificationsRead, setNotificationRead } from "./notifications";
import { jsonResponse } from "../core/test-helpers";

const GIVEN = {
  id: 3,
  kind: "assigned",
  created_at: "2026-11-02T09:12:00+05:45",
  is_read: false,
  task: { id: 31, title: "First counselling call with Manisha", due_on: "2026-11-03" },
  by: { id: 4, name: "Ramesh KC" },
  student: { id: 7, name: "Manisha Rai" },
  transfer_request: null,
};

const GIVEN_IN_FRONTEND_NAMING = {
  id: 3,
  kind: "assigned",
  createdAt: "2026-11-02T09:12:00+05:45",
  isRead: false,
  task: { id: 31, title: "First counselling call with Manisha", dueOn: "2026-11-03" },
  by: { id: 4, name: "Ramesh KC" },
  student: { id: 7, name: "Manisha Rai" },
  transferRequest: null,
  bin: null,
  workFromHome: null,
};

const DUE = { ...GIVEN, id: 4, kind: "overdue", is_read: true, by: null, student: null };

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function pageOf(results: unknown[], unread: number) {
  return { count: results.length, page: 1, page_size: 20, unread_count: unread, results };
}

describe("fetchNotifications", () => {
  it("reads a Transfer Request notification, with no Task", async () => {
    const asked = {
      ...GIVEN,
      kind: "transfer_asked",
      task: null,
      by: { id: null, name: "Ramesh (Platform Admin)" },
      transfer_request: { id: 801, status: "waiting" },
    };
    const fetchFn = answering(jsonResponse(pageOf([asked], 1)));

    const page = await fetchNotifications(fetchFn);

    expect(page.notifications[0]).toMatchObject({
      kind: "transfer_asked",
      task: null,
      by: { id: null, name: "Ramesh (Platform Admin)" },
      transferRequest: { id: 801, status: "waiting" },
    });
  });

  it("reads a Work from home notification", async () => {
    const asked = {
      ...GIVEN,
      kind: "work_from_home_asked",
      task: null,
      student: null,
      work_from_home: {
        id: 9,
        staff_id: 5,
        starts_on: "2026-11-06",
        ends_on: null,
        status: "waiting",
      },
    };

    const page = await fetchNotifications(answering(jsonResponse(pageOf([asked], 1))));

    expect(page.notifications[0]?.workFromHome).toEqual({
      id: 9,
      staffId: 5,
      startsOn: "2026-11-06",
      endsOn: null,
      status: "waiting",
    });
  });

  it("refuses Work from home dates it doesn't understand", async () => {
    const asked = {
      ...GIVEN,
      kind: "work_from_home_asked",
      task: null,
      work_from_home: { id: 9, staff_id: 5, starts_on: "6 Nov", ends_on: null, status: "x" },
    };

    await expect(fetchNotifications(answering(jsonResponse(pageOf([asked], 1))))).rejects.toThrow();
  });

  it("GETs my newest notifications with the unread count, in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(pageOf([GIVEN, DUE], 1)));

    const page = await fetchNotifications(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/notifications/");
    expect(page.unreadCount).toBe(1);
    expect(page.count).toBe(2);
    expect(page.notifications[0]).toEqual(GIVEN_IN_FRONTEND_NAMING);
    expect(page.notifications[1]).toMatchObject({ kind: "overdue", by: null, student: null });
  });

  it.each([
    ["an unknown kind", { ...GIVEN, kind: "promoted" }],
    ["a missing title", { ...GIVEN, task: { id: 31, title: "", due_on: "2026-11-03" } }],
    ["a text id", { ...GIVEN, id: "3" }],
    ["a date that isn't one", { ...GIVEN, created_at: "yesterday" }],
    ["a request with an unknown status", { ...GIVEN, transfer_request: { id: 1, status: "x" } }],
    [
      "no Task and no transfer_request field",
      { ...GIVEN, task: null, transfer_request: undefined },
    ],
  ])("refuses an answer with %s", async (_, item) => {
    const fetchFn = answering(jsonResponse(pageOf([item], 1)));

    await expect(fetchNotifications(fetchFn)).rejects.toThrow();
  });

  it("refuses a negative unread count", async () => {
    const fetchFn = answering(jsonResponse(pageOf([], -1)));

    await expect(fetchNotifications(fetchFn)).rejects.toThrow();
  });
});

describe("setNotificationRead", () => {
  it("PATCHes only the read flag", async () => {
    const fetchFn = answering(jsonResponse({ ...GIVEN, is_read: true }));

    const item = await setNotificationRead(3, true, fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/notifications/3/");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ read: true }));
    expect(item.isRead).toBe(true);
  });

  it("rejects when someone else's is not found", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Not found." }, 404));

    await expect(setNotificationRead(3, true, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("markAllNotificationsRead", () => {
  it("POSTs an empty object", async () => {
    const fetchFn = answering(jsonResponse({ unread_count: 0 }));

    await markAllNotificationsRead(fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/notifications/read-all/");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe("{}");
  });
});
