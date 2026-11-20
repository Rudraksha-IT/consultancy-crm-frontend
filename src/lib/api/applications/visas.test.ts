import { PROFILE } from "@/test/studentProfile";

import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";
import { addVisaLetter, changeVisaStatus, setVisaDates, startVisa } from "./visas";
import { uid } from "@/test/ids";

const VISA = {
  id: uid(21),
  application_id: uid(11),
  university: { id: 3, name: "Deakin University" },
  course: { id: 4, name: "Master of IT", level: "master" },
  status: "applied",
  started_on: "2026-10-12",
  biometrics_at: null,
  medical_at: null,
  interview_at: null,
  documents: [],
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sent(fetchFn: ReturnType<typeof answering>) {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  return { path, method: init?.method, body: parsed(init?.body) };
}

function parsed(body: unknown): unknown {
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function fieldErrorsOf(error: unknown): unknown {
  if (!(error instanceof InvalidFieldsError)) throw new Error("expected InvalidFieldsError");
  return error.fieldErrors;
}

describe("startVisa", () => {
  it("POSTs the Application and returns the profile with the Visa in frontend naming", async () => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, visas: [VISA] }, 201));

    const profile = await startVisa(uid(7), uid(11), fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: `/api/students/${uid(7)}/visas/`,
      method: "POST",
      body: { application: uid(11) },
    });
    expect(profile.visas).toEqual([
      {
        id: uid(21),
        applicationId: uid(11),
        university: { id: 3, name: "Deakin University" },
        course: { id: 4, name: "Master of IT", level: "master" },
        status: "applied",
        startedOn: "2026-10-12",
        biometricsAt: null,
        medicalAt: null,
        interviewAt: null,
        documents: [],
      },
    ]);
  });

  it("names a refused Application", async () => {
    const message = "This Student already has a visa waiting for an answer.";
    const fetchFn = answering(jsonResponse({ application: [message] }, 400));

    const failure = await startVisa(uid(7), uid(11), fetchFn).catch((error: unknown) => error);

    expect(fieldErrorsOf(failure)).toEqual({ application: [message] });
  });

  it("passes on a refusal that isn't about the fields", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Not your Student." }, 403));

    await expect(startVisa(uid(7), uid(11), fetchFn)).rejects.toThrow(ApiRequestError);
  });

  it.each([
    ["an unknown Status", { ...VISA, status: "approved" }],
    ["a Status that is gone", { ...VISA, status: "lodged" }],
    ["a missing medical date", { ...VISA, medical_at: undefined }],
    ["a start date that isn't a date", { ...VISA, started_on: "<b>12 Oct</b>" }],
    ["a missing Application", { ...VISA, application_id: undefined }],
  ])("refuses an answer with %s", async (_, broken) => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, visas: [broken] }, 201));

    await expect(startVisa(uid(7), uid(11), fetchFn)).rejects.toThrow();
  });
});

describe("changeVisaStatus", () => {
  it("PATCHes the Status and returns the profile, with the Stage as it is now", async () => {
    const moved = { ...PROFILE, stage: "offer", visas: [{ ...VISA, status: "refused" }] };
    const fetchFn = answering(jsonResponse(moved));

    const profile = await changeVisaStatus(uid(7), uid(21), "refused", fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: `/api/students/${uid(7)}/visas/${uid(21)}/`,
      method: "PATCH",
      body: { status: "refused" },
    });
    expect(profile.stage).toBe("offer");
  });

  it("names a refused Status", async () => {
    const fetchFn = answering(jsonResponse({ status: ["The visa already has this status."] }, 400));

    const failure = await changeVisaStatus(uid(7), uid(21), "applied", fetchFn).catch(
      (error: unknown) => error,
    );

    expect(fieldErrorsOf(failure)).toEqual({ status: ["The visa already has this status."] });
  });
});

