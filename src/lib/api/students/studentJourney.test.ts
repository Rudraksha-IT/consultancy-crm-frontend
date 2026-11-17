import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { assignCounsellor, setStage, transferStudent } from "./studentJourney";
import { PROFILE } from "@/test/studentProfile";

import { jsonResponse } from "../core/test-helpers";

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function sent(fetchFn: ReturnType<typeof answering>) {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  const body = init?.body;
  return {
    path,
    method: init?.method,
    body: parsed(body),
  };
}

function parsed(body: unknown): unknown {
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function fieldErrorsOf(error: unknown): unknown {
  if (!(error instanceof InvalidFieldsError)) throw new Error("expected InvalidFieldsError");
  return error.fieldErrors;
}

describe("setStage", () => {
  it("POSTs the Stage and returns the profile", async () => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, stage: "lead" }));

    const profile = await setStage(7, { stage: "lead" }, fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: "/api/students/7/stage/",
      method: "POST",
      body: { stage: "lead" },
    });
    expect(profile.stage).toBe("lead");
  });

  it("sends the reason with Lost", async () => {
    const fetchFn = answering(
      jsonResponse({ ...PROFILE, stage: "lost", lost_reason: "Moved away." }),
    );

    const profile = await setStage(7, { stage: "lost", lostReason: "Moved away." }, fetchFn);

    expect(sent(fetchFn).body).toEqual({ stage: "lost", lost_reason: "Moved away." });
    expect(profile.lostReason).toBe("Moved away.");
  });

  it("names a refused reason in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({ lost_reason: ["Say why we lost this Student."] }, 400),
    );

    const error: unknown = await setStage(7, { stage: "lost", lostReason: "" }, fetchFn).catch(
      (caught: unknown) => caught,
    );

    expect(fieldErrorsOf(error)).toEqual({ lostReason: ["Say why we lost this Student."] });
  });

  it("passes on a refusal that isn't about fields", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Not your Student." }, 403));

    await expect(setStage(7, { stage: "lead" }, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("assignCounsellor", () => {
  it("POSTs the counsellor's id and returns the profile", async () => {
    const fetchFn = answering(jsonResponse(PROFILE));

    const profile = await assignCounsellor(7, 5, fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: "/api/students/7/assign/",
      method: "POST",
      body: { counsellor: 5 },
    });
    expect(profile.assignedCounsellor).toEqual({ id: 5, name: "Bikash Thapa" });
  });

  it("names a refused counsellor", async () => {
    const fetchFn = answering(jsonResponse({ counsellor: ["Choose a counsellor."] }, 400));

    const error: unknown = await assignCounsellor(7, 9, fetchFn).catch((caught: unknown) => caught);

    expect(fieldErrorsOf(error)).toEqual({ counsellor: ["Choose a counsellor."] });
  });
});

describe("transferStudent", () => {
  it("POSTs the new counsellor's id and returns the profile", async () => {
    const fetchFn = answering(jsonResponse(PROFILE));

    await transferStudent(7, 5, fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: "/api/students/7/transfer/",
      method: "POST",
      body: { counsellor: 5 },
    });
  });

  it("refuses an answer of the wrong shape", async () => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, can_transfer: "yes" }));

    await expect(transferStudent(7, 5, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});
