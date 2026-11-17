import { nextLoginStep } from "./loginStep";
import { jsonResponse } from "./test-helpers";

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

describe("nextLoginStep (issue 66)", () => {
  it.each([
    ["staff", "/api/auth/login/next/"],
    ["platform", "/api/platform/auth/login/next/"],
  ] as const)("asks the %s side what comes after the email", async (side, path) => {
    const fetchFn = answering(jsonResponse({ next: "join" }));

    await expect(nextLoginStep(side, "sita@acme.test", fetchFn)).resolves.toBe("join");
    expect(fetchFn).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "sita@acme.test" }),
      }),
    );
  });

  it("refuses any other answer", async () => {
    await expect(
      nextLoginStep("staff", "a@b.test", answering(jsonResponse({ next: "admin" }))),
    ).rejects.toThrow();
  });
});