describe("setVisaDates", () => {
  it("PATCHes only the dates given, in office time, and returns the profile with them", async () => {
    const fetchFn = answering(
      jsonResponse({
        ...PROFILE,
        visas: [{ ...VISA, biometrics_at: "2026-11-20T14:00", interview_at: "2026-12-01T09:30" }],
      }),
    );

    const profile = await setVisaDates(
      uid(7),
      uid(21),
      { biometrics: "2026-11-20T14:00", medical: null },
      fetchFn,
    );

    expect(sent(fetchFn)).toEqual({
      path: `/api/students/${uid(7)}/visas/${uid(21)}/dates/`,
      method: "PATCH",
      body: { biometrics_at: "2026-11-20T14:00", medical_at: null },
    });
    expect(profile.visas[0]).toMatchObject({
      biometricsAt: "2026-11-20T14:00",
      medicalAt: null,
      interviewAt: "2026-12-01T09:30",
    });
  });

  it("names a refused date under its appointment", async () => {
    const message = "Pick today or a later day.";
    const fetchFn = answering(jsonResponse({ medical_at: [message] }, 400));

    const error: unknown = await setVisaDates(
      uid(7),
      uid(21),
      { medical: "2020-01-01T10:00" },
      fetchFn,
    ).catch((caught: unknown) => caught);

    expect(fieldErrorsOf(error)).toEqual({ medical: [message] });
  });

  it.each(["tomorrow", "2026-11-20", "<script>alert(1)</script>"])(
    "refuses an answer whose date is %s",
    async (broken) => {
      const fetchFn = answering(
        jsonResponse({ ...PROFILE, visas: [{ ...VISA, biometrics_at: broken }] }),
      );

      await expect(setVisaDates(uid(7), uid(21), { biometrics: null }, fetchFn)).rejects.toThrow();
    },
  );

  it("passes on a refusal that isn't about the fields", async () => {
    const message = "Only a visa waiting for an answer has dates to change.";
    const fetchFn = answering(jsonResponse({ detail: message }, 400));

    await expect(
      setVisaDates(uid(7), uid(21), { interview: null }, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("addVisaLetter", () => {
  const file = new File(["%PDF-1.7"], "grant.pdf", { type: "application/pdf" });

  function sentForm(fetchFn: ReturnType<typeof answering>): FormData {
    const form = fetchFn.mock.calls[0]?.[1]?.body;
    if (!(form instanceof FormData)) throw new Error("expected a form");
    return form;
  }

  it("POSTs a form with the result and the file, and returns the profile", async () => {
    const granted = { ...PROFILE, stage: "visa", visas: [{ ...VISA, status: "granted" }] };
    const fetchFn = answering(jsonResponse(granted, 201));

    const profile = await addVisaLetter(uid(7), uid(21), { result: "granted", file }, fetchFn);

    expect(sent(fetchFn)).toMatchObject({
      path: `/api/students/${uid(7)}/visas/${uid(21)}/letter/`,
      method: "POST",
    });
    const form = sentForm(fetchFn);
    expect([...form.keys()]).toEqual(["result", "file"]);
    expect(form.get("result")).toBe("granted");
    expect(form.get("file")).toBeInstanceOf(File);
    expect(profile.visas[0]?.status).toBe("granted");
  });

  it("sends no result for a letter added later", async () => {
    const fetchFn = answering(jsonResponse(PROFILE, 201));

    await addVisaLetter(uid(7), uid(21), { result: null, file }, fetchFn);

    expect([...sentForm(fetchFn).keys()]).toEqual(["file"]);
  });

  it("names each refused field", async () => {
    const fetchFn = answering(
      jsonResponse(
        {
          result: ["Choose Granted or Refused."],
          file: ["Upload a PDF, JPG or PNG file."],
        },
        400,
      ),
    );

    const failure = await addVisaLetter(uid(7), uid(21), { result: null, file }, fetchFn).catch(
      (error: unknown) => error,
    );

    expect(fieldErrorsOf(failure)).toEqual({
      result: ["Choose Granted or Refused."],
      file: ["Upload a PDF, JPG or PNG file."],
    });
  });

  it("passes on a refusal that isn't about the fields", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Not found." }, 404));

    const failure = await addVisaLetter(
      uid(7),
      uid(21),
      { result: "refused", file },
      fetchFn,
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiRequestError);
  });
});
