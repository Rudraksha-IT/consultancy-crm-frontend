import { SESSION_TEXT } from "@/constants/session";
import { TRANSFER_TEXT } from "@/constants/transferRequests";
import { ApiRequestError } from "@/lib/api";

import { transferFailure } from "./transferFailure";

describe("transferFailure", () => {
  it("says the app is being updated when that is why it failed (ticket 14)", () => {
    const error = new ApiRequestError("/api/x/", 503, {
      detail: SESSION_TEXT.updating,
      code: "updating",
    });
    expect(transferFailure(error)).toBe(SESSION_TEXT.updating);
  });

  it("keeps the server's reason, and the usual words otherwise", () => {
    expect(transferFailure(new ApiRequestError("/api/x/", 409, { detail: "Already asked." }))).toBe(
      "Already asked.",
    );
    expect(transferFailure(new ApiRequestError("/api/x/", 500))).toBe(TRANSFER_TEXT.changeFailed);
  });
});
