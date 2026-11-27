import { fetchCurrentConsultancy } from "./consultancy";

import { ApiRequestError } from "../core/errors";

describe("fetchCurrentConsultancy", () => {
  it("returns the Consultancy that owns the current subdomain, without any old theme", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ name: "Acme Education", theme: { page: "ice" } })),
      );

    await expect(fetchCurrentConsultancy(fetchFn)).resolves.toEqual({
      name: "Acme Education",
      logo: null,
      status: "active",
      statusMessage: null,
    });
    expect(fetchFn).toHaveBeenCalledWith("/api/consultancy/", expect.anything());
  });

  it("returns the office logo, in frontend naming", async () => {
    const logo = { url: "/api/consultancy/logo/3/", show_name: false };
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ name: "Acme Education", logo })));

    await expect(fetchCurrentConsultancy(fetchFn)).resolves.toMatchObject({
      logo: { url: "/api/consultancy/logo/3/", showName: false },
    });
  });

  it.each([
    { url: "https://evil.test/logo.png", show_name: true },
    { url: "javascript:alert(1)", show_name: true },
    { url: "/api/consultancy/logo/3/?x=1", show_name: true },
    { url: "/api/consultancy/logo/../../x/", show_name: true },
    { url: "/api/consultancy/logo/3/", show_name: "yes" },
    { url: "/api/consultancy/logo/3/" },
    "/api/consultancy/logo/3/",
  ])("shows the initials instead of a logo answer that isn't ours: %j", async (logo) => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ name: "Acme Education", logo })));

    await expect(fetchCurrentConsultancy(fetchFn)).resolves.toMatchObject({ logo: null });
  });

  it("uses the default Theme when none comes back", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ name: "Acme Education" })));

    await expect(fetchCurrentConsultancy(fetchFn)).resolves.toEqual({
      name: "Acme Education",
      logo: null,
      status: "active",
      statusMessage: null,
    });
  });

  it("rejects when the subdomain belongs to no Consultancy", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 404 }));

    await expect(fetchCurrentConsultancy(fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("returns the office's Status and why it limits Staff", async () => {
    const message = "Your office's trial has ended. Ask your Admin to contact the CRM team.";
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ name: "Acme Education", status: "evaluation", status_message: message }),
        ),
      );

    await expect(fetchCurrentConsultancy(fetchFn)).resolves.toMatchObject({
      status: "evaluation",
      statusMessage: message,
    });
  });

  it.each([
    { status: "closed", status_message: null },
    { status: 3, status_message: "x".repeat(301) },
    { status: "past_due", status_message: 12 },
  ])("shows no Status banner for an answer that isn't ours: %j", async (answer) => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ name: "Acme Education", ...answer })));

    const consultancy = await fetchCurrentConsultancy(fetchFn);

    expect(consultancy.statusMessage).toBeNull();
  });
});
