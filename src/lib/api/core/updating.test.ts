import { SESSION_TEXT } from "@/constants/session";

import { ApiRequestError } from "./errors";
import { updatingOr } from "./updating";

const UPDATING = { detail: SESSION_TEXT.updating, code: "updating" };

describe("updatingOr", () => {
  it("says the app is being updated when that is why the call failed", () => {
    expect(updatingOr(new ApiRequestError("/api/clock/in/", 503, UPDATING), "Nope.")).toBe(
      SESSION_TEXT.updating,
    );
  });

  it.each([
    ["another 503", new ApiRequestError("/api/x/", 503, { detail: "Files can't be fetched." })],
    ["a 503 with no body", new ApiRequestError("/api/x/", 503)],
    ["a 500", new ApiRequestError("/api/x/", 500, UPDATING)],
    ["no answer at all", new ApiRequestError("/api/x/", null)],
    ["a refusal", new ApiRequestError("/api/x/", 400, { detail: "No." })],
    ["something else", new Error("boom")],
    ["not an error", "boom"],
  ])("keeps the screen's own words for %s", (_case, error) => {
    expect(updatingOr(error, "That didn't work. Try again.")).toBe("That didn't work. Try again.");
  });
});
