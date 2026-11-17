import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const MIN_COVERAGE_PERCENT = 90;
// Times on screen are the office's local time, so every test runs in the office's time zone: the
// same result on a laptop in Nepal and on CI (UTC). Set before the workers start; they inherit it.
const OFFICE_TIME_ZONE = "Asia/Kathmandu";
process.env.TZ = OFFICE_TIME_ZONE;
// Long user flows (a whole edit form, typed and saved) take a few seconds when every file runs at
// once on a busy machine; the 5 s default made them fail at random.
const TEST_TIMEOUT_MS = 15_000;

const TEST_FILE = /\.test\.tsx?$/;
const MOCKS_A_MODULE = /\bvi\.(do)?[mM]ock\(/;

/**
 * Test files that replace a module with `vi.mock`. Those need a fresh module cache per file, so
 * they run isolated; found by reading the files, so a new one is picked up by itself.
 */
function filesThatMockModules(): string[] {
  return ["src", "tests"].flatMap((dir) =>
    readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((file) => TEST_FILE.test(file))
      .map((file) => `${dir}/${file}`)
      .filter((path) => MOCKS_A_MODULE.test(readFileSync(path, "utf8"))),
  );
}

const ALL_TESTS = ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"];
const ISOLATED = filesThatMockModules();

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // Server-only modules are tested here too; the real package throws outside the server build.
    alias: { "server-only": fileURLToPath(new URL("src/test/serverOnly.ts", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    testTimeout: TEST_TIMEOUT_MS,
    env: { TZ: OFFICE_TIME_ZONE },
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    pool: "threads",
    // Speed: most files share one jsdom and module cache per worker (about 2x faster than a fresh
    // one per file). Each test still starts clean: vitest.setup.ts cleans the DOM and storage, and
    // the options above restore mocks, globals and env after every test. Files that mock a module
    // keep their own fresh cache.
    projects: [
      {
        extends: true,
        test: { name: "shared", include: ALL_TESTS, exclude: ISOLATED, isolate: false },
      },
      { extends: true, test: { name: "isolated", include: ISOLATED, isolate: true } },
    ],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/components/**"],
      exclude: ["**/*.test.{ts,tsx}", "**/index.ts"],
      thresholds: {
        lines: MIN_COVERAGE_PERCENT,
        branches: MIN_COVERAGE_PERCENT,
        functions: MIN_COVERAGE_PERCENT,
        statements: MIN_COVERAGE_PERCENT,
      },
    },
  },
});
