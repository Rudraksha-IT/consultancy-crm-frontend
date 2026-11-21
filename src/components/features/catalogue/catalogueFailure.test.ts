import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { SESSION_TEXT } from "@/constants/session";
import { ApiRequestError } from "@/lib/api";

import { catalogueFailure } from "./catalogueFailure";

describe("catalogueFailure", () => {
  it("says the app is being updated when that is why it failed (ticket 14)", () => {
    const error = new ApiRequestError("/api/x/", 503, {
      detail: SESSION_TEXT.updating,
      code: "updating",
    });
    expect(catalogueFailure(error)).toBe(SESSION_TEXT.updating);
  });

  it("keeps not-an-Admin and the usual words otherwise", () => {
    expect(catalogueFailure(new ApiRequestError("/api/x/", 403))).toBe(CATALOGUE_TEXT.notAdmin);
    expect(catalogueFailure(new ApiRequestError("/api/x/", 500))).toBe(CATALOGUE_TEXT.changeFailed);
  });
});
