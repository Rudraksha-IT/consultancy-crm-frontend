import { uid } from "@/test/ids";
import {
  ApiRequestError,
  InvalidCodeError,
  InvalidFieldsError,
  PasswordRulesNotMetError,
} from "../core/errors";
import {
  checkPlatformJoinCode,
  completePlatformJoin,
  deactivatePlatformAdmin,
  fetchPlatformAdmins,
  fetchProductLogo,
  invitePlatformAdmin,
  reactivatePlatformAdmin,
  removeProductLogo,
  requestPlatformJoinCode,
  resendPlatformAdminCode,
  uploadProductLogo,
} from "./platformTeam";
import { jsonResponse } from "../core/test-helpers";

const ROW = {
  id: uid(2),
  name: "Rita Shrestha",
  email: "rita@platform.test",
  status: "invited",
  two_factor_required: false,
  two_factor_set_up: false,
  is_me: false,
};
const ADMIN = {
  id: uid(2),
  name: "Rita Shrestha",
  email: "rita@platform.test",
  status: "invited",
  twoFactorRequired: false,
  twoFactorSetUp: false,
  isMe: false,
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function call(fetchFn: ReturnType<typeof answering>) {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  return { path, method: init?.method ?? "GET", body: bodyOf(init?.body) };
}

function bodyOf(body: BodyInit | null | undefined): unknown {
  if (typeof body !== "string") return body;
  const parsed: unknown = JSON.parse(body);
  return parsed;
}

async function caught(promise: Promise<unknown>): Promise<unknown> {
  return promise.catch((error: unknown) => error);
}

describe("the Platform Admins tab (issue 65)", () => {
  it("lists every Platform Admin", async () => {
    const fetchFn = answering(jsonResponse([ROW]));

    await expect(fetchPlatformAdmins(fetchFn)).resolves.toEqual([ADMIN]);
    expect(call(fetchFn).path).toBe("/api/platform/admins/");
  });

  it("refuses a status it doesn't know", async () => {
    await expect(
      fetchPlatformAdmins(answering(jsonResponse([{ ...ROW, status: "boss" }]))),
    ).rejects.toThrow();
  });

  it("invites a Platform Admin and names refused fields", async () => {
    const fetchFn = answering(jsonResponse(ROW, 201));
    await expect(
      invitePlatformAdmin({ name: "Rita Shrestha", email: "rita@platform.test" }, fetchFn),
    ).resolves.toEqual(ADMIN);
    expect(call(fetchFn)).toEqual({
      path: "/api/platform/admins/",
      method: "POST",
      body: { name: "Rita Shrestha", email: "rita@platform.test" },
    });

    const refused = await caught(
      invitePlatformAdmin(
        { name: "R", email: "taken@platform.test" },
        answering(jsonResponse({ email: ["Already used."] }, 400)),
      ),
    );
    expect(refused).toBeInstanceOf(InvalidFieldsError);
    expect(refused).toMatchObject({ fieldErrors: { email: ["Already used."] } });
  });

  it("sends the code again and deactivates, with the reason when refused", async () => {
    const resend = answering(jsonResponse({ detail: "A new code is on its way." }));
    await resendPlatformAdminCode(uid(2), resend);
    expect(call(resend)).toMatchObject({
      path: `/api/platform/admins/${uid(2)}/resend/`,
      method: "POST",
    });

    const deactivate = answering(jsonResponse({ ...ROW, status: "deactivated" }));
    await expect(deactivatePlatformAdmin(uid(2), deactivate)).resolves.toMatchObject({
      status: "deactivated",
    });
    expect(call(deactivate).path).toBe(`/api/platform/admins/${uid(2)}/deactivate/`);

    const refused = await caught(
      deactivatePlatformAdmin(
        uid(1),
        answering(jsonResponse({ detail: "You can't deactivate yourself." }, 400)),
      ),
    );
    expect(refused).toBeInstanceOf(InvalidFieldsError);
    expect(refused).toMatchObject({ fieldErrors: { detail: ["You can't deactivate yourself."] } });
  });
});

describe("reactivatePlatformAdmin (issue 65)", () => {
  it("posts to reactivate and returns their row", async () => {
    const fetchFn = answering(jsonResponse({ ...ROW, status: "active" }));

    await expect(reactivatePlatformAdmin(uid(2), fetchFn)).resolves.toMatchObject({
      status: "active",
    });
    expect(call(fetchFn)).toMatchObject({
      path: `/api/platform/admins/${uid(2)}/reactivate/`,
      method: "POST",
    });
  });
});

describe("joining the Platform (issue 65)", () => {
  it("asks for a new code, checks the code and chooses the password", async () => {
    const send = answering(jsonResponse({ detail: "If that email…" }, 202));
    await requestPlatformJoinCode("rita@platform.test", send);
    expect(call(send)).toMatchObject({
      path: "/api/platform/auth/join/",
      body: { email: "rita@platform.test" },
    });

    const check = answering(jsonResponse({ detail: "That code is right." }));
    await checkPlatformJoinCode({ email: "rita@platform.test", code: "123456" }, check);
    expect(call(check).path).toBe("/api/platform/auth/join/verify/");

    const done = answering(jsonResponse({ detail: "Your password is set. Log in with it." }));
    await completePlatformJoin(
      { email: "rita@platform.test", code: "123456", password: "Kathmandu!2026" },
      done,
    );
    expect(call(done)).toEqual({
      path: "/api/platform/auth/join/complete/",
      method: "POST",
      body: { email: "rita@platform.test", code: "123456", new_password: "Kathmandu!2026" },
    });
  });

  it("explains a refused code and unmet rules", async () => {
    await expect(
      checkPlatformJoinCode(
        { email: "a@b.test", code: "123456" },
        answering(jsonResponse({ detail: "no" }, 400)),
      ),
    ).rejects.toBeInstanceOf(InvalidCodeError);
    await expect(
      completePlatformJoin(
        { email: "a@b.test", code: "123456", password: "weak" },
        answering(jsonResponse({ detail: "no", unmet_rules: ["symbol"] }, 400)),
      ),
    ).rejects.toBeInstanceOf(PasswordRulesNotMetError);
  });
});

describe("the product logo (issue 65)", () => {
  it("reads where the logo is, or null", async () => {
    await expect(
      fetchProductLogo(answering(jsonResponse({ logo: { url: "/api/platform/brand/logo/3/" } }))),
    ).resolves.toEqual({ url: "/api/platform/brand/logo/3/", showName: true });
    await expect(fetchProductLogo(answering(jsonResponse({ logo: null })))).resolves.toBeNull();
  });

  it("shows no logo for an answer that isn't ours", async () => {
    await expect(
      fetchProductLogo(answering(jsonResponse({ logo: { url: "https://evil.example/x.png" } }))),
    ).resolves.toBeNull();
  });

  it("uploads a file as a form and removes the logo", async () => {
    const upload = answering(jsonResponse({ logo: { url: "/api/platform/brand/logo/1/" } }));
    const file = new File(["png"], "logo.png", { type: "image/png" });

    await expect(uploadProductLogo(file, upload)).resolves.toEqual({
      url: "/api/platform/brand/logo/1/",
      showName: true,
    });
    const sent = call(upload);
    expect(sent.path).toBe("/api/platform/brand/logo/");
    expect(sent.body).toBeInstanceOf(FormData);

    const remove = answering(new Response(null, { status: 204 }));
    await removeProductLogo(remove);
    expect(call(remove)).toMatchObject({ path: "/api/platform/brand/logo/", method: "DELETE" });
  });

  it("names a refused file", async () => {
    const refused = await caught(
      uploadProductLogo(
        new File(["x"], "x.gif", { type: "image/gif" }),
        answering(jsonResponse({ file: ["Upload a PNG, SVG, JPG or WebP image."] }, 400)),
      ),
    );
    expect(refused).toMatchObject({
      fieldErrors: { file: ["Upload a PNG, SVG, JPG or WebP image."] },
    });
    await expect(
      uploadProductLogo(new File(["x"], "x.png"), answering(jsonResponse({}, 500))),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});
