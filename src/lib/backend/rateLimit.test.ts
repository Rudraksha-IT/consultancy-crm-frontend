// @vitest-environment node
import { createRateLimiter } from "./rateLimit";

const WINDOW = 1000;

describe("createRateLimiter", () => {
  it("allows the limit in a window, then refuses", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: WINDOW, maxKeys: 10 });

    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.take("a", 10)).toBe(true);
    expect(limiter.take("a", 20)).toBe(false);
  });

  it("counts each key on its own", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW, maxKeys: 10 });

    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.take("b", 0)).toBe(true);
    expect(limiter.take("a", 0)).toBe(false);
  });

  it("starts again once the window has passed", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW, maxKeys: 10 });

    limiter.take("a", 0);

    expect(limiter.take("a", WINDOW - 1)).toBe(false);
    expect(limiter.take("a", WINDOW)).toBe(true);
  });

  it("forgets the oldest keys first when full, so memory stays bounded", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW, maxKeys: 2 });

    limiter.take("a", 0);
    limiter.take("b", 1);
    limiter.take("c", 2);

    expect(limiter.take("a", 3)).toBe(true);
    expect(limiter.take("c", 3)).toBe(false);
  });

  it("forgets ended windows before forgetting live ones", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW, maxKeys: 2 });

    limiter.take("old", 0);
    limiter.take("live", WINDOW);
    limiter.take("new", WINDOW + 1);

    expect(limiter.take("live", WINDOW + 2)).toBe(false);
  });

  it("uses the current time by default", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW, maxKeys: 2 });

    expect(limiter.take("a")).toBe(true);
    expect(limiter.take("a")).toBe(false);
  });
});
