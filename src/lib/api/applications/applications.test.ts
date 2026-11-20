import { PROFILE } from "@/test/studentProfile";

import {
  addApplication,
  addOfferLetter,
  changeApplicationStatus,
  chooseOffer,
  fetchPickableUniversities,
} from "./applications";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";
import { uid } from "@/test/ids";

const APPLICATION = {
  id: uid(11),
  university: { id: uid(3), name: "Deakin University" },
  course: { id: uid(4), name: "Master of IT", level: "master" },
  intake: "2027-03",
  status: "applied",
  offer_kind: "",
  offered_on: null,
  course_files: [],
  offer_letter: null,
  documents: [],
};

function answering(...responses: Response[]) {
  const fetchFn = vi.fn<typeof fetch>();
  for (const response of responses) fetchFn.mockResolvedValueOnce(response);
  return fetchFn;
}

function sent(fetchFn: ReturnType<typeof answering>, call = 0) {
  const [path, init] = fetchFn.mock.calls[call] ?? [];
  return { path, method: init?.method, body: parsed(init?.body) };
}

function parsed(body: unknown): unknown {
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function fieldErrorsOf(error: unknown): unknown {
  if (!(error instanceof InvalidFieldsError)) throw new Error("expected InvalidFieldsError");
  return error.fieldErrors;
}

function university(n: number, courses: unknown[] = []) {
  return {
    id: uid(n),
    name: `University ${String(n)}`,
    country: "australia",
    archived: false,
    documents: [],
    courses,
  };
}

function page(pageNumber: number, count: number, results: unknown[]) {
  return jsonResponse({ count, page: pageNumber, page_size: 25, results });
}

describe("addApplication", () => {
  it("POSTs the course and intake and returns the profile with the Application", async () => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, applications: [APPLICATION] }, 201));

    const profile = await addApplication(uid(7), { courseId: uid(4), intake: "2027-03" }, fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: `/api/students/${uid(7)}/applications/`,
      method: "POST",
      body: { course: uid(4), intake: "2027-03" },
    });
    expect(profile.applications).toEqual([
      {
        id: uid(11),
        university: APPLICATION.university,
        course: APPLICATION.course,
        intake: "2027-03",
        status: "applied",
        offer_kind: "",
        offeredOn: null,
        offerLetter: null,
        documents: [],
        courseFiles: [],
      },
    ]);
  });

  it("names the refused fields in the form's own names", async () => {
    const fetchFn = answering(
      jsonResponse({ intake: ["Choose one of this course's intakes."] }, 400),
    );

    const failure = await addApplication(
      uid(7),
      { courseId: uid(4), intake: "2027-04" },
      fetchFn,
    ).catch((error: unknown) => error);

    expect(fieldErrorsOf(failure)).toEqual({
      intake: ["Choose one of this course's intakes."],
    });
  });

  it("passes on a refusal that isn't about the fields", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Not your Student." }, 403));

    await expect(
      addApplication(uid(7), { courseId: uid(4), intake: "2027-03" }, fetchFn),
    ).rejects.toThrow(ApiRequestError);
  });

  it("refuses an answer whose Application isn't what the API promises", async () => {
    const broken = { ...APPLICATION, status: "approved" };
    const fetchFn = answering(jsonResponse({ ...PROFILE, applications: [broken] }, 201));

    await expect(
      addApplication(uid(7), { courseId: uid(4), intake: "2027-03" }, fetchFn),
    ).rejects.toThrow();
  });
});

describe("changeApplicationStatus", () => {
  it("PATCHes the Status and returns the profile, with the Stage as it is now", async () => {
    const moved = { ...PROFILE, stage: "applying", applications: [APPLICATION] };
    const fetchFn = answering(jsonResponse(moved));

    const profile = await changeApplicationStatus(uid(7), uid(11), "rejected", fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: `/api/students/${uid(7)}/applications/${uid(11)}/`,
      method: "PATCH",
      body: { status: "rejected" },
    });
    expect(profile.stage).toBe("applying");
  });

  it("names a refused Status", async () => {
    const fetchFn = answering(
      jsonResponse({ status: ["The application already has this status."] }, 400),
    );

    const failure = await changeApplicationStatus(uid(7), uid(11), "applied", fetchFn).catch(
      (error: unknown) => error,
    );

    expect(fieldErrorsOf(failure)).toEqual({
      status: ["The application already has this status."],
    });
  });
});

describe("an Application in a profile", () => {
  it("keeps the kind of offer, Conditional or Unconditional", async () => {
    const offer = { ...APPLICATION, status: "offer", offer_kind: "conditional" };
    const fetchFn = answering(jsonResponse({ ...PROFILE, applications: [offer] }));

    const profile = await changeApplicationStatus(uid(7), uid(11), "applied", fetchFn);

    expect(profile.applications[0]).toMatchObject({ status: "offer", offer_kind: "conditional" });
  });

  it.each([
    ["a Status that is gone", { ...APPLICATION, status: "coe_received" }],
    ["an unknown kind of offer", { ...APPLICATION, status: "offer", offer_kind: "maybe" }],
    ["a missing kind of offer", { ...APPLICATION, offer_kind: undefined }],
    ["an offer day that isn't a date", { ...APPLICATION, offered_on: "10/10/2026" }],
    ["a missing offer day", { ...APPLICATION, offered_on: undefined }],
    ["an offer letter without its name", { ...APPLICATION, offer_letter: { id: uid(3) } }],
    ["a missing offer letter", { ...APPLICATION, offer_letter: undefined }],
  ])("refuses %s", async (_case, application) => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, applications: [application] }));

    await expect(changeApplicationStatus(uid(7), uid(11), "applied", fetchFn)).rejects.toThrow();
  });
});

