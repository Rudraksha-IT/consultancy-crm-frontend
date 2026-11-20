import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import {
  createTask,
  fetchMyTasks,
  fetchStudentTasks,
  fetchTaskAssignees,
  fetchTaskCount,
  setTaskDone,
} from "./tasks";
import { jsonResponse } from "../core/test-helpers";
import { uid } from "@/test/ids";

const TASK = {
  id: 31,
  title: "Call Sita about her IELTS score",
  due_on: "2026-11-03",
  priority: "normal",
  only_me: false,
  timing: "upcoming",
  is_done: false,
  done_at: null,
  assignee: { id: 5, name: "Bikash Thapa" },
  created_by: { id: 4, name: "Ramesh KC" },
  student: { id: uid(7), name: "Sita Gurung" },
  can_mark_done: true,
};

const TASK_IN_FRONTEND_NAMING = {
  id: 31,
  title: "Call Sita about her IELTS score",
  dueOn: "2026-11-03",
  priority: "normal",
  isOnlyMe: false,
  timing: "upcoming",
  isDone: false,
  doneAt: null,
  assignee: { id: 5, name: "Bikash Thapa" },
  createdBy: { id: 4, name: "Ramesh KC" },
  student: { id: uid(7), name: "Sita Gurung" },
  canMarkDone: true,
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sent(fetchFn: ReturnType<typeof answering>): { path: unknown; init?: RequestInit } {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  return init === undefined ? { path } : { path, init };
}

function pageOf(results: unknown[]) {
  return { count: results.length, page: 1, page_size: 25, results };
}

describe("fetchMyTasks", () => {
  it("GETs one view and page, answering in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(pageOf([TASK])));

    const page = await fetchMyTasks("given", 2, {}, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/tasks/?view=given&page=2");
    expect(page).toEqual({ count: 1, page: 1, pageSize: 25, tasks: [TASK_IN_FRONTEND_NAMING] });
  });

  it("accepts a done Task and one with no Student", async () => {
    const done = { ...TASK, timing: "done", is_done: true, done_at: "2026-11-02T10:00:00+05:45" };
    const fetchFn = answering(jsonResponse(pageOf([done, { ...TASK, id: 32, student: null }])));

    const page = await fetchMyTasks("done", 1, {}, fetchFn);

    expect(page.tasks.map((task) => [task.isDone, task.doneAt, task.student])).toEqual([
      [true, "2026-11-02T10:00:00+05:45", { id: uid(7), name: "Sita Gurung" }],
      [false, null, null],
    ]);
  });

  it.each([
    ["an unknown timing", { ...TASK, timing: "soon" }],
    ["a due date that isn't a date", { ...TASK, due_on: "tomorrow" }],
    ["a missing assignee", { ...TASK, assignee: undefined }],
    ["text for a flag", { ...TASK, can_mark_done: "yes" }],
    ["an unknown priority", { ...TASK, priority: "urgent" }],
    ["a missing priority", { ...TASK, priority: undefined }],
    ["text for Only me", { ...TASK, only_me: "no" }],
  ])("refuses an answer with %s", async (_, task) => {
    const fetchFn = answering(jsonResponse(pageOf([task])));

    await expect(fetchMyTasks("mine", 1, {}, fetchFn)).rejects.toThrow();
  });
});

describe("fetchMyTasks filters", () => {
  it("asks for one priority and Tasks due by a day", async () => {
    const fetchFn = answering(jsonResponse(pageOf([{ ...TASK, priority: "high" }])));

    const page = await fetchMyTasks("mine", 1, { priority: "high", dueBy: "2026-11-05" }, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/tasks/?view=mine&page=1&priority=high&due_by=2026-11-05");
    expect(page.tasks[0]?.priority).toBe("high");
  });

  it("reads an Only me Task", async () => {
    const fetchFn = answering(jsonResponse(pageOf([{ ...TASK, only_me: true, student: null }])));

    const page = await fetchMyTasks("mine", 1, {}, fetchFn);

    expect(page.tasks[0]?.isOnlyMe).toBe(true);
  });
});

describe("fetchTaskCount", () => {
  it("GETs how many of my Tasks are due today or overdue", async () => {
    const fetchFn = answering(jsonResponse({ count: 3 }));

    await expect(fetchTaskCount(fetchFn)).resolves.toBe(3);
    expect(sent(fetchFn).path).toBe("/api/tasks/count/");
  });

  it.each([{ count: -1 }, { count: 1.5 }, { count: "3" }, {}])(
    "refuses a count that isn't one: %o",
    async (answer) => {
      await expect(fetchTaskCount(answering(jsonResponse(answer)))).rejects.toThrow();
    },
  );
});

describe("fetchStudentTasks", () => {
  it("GETs the Student's open Tasks", async () => {
    const fetchFn = answering(jsonResponse(pageOf([TASK])));

    const page = await fetchStudentTasks(uid(7), 1, fetchFn);

    expect(sent(fetchFn).path).toBe(`/api/students/${uid(7)}/tasks/?page=1`);
    expect(page.tasks).toEqual([TASK_IN_FRONTEND_NAMING]);
  });
});

describe("createTask", () => {
  it("POSTs the Task in API naming", async () => {
    const fetchFn = answering(jsonResponse(TASK, 201));

    const task = await createTask(
      {
        title: "Call Sita",
        dueOn: "2026-11-03",
        assigneeId: 5,
        studentId: uid(7),
        priority: "high",
        isOnlyMe: false,
      },
      fetchFn,
    );

    const { path, init } = sent(fetchFn);
    expect(path).toBe("/api/tasks/");
    expect(init?.method).toBe("POST");
    expect(typeof init?.body === "string" ? JSON.parse(init.body) : undefined).toEqual({
      title: "Call Sita",
      due_on: "2026-11-03",
      assignee: 5,
      student: uid(7),
      priority: "high",
      only_me: false,
    });
    expect(task).toEqual(TASK_IN_FRONTEND_NAMING);
  });

  it("sends no Student as null", async () => {
    const fetchFn = answering(jsonResponse({ ...TASK, student: null }, 201));

    await createTask(
      {
        title: "Call",
        dueOn: "2026-11-03",
        assigneeId: 5,
        studentId: null,
        priority: "normal",
        isOnlyMe: true,
      },
      fetchFn,
    );

    const body = sent(fetchFn).init?.body;
    expect(typeof body === "string" ? JSON.parse(body) : undefined).toMatchObject({
      student: null,
    });
  });

  it("names refused fields in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse(
        {
          title: ["Say what needs doing."],
          due_on: ["Enter a due date from today to 5 years ahead."],
          assignee: ["Choose who it's for from the list."],
          student: ["Choose a Student from the list."],
          priority: ["Choose High, Normal or Low."],
          only_me: ["Say whether only you should see it."],
        },
        400,
      ),
    );

    const error = await createTask(
      { title: "", dueOn: "", assigneeId: 0, studentId: null, priority: "normal", isOnlyMe: false },
      fetchFn,
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvalidFieldsError);
    expect(error instanceof InvalidFieldsError && error.fieldErrors).toEqual({
      title: ["Say what needs doing."],
      dueOn: ["Enter a due date from today to 5 years ahead."],
      assigneeId: ["Choose who it's for from the list."],
      studentId: ["Choose a Student from the list."],
      priority: ["Choose High, Normal or Low."],
      isOnlyMe: ["Say whether only you should see it."],
    });
  });
});

