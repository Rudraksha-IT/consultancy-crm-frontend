import { SESSION_TEXT } from "@/constants/session";
import { WORK_FROM_HOME_TEXT } from "@/constants/workFromHome";
import { ApiRequestError, WorkFromHomeRefusedError } from "@/lib/api";

import { workFromHomeFailure } from "./workFromHomeFailure";

describe("workFromHomeFailure", () => {
  it("says the app is being updated when that is why it failed (ticket 14)", () => {
    const error = new ApiRequestError("/api/x/", 503, {
      detail: SESSION_TEXT.updating,
      code: "updating",
    });
    expect(workFromHomeFailure(error)).toBe(SESSION_TEXT.updating);
  });

  it("keeps the server's reason, and the usual words otherwise", () => {
    expect(workFromHomeFailure(new WorkFromHomeRefusedError("Not those dates."))).toBe(
      "Not those dates.",
    );
    expect(workFromHomeFailure(new ApiRequestError("/api/x/", 500))).toBe(
      WORK_FROM_HOME_TEXT.changeFailed,
    );
  });
});
