import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import {
  addFeeType,
  changeFeeType,
  deleteFeeType,
  describeFeeType,
  feeTypeRefusal,
  fetchFeeTypes,
  reorderFeeTypes,
} from "./feeTypes";
import { jsonResponse } from "../core/test-helpers";

const VISA = {
  id: 3,
  name: "Visa fee",
  hidden: false,
  other: false,
  uses: { fees: 2, payments: 5 },
};
const OTHER = { id: 7, name: "Other", hidden: false, other: true, uses: null };

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sentBody(fetchFn: ReturnType<typeof answering>): unknown {
  const init = fetchFn.mock.calls[0]?.[1];
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

describe("fetchFeeTypes", () => {
  it("reads the list in frontend naming", async () => {
    const fetchFn = answering(jsonResponse({ results: [VISA, OTHER] }));

    const types = await fetchFeeTypes(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/fee-types/");
    expect(types).toEqual([
      { id: 3, name: "Visa fee", hidden: false, isOther: false, uses: { fees: 2, payments: 5 } },
      { id: 7, name: "Other", hidden: false, isOther: true, uses: null },
    ]);
  });

  it("refuses an answer of the wrong shape", async () => {
    const fetchFn = answering(jsonResponse({ results: [{ ...VISA, hidden: "no" }] }));

    await expect(fetchFeeTypes(fetchFn)).rejects.toThrow();
  });
});

describe("addFeeType", () => {
  it("POSTs the name and returns the new Fee Type", async () => {
    const fetchFn = answering(jsonResponse({ ...VISA, id: 9, name: "Japanese class" }, 201));

    const added = await addFeeType("Japanese class", fetchFn);

    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(sentBody(fetchFn)).toEqual({ name: "Japanese class" });
    expect(added.name).toBe("Japanese class");
  });

  it("names a refused name", async () => {
    const message = "There is already a Fee Type with this name.";
    const fetchFn = answering(jsonResponse({ name: [message] }, 400));

    const error: unknown = await addFeeType("Visa fee", fetchFn).catch((e: unknown) => e);

    if (!(error instanceof InvalidFieldsError)) throw new Error("expected InvalidFieldsError");
    expect(error.fieldErrors).toEqual({ name: [message] });
  });
});

describe("changeFeeType", () => {
  it("PATCHes only what changes", async () => {
    const fetchFn = answering(jsonResponse({ ...VISA, hidden: true }));

    const changed = await changeFeeType(3, { hidden: true }, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/fee-types/3/");
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expect(sentBody(fetchFn)).toEqual({ hidden: true });
    expect(changed.hidden).toBe(true);
  });

  it("passes on a refusal with its reason", async () => {
    const detail = "Other is always there. It can't be renamed, hidden or deleted.";
    const fetchFn = answering(jsonResponse({ detail }, 400));

    const error: unknown = await changeFeeType(7, { name: "X" }, fetchFn).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(feeTypeRefusal(error)).toBe(detail);
  });

  it("has no reason for other failures", () => {
    expect(feeTypeRefusal(new Error("offline"))).toBeNull();
    expect(
      feeTypeRefusal(new ApiRequestError("/api/fee-types/3/", 400, { name: ["x"] })),
    ).toBeNull();
  });
});

describe("deleteFeeType", () => {
  it("DELETEs the Fee Type", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await deleteFeeType(3, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/fee-types/3/");
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("DELETE");
  });
});

describe("reorderFeeTypes", () => {
  it("PUTs every id in order and returns the list", async () => {
    const fetchFn = answering(jsonResponse({ results: [VISA, OTHER] }));

    const types = await reorderFeeTypes([3, 7], fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/fee-types/order/");
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("PUT");
    expect(sentBody(fetchFn)).toEqual({ order: [3, 7] });
    expect(types.map((type) => type.id)).toEqual([3, 7]);
  });
});

describe("describeFeeType", () => {
  it("adds the note in brackets when there is one", () => {
    expect(describeFeeType({ id: 3, name: "Visa fee" }, "first half")).toBe(
      "Visa fee (first half)",
    );
    expect(describeFeeType({ id: 3, name: "Visa fee" }, "")).toBe("Visa fee");
  });
});