describe("setTaskDone", () => {
  it("PATCHes only the done flag", async () => {
    const fetchFn = answering(jsonResponse({ ...TASK, is_done: true, timing: "done" }));

    const task = await setTaskDone(31, true, fetchFn);

    const { path, init } = sent(fetchFn);
    expect(path).toBe("/api/tasks/31/");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ done: true }));
    expect(task.isDone).toBe(true);
  });

  it("rejects with the refusal when not allowed", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Only…" }, 403));

    await expect(setTaskDone(31, true, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("fetchTaskAssignees", () => {
  it("GETs who a Task can be given to", async () => {
    const fetchFn = answering(
      jsonResponse([
        { id: 5, name: "Bikash Thapa", role: "counsellor" },
        { id: 9, name: "Gita Lama", role: "teacher" },
      ]),
    );

    const people = await fetchTaskAssignees(fetchFn);

    expect(sent(fetchFn).path).toBe("/api/tasks/assignees/");
    expect(people).toEqual([
      { id: 5, name: "Bikash Thapa", role: "counsellor" },
      { id: 9, name: "Gita Lama", role: "teacher" },
    ]);
  });

  it("refuses an unknown Role", async () => {
    const fetchFn = answering(jsonResponse([{ id: 5, name: "Bikash", role: "owner" }]));

    await expect(fetchTaskAssignees(fetchFn)).rejects.toThrow();
  });
});
