import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";

import { fakeMatchMedia } from "@/test/matchMedia";

// findBy* and waitFor wait up to 5 s (default 1 s): the files run in parallel, and a busy machine
// must not turn a slow render into a failed test. A passing wait still returns at once.
configure({ asyncUtilTimeout: 5000 });

// A lasting default too, so a test file's own `vi.unstubAllGlobals()` (run before cleanup())
// falls back to it rather than to nothing: a phone-width check run a moment late then still works.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: fakeMatchMedia(() => false).matchMedia,
  });
}

beforeEach(() => {
  // jsdom has no matchMedia; by default the device prefers light.
  vi.stubGlobal("matchMedia", fakeMatchMedia(() => false).matchMedia);
});

afterEach(() => {
  cleanup();
  // The Theme is written onto <html>, which cleanup() leaves alone; start every test without it.
  if (typeof document !== "undefined") {
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-theme");
  }
  // Server-side tests (`@vitest-environment node`) have no browser storage.
  if (typeof window !== "undefined") window.localStorage.clear();
});
