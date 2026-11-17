import { removeLogo, setShowNameBesideLogo, updateDateDisplay, uploadLogo } from "./configuration";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";

describe("updateDateDisplay", () => {
  it("puts the choice to the Configuration and returns it as stored", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ date_display: "BS" }));

    await expect(updateDateDisplay("BS", fetchFn)).resolves.toBe("BS");
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/configuration/dates/",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ date_display: "BS" }) }),
    );
  });

  it.each([{ date_display: "NS" }, { date_display: 1 }, {}, ["BS"]])(
    "refuses an answer that isn't AD or BS: %j",
    async (answer) => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(answer));

      await expect(updateDateDisplay("AD", fetchFn)).rejects.toThrow();
    },
  );

  it("passes a refusal through", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ detail: "Only an Admin can change the Configuration." }, 403),
      );

    await expect(updateDateDisplay("BS", fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

const LOGO_ANSWER = { logo: { url: "/api/consultancy/logo/2/", show_name: true } };
const LOGO = { url: "/api/consultancy/logo/2/", showName: true };

describe("uploadLogo", () => {
  it("posts the file as a form and returns the logo as the screens show it", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(LOGO_ANSWER));
    const file = new File(["png"], "logo.png", { type: "image/png" });

    await expect(uploadLogo(file, fetchFn)).resolves.toEqual(LOGO);
    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/configuration/logo/");
    expect(init?.method).toBe("POST");
    const body = init?.body;
    if (!(body instanceof FormData)) throw new Error("expected a form");
    expect([...body.keys()]).toEqual(["file"]);
    expect(body.get("file")).toBe(file);
  });

  it("turns a refused file into a field error with the server's words", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ file: ["Upload a PNG, SVG, JPG or WebP image."] }, 400));

    const refusal = uploadLogo(new File(["x"], "x.png"), fetchFn);

    await expect(refusal).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(refusal).rejects.toMatchObject({
      fieldErrors: { file: ["Upload a PNG, SVG, JPG or WebP image."] },
    });
  });

  it.each([{}, { logo: null }, { logo: { url: "https://evil.test/x.png", show_name: true } }])(
    "refuses an answer without our logo: %j",
    async (answer) => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(answer));

      await expect(uploadLogo(new File(["x"], "x.png"), fetchFn)).rejects.toThrow();
    },
  );
});

describe("setShowNameBesideLogo", () => {
  it("patches the choice and returns the logo", async () => {
    const answer = { logo: { url: "/api/consultancy/logo/2/", show_name: false } };
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(answer));

    await expect(setShowNameBesideLogo(false, fetchFn)).resolves.toEqual({
      ...LOGO,
      showName: false,
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/configuration/logo/",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ show_name: false }) }),
    );
  });
});

describe("removeLogo", () => {
  it("deletes the logo", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));

    await expect(removeLogo(fetchFn)).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/configuration/logo/",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("passes a refusal through", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ detail: "x" }, 403));

    await expect(removeLogo(fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});
