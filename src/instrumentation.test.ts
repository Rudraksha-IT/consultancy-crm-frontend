// @vitest-environment node
import { uid } from "@/test/ids";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { z } from "zod";

import { onRequestError, register } from "./instrumentation";

const check = vi.hoisted(() => vi.fn());
vi.mock("@/lib/config/startupCheck", () => ({ exitUnlessServerConfigured: check }));

describe("register (server startup)", () => {
  beforeEach(() => {
    check.mockClear();
  });

  it("checks the server settings in the Node.js runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");

    await register();

    expect(check).toHaveBeenCalledOnce();
  });

  it("doesn't check during the production build, which has no server settings", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NEXT_PHASE", PHASE_PRODUCTION_BUILD);

    await register();

    expect(check).not.toHaveBeenCalled();
  });

  it("doesn't check in the Edge runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");

    await register();

    expect(check).not.toHaveBeenCalled();
  });
});

const LogLine = z.record(z.string(), z.unknown());
const CORRELATION_ID = "3f1c0000-0000-4000-8000-000000000000";
const RENDER_CONTEXT = {
  routerKind: "App Router",
  routePath: "/students/[id]",
  routeType: "render",
  renderSource: "server-rendering",
  revalidateReason: undefined,
} as const;

function renderError(): Error & { digest: string } {
  return Object.assign(new Error("could not read sita@acme.test"), { digest: "2417294843" });
}

function printedLines(write: { mock: { calls: unknown[][] } }): Record<string, unknown>[] {
  return write.mock.calls
    .flatMap(([text]) => String(text).split("\n"))
    .filter(Boolean)
    .map((line) => LogLine.parse(JSON.parse(line)));
}

describe("onRequestError (a server render or route failed)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
  });

  it("writes one error entry with the route, method, digest and stack", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await onRequestError(
      renderError(),
      {
        path: `/students/${uid(7)}?q=sita@acme.test`,
        method: "GET",
        headers: { cookie: "crm_auth=sealed", "x-correlation-id": CORRELATION_ID },
      },
      RENDER_CONTEXT,
    );

    const lines = printedLines(write);
    expect(lines).toEqual([
      expect.objectContaining({
        level: 50,
        type: "error",
        msg: "Server error",
        url: `/students/${uid(7)}`,
        route: "/students/[id]",
        method: "GET",
        digest: "2417294843",
        correlationId: CORRELATION_ID,
      }),
    ]);
    expect(lines[0]?.stack).toMatch(/^Error\n\s+at /);
    const text = JSON.stringify(lines);
    for (const secret of ["sita@acme.test", "crm_auth", "sealed"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("leaves out a correlation ID that isn't a UUID", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await onRequestError(
      "a thrown string",
      { path: "/", method: "GET", headers: { "x-correlation-id": "<script>" } },
      RENDER_CONTEXT,
    );

    const [entry] = printedLines(write);
    expect(entry).toMatchObject({ type: "error", url: "/" });
    expect(entry).not.toHaveProperty("correlationId");
    expect(entry).not.toHaveProperty("digest");
    expect(JSON.stringify(entry)).not.toContain("<script>");
  });

  it("writes nothing in the Edge runtime, which has no Node.js logger", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await onRequestError(renderError(), { path: "/", method: "GET", headers: {} }, RENDER_CONTEXT);

    expect(write).not.toHaveBeenCalled();
  });
});