describe("an offer in a profile", () => {
  it("gives the day and the letter, and which offer is chosen", async () => {
    const offer = {
      ...APPLICATION,
      status: "offer",
      offer_kind: "conditional",
      offered_on: "2026-10-10",
      offer_letter: { id: uid(31), files: [{ id: uid(51), file_name: "offer.pdf" }] },
    };
    const fetchFn = answering(
      jsonResponse({ ...PROFILE, applications: [offer], chosen_offer_id: uid(11) }),
    );

    const profile = await chooseOffer(uid(7), uid(11), fetchFn);

    expect(profile.chosenOfferId).toBe(uid(11));
    expect(profile.applications[0]).toMatchObject({
      offeredOn: "2026-10-10",
      offerLetter: { id: uid(31), files: [{ id: uid(51), fileName: "offer.pdf" }] },
    });
  });

  it.each([
    ["a missing chosen offer", undefined],
    ["a chosen offer that isn't an id", "11"],
  ])("refuses %s", async (_case, chosen) => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, chosen_offer_id: chosen }));

    await expect(chooseOffer(uid(7), uid(11), fetchFn)).rejects.toThrow();
  });
});

describe("chooseOffer", () => {
  it("PUTs the application", async () => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, chosen_offer_id: uid(11) }));

    await chooseOffer(uid(7), uid(11), fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: `/api/students/${uid(7)}/chosen-offer/`,
      method: "PUT",
      body: { application: uid(11) },
    });
  });

  it("names the refused field", async () => {
    const message = "This offer is already chosen.";
    const fetchFn = answering(jsonResponse({ application: [message] }, 400));

    const failure = await chooseOffer(uid(7), uid(11), fetchFn).catch((error: unknown) => error);

    expect(fieldErrorsOf(failure)).toEqual({ application: [message] });
  });
});

describe("addOfferLetter", () => {
  const file = new File(["%PDF-1.7"], "offer.pdf", { type: "application/pdf" });

  it("POSTs a form with the application, the kind and the file", async () => {
    const fetchFn = answering(jsonResponse(PROFILE, 201));

    await addOfferLetter(uid(7), { applicationId: uid(11), kind: "unconditional", file }, fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe(`/api/students/${uid(7)}/offer-letters/`);
    expect(init?.method).toBe("POST");
    const form = init?.body;
    if (!(form instanceof FormData)) throw new Error("expected a form");
    expect([...form.keys()]).toEqual(["application", "kind", "file"]);
    expect(form.get("application")).toBe(uid(11));
    expect(form.get("kind")).toBe("unconditional");
    expect(form.get("file")).toBeInstanceOf(File);
  });

  it("names each refused field", async () => {
    const fetchFn = answering(
      jsonResponse(
        {
          application: ["Choose an application waiting for an offer."],
          kind: ["Choose Conditional or Unconditional."],
          file: ["Upload a PDF, JPG or PNG file."],
        },
        400,
      ),
    );

    const failure = await addOfferLetter(
      uid(7),
      { applicationId: uid(11), kind: "conditional", file },
      fetchFn,
    ).catch((error: unknown) => error);

    expect(fieldErrorsOf(failure)).toEqual({
      application: ["Choose an application waiting for an offer."],
      kind: ["Choose Conditional or Unconditional."],
      file: ["Upload a PDF, JPG or PNG file."],
    });
  });
});

describe("fetchPickableUniversities", () => {
  it("reads every page of active Universities", async () => {
    const first = Array.from({ length: 25 }, (_, index) => university(index + 1));
    const fetchFn = answering(page(1, 27, first), page(2, 27, [university(26), university(27)]));

    const universities = await fetchPickableUniversities(fetchFn);

    expect(universities).toHaveLength(27);
    expect(sent(fetchFn, 0)).toEqual({
      path: "/api/catalogue/universities/",
      method: undefined,
      body: undefined,
    });
    expect(sent(fetchFn, 1).path).toBe("/api/catalogue/universities/?page=2");
  });

  it("stops after one page when that is all there is", async () => {
    const fetchFn = answering(page(1, 1, [university(1)]));

    await fetchPickableUniversities(fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("stops at the page limit even if the count says there are more", async () => {
    const fetchFn = vi.fn<typeof fetch>((path) => {
      const pageNumber = Number(
        /page=(\d+)/.exec(typeof path === "string" ? path : "")?.[1] ?? "1",
      );
      return Promise.resolve(page(pageNumber, 1_000_000, [university(pageNumber)]));
    });

    const universities = await fetchPickableUniversities(fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(40);
    expect(universities).toHaveLength(40);
  });
});
