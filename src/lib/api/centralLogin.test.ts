import { requestOfficeLinks } from "./centralLogin";
import { ApiRequestError } from "./errors";
import { jsonResponse } from "./test-helpers";

const SAME_ANSWER = { detail: "If this email belongs to an office, we've sent it a link." };

describe("requestOfficeLinks", () => {
  it("posts the email to the Central login", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(SAME_ANSWER, 202));

    await requestOfficeLinks("sita@example.com", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/central-login/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "sita@example.com" }),
      }),
    );
  });

  it("rejects an answer of the wrong shape", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ offices: [] }, 202));

    await expect(requestOfficeLinks("sita@example.com", fetchFn)).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it("passes on a refusal with its status", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ detail: "x" }, 429));

    await expect(requestOfficeLinks("sita@example.com", fetchFn)).rejects.toMatchObject({
      status: 429,
    });
  });
});
