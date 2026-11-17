// @vitest-environment node
import { Writable } from "node:stream";

import { z } from "zod";

import { ServerConfigError } from "@/lib/config";

import { createServerLogger, readLoggerSettings, serverLogger, stackFrames } from "./server";

const LogLine = z.record(z.string(), z.unknown());
const CORRELATION_ID = "3f1c0000-0000-4000-8000-000000000000";
const API_ENTRY = {
  url: "/api/auth/login/",
  method: "POST",
  status: 200,
  timeTaken: "12ms",
  correlationId: CORRELATION_ID,
};

/** A destination that keeps every JSON line pino writes. */
function memoryStream() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      for (const line of chunk.toString().split("\n").filter(Boolean)) {
        lines.push(LogLine.parse(JSON.parse(line)));
      }
      done();
    },
  });
  return { lines, stream };
}

describe("readLoggerSettings", () => {
  it("is on, at info, by default", () => {
    expect(readLoggerSettings({})).toEqual({ enabled: true, level: "info" });
  });

  it.each(["debug", "info", "warn", "error", "DEBUG"])("accepts LOG_LEVEL=%s", (level) => {
    expect(readLoggerSettings({ LOG_LEVEL: level }).level).toBe(level.toLowerCase());
  });

  it.each(["", "trace", "fatal", "verbose", "info\n", "<script>"])(
    "refuses LOG_LEVEL=%j, naming the setting but not the value",
    (level) => {
      expect(() => readLoggerSettings({ LOG_LEVEL: level })).toThrow(ServerConfigError);
      expect(() => readLoggerSettings({ LOG_LEVEL: level })).toThrow(/LOG_LEVEL/);
    },
  );

  it.each([
    ["false", false],
    ["FALSE", false],
    ["true", true],
  ])("reads ENABLE_LOGGER=%s", (value, enabled) => {
    expect(readLoggerSettings({ ENABLE_LOGGER: value }).enabled).toBe(enabled);
  });

  it("refuses an ENABLE_LOGGER that isn't true or false", () => {
    expect(() => readLoggerSettings({ ENABLE_LOGGER: "yes" })).toThrow(/ENABLE_LOGGER/);
  });
});

describe("createServerLogger", () => {
  it("writes an api entry with its type and data", () => {
    const { lines, stream } = memoryStream();

    createServerLogger({ enabled: true, level: "info" }, stream).api("API request", API_ENTRY);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: 30, type: "api", msg: "API request", ...API_ENTRY });
  });

  it("writes an error entry at error level", () => {
    const { lines, stream } = memoryStream();

    createServerLogger({ enabled: true, level: "info" }, stream).error("API error", {
      url: "/api/x/",
      method: "GET",
      error: "unreachable",
      correlationId: CORRELATION_ID,
    });

    expect(lines[0]).toMatchObject({ level: 50, type: "error", msg: "API error" });
  });

  it("writes a warn entry at warn level", () => {
    const { lines, stream } = memoryStream();

    createServerLogger({ enabled: true, level: "info" }, stream).warn("API refused", {
      url: "/api/x/",
      method: "POST",
      reason: "origin",
      correlationId: CORRELATION_ID,
    });

    expect(lines[0]).toMatchObject({ level: 40, type: "warn", msg: "API refused" });
  });

  it.each([
    ["debug", ["api", "warn", "error"]],
    ["info", ["api", "warn", "error"]],
    ["warn", ["warn", "error"]],
    ["error", ["error"]],
  ] as const)("at %s writes only %j", (level, types) => {
    const { lines, stream } = memoryStream();
    const logger = createServerLogger({ enabled: true, level }, stream);

    logger.api("API request", API_ENTRY);
    logger.warn("API refused", { reason: "origin" });
    logger.error("API error", {});

    expect(lines.map((line) => line.type)).toEqual(types);
  });

  it("writes nothing when switched off", () => {
    const { lines, stream } = memoryStream();
    const logger = createServerLogger({ enabled: false, level: "info" }, stream);

    logger.api("API request", API_ENTRY);
    logger.error("API error", {});

    expect(lines).toHaveLength(0);
  });

  it("leaves out api entries when the level is above info", () => {
    const { lines, stream } = memoryStream();
    const logger = createServerLogger({ enabled: true, level: "error" }, stream);

    logger.api("API request", API_ENTRY);
    logger.error("API error", {});

    expect(lines.map((line) => line.type)).toEqual(["error"]);
  });

  it("blanks secret values, even when passed by mistake", () => {
    const { lines, stream } = memoryStream();
    const leaky = {
      ...API_ENTRY,
      password: "Secret-1!",
      token: "abc",
      cookie: "sessionid=abc",
      authorization: "Bearer abc",
      headers: { cookie: "sessionid=abc", authorization: "Bearer abc" },
    };

    createServerLogger({ enabled: true, level: "info" }, stream).api("API request", leaky);

    const text = JSON.stringify(lines);
    expect(text).not.toContain("Secret-1!");
    expect(text).not.toContain("abc");
    expect(lines[0]).toMatchObject({ password: "[redacted]", url: API_ENTRY.url });
  });
});

describe("serverLogger", () => {
  it("writes JSON to stdout, using the environment's settings", () => {
    vi.stubEnv("LOG_LEVEL", "info");
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    serverLogger.api("API request", API_ENTRY);

    const printed = write.mock.calls.map(([text]) => String(text)).join("");
    expect(JSON.parse(printed)).toMatchObject({ type: "api", correlationId: CORRELATION_ID });
  });
});

describe("stackFrames", () => {
  it("keeps the error's name and frames but not its message", () => {
    const error = new TypeError("connect ECONNREFUSED http://backend:8000");

    const frames = stackFrames(error);

    expect(frames).toMatch(/^TypeError\n\s+at /);
    expect(frames).not.toContain("backend:8000");
  });

  it.each([["a string"], [null], [{ stack: "x" }]])("is undefined for %j", (thrown) => {
    expect(stackFrames(thrown)).toBeUndefined();
  });
});
