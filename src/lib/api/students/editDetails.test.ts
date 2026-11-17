import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { saveEditDetails, type EditDetailsInput } from "./editDetails";
import { fetchStudentProfile } from "./studentProfile";
import { PROFILE } from "@/test/studentProfile";

import { jsonResponse } from "../core/test-helpers";

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function sentBody(fetchFn: ReturnType<typeof answering>): unknown {
  const init = fetchFn.mock.calls[0]?.[1];
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

const ADDRESS = { province: "gandaki", district: "Kaski", municipality: "", ward: "6", street: "" };

const INPUT: EditDetailsInput = {
  version: 3,
  details: {
    name: "Sita Karki",
    dateOfBirth: "",
    passportExpiryDate: "2031-01-01",
    permanentAddress: ADDRESS,
    mailingSameAsPermanent: true,
  },
  academicRecords: [
    { id: 1, level: "bachelor", institution: "TU", finishedYear: "2024", result: "" },
    { id: null, level: "see", institution: "BNKS", finishedYear: "", result: "A" },
  ],
  testScores: [{ id: null, test: "pte", overall: " 65 ", takenOn: "", details: "" }],
  workExperience: [
    { id: 2, employer: "Bir", jobTitle: "Nurse", startedOn: "2024-04", endedOn: "" },
  ],
};

describe("the profile", () => {
  it("carries the details version and whether the viewer may edit details", async () => {
    const profile = await fetchStudentProfile(7, answering(jsonResponse(PROFILE)));

    expect(profile.detailsVersion).toBe(3);
    expect(profile.canEditDetails).toBe(true);
  });
});

describe("saveEditDetails", () => {
  it("puts every field and the three whole lists in API naming", async () => {
    const fetchFn = answering(jsonResponse(PROFILE));

    const saved = await saveEditDetails(7, INPUT, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/students/7/details/");
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("PUT");
    expect(sentBody(fetchFn)).toEqual({
      version: 3,
      name: "Sita Karki",
      date_of_birth: null,
      passport_expiry_date: "2031-01-01",
      permanent_address: { ...ADDRESS, ward: 6 },
      mailing_same_as_permanent: true,
      academic_records: [
        { id: 1, level: "bachelor", institution: "TU", finished_year: 2024, result: "" },
        { level: "see", institution: "BNKS", finished_year: null, result: "A" },
      ],
      test_scores: [{ test: "pte", overall: "65", taken_on: null, details: "" }],
      work_experience: [
        { id: 2, employer: "Bir", job_title: "Nurse", started_on: "2024-04", ended_on: null },
      ],
    });
    expect(saved.id).toBe(7);
  });

  it("sends a separate mailing address, an empty ward as null and a typed one as typed", async () => {
    const fetchFn = answering(jsonResponse(PROFILE));
    const empty = { province: "", district: "", municipality: "", street: "" };

    await saveEditDetails(
      7,
      {
        ...INPUT,
        details: {
          permanentAddress: { ...empty, ward: "6a" },
          mailingAddress: { ...empty, ward: "" },
          mailingSameAsPermanent: false,
          passportIssueDate: "2017-03-11",
          passportExpiryDate: "",
        },
      },
      fetchFn,
    );

    expect(sentBody(fetchFn)).toMatchObject({
      permanent_address: { ...empty, ward: "6a" },
      mailing_address: { ...empty, ward: null },
      mailing_same_as_permanent: false,
      passport_issue_date: "2017-03-11",
      passport_expiry_date: null,
    });
  });

  it("passes on a refusal that isn't about fields", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Not your Student." }, 403));

    await expect(saveEditDetails(7, INPUT, fetchFn)).rejects.toMatchObject({ status: 403 });
  });

  it("names refused fields and rows in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse(
        {
          name: ["Enter the Student's name."],
          permanent_address: { ward: ["A ward number is a whole number from 1 to 35."] },
          academic_records: { "1": { institution: ["This field may not be blank."] } },
          test_scores: { non_field_errors: ["Ensure this field has no more than 20 elements."] },
          work_experience: { "0": { ended_on: ["The end can't be before the start."] } },
        },
        400,
      ),
    );

    const error: unknown = await saveEditDetails(7, INPUT, fetchFn).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(InvalidFieldsError);
    expect(error instanceof InvalidFieldsError ? error.fieldErrors : null).toEqual({
      name: ["Enter the Student's name."],
      "permanentAddress.ward": ["A ward number is a whole number from 1 to 35."],
      "academicRecords.1.institution": ["This field may not be blank."],
      testScores: ["Ensure this field has no more than 20 elements."],
      "workExperience.0.endedOn": ["The end can't be before the start."],
    });
  });

  it("passes on someone else's change (409) as it came", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "Someone else just changed this Student. Refresh the page." }, 409),
    );

    const error: unknown = await saveEditDetails(7, INPUT, fetchFn).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error instanceof ApiRequestError ? error.status : null).toBe(409);
  });

  it("refuses an answer of the wrong shape", async () => {
    const fetchFn = answering(jsonResponse({ ...PROFILE, details_version: "3" }));

    await expect(saveEditDetails(7, INPUT, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});
