import { ApiRequestError, InvalidFieldsError } from "./errors";
import { addConsultancyAdmin, fetchProductDomain } from "./officeAdmins";
import { jsonResponse } from "./test-helpers";

const ADMIN = { name: "Sita Sharma", email: "sita@acme.test" };

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function fieldErrorsOf(error: unknown): unknown {
  if (!(error instanceof InvalidFieldsError)) throw new Error("expected field errors");
  return error.fieldErrors;
}

describe("fetchProductDomain (issue 64)", () => {
  it("returns the product domain the backend is set up with", async () => {
    const fetchFn = answering(jsonResponse({ product_domain: "crm.example.com" }));

    await expect(fetchProductDomain(fetchFn)).resolves.toBe("crm.example.com");
    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/platform/product-domain/");
  });

  it.each([
    { product_domain: "" },
    { product_domain: "crm.example.com/evil" },
    { product_domain: "<b>crm</b>" },
    { product_domain: 7 },
    {},
  ])("refuses an answer that isn't a host name: %j", async (answer) => {
    await expect(fetchProductDomain(answering(jsonResponse(answer)))).rejects.toThrow();
  });
});

describe("addConsultancyAdmin (issue 64)", () => {
  it("posts the name and email to the office's admins and returns the invited Admin", async () => {
    const fetchFn = answering(jsonResponse({ ...ADMIN, status: "invited" }, 201));

    await expect(addConsultancyAdmin(3, ADMIN, fetchFn)).resolves.toEqual({
      ...ADMIN,
      status: "invited",
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/consultancies/3/admins/",
      expect.objectContaining({ method: "POST", body: JSON.stringify(ADMIN) }),
    );
  });

  it("rejects with the refused fields", async () => {
    const refused = jsonResponse({ email: ["Someone here already uses this email."] }, 400);

    const error: unknown = await addConsultancyAdmin(3, ADMIN, answering(refused)).catch(
      (caught: unknown) => caught,
    );

    expect(fieldErrorsOf(error)).toEqual({ email: ["Someone here already uses this email."] });
  });

  it("rejects with the reason when the office can't take an Admin", async () => {
    const refused = jsonResponse({ detail: "A Terminated Consultancy can't be changed." }, 400);

    const error: unknown = await addConsultancyAdmin(3, ADMIN, answering(refused)).catch(
      (caught: unknown) => caught,
    );

    expect(fieldErrorsOf(error)).toEqual({
      detail: ["A Terminated Consultancy can't be changed."],
    });
  });

  it("passes any other failure through", async () => {
    await expect(
      addConsultancyAdmin(3, ADMIN, answering(jsonResponse({ detail: "no" }, 403))),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("refuses an answer of the wrong shape", async () => {
    await expect(
      addConsultancyAdmin(3, ADMIN, answering(jsonResponse({ access: "x" }, 201))),
    ).rejects.toThrow();
  });
});
