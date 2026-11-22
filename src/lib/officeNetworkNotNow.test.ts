import { isNotNow, NOT_NOW_KEY, rememberNotNow } from "./officeNetworkNotNow";

const OFFICE = "110.44.115.82";
const OFFICE_GROUP = "2400:1a00:b030:9::/64";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("Not now for an Office Network (first live fixes, ticket 03)", () => {
  it("is not set for any network at first", async () => {
    expect(await isNotNow(OFFICE)).toBe(false);
  });

  it("is remembered for that network only", async () => {
    await rememberNotNow(OFFICE_GROUP);

    expect(await isNotNow(OFFICE_GROUP)).toBe(true);
    expect(await isNotNow(OFFICE)).toBe(false);
    expect(await isNotNow("2400:1a00:b030:a::/64")).toBe(false);
  });

  it("keeps only a SHA-256 hash, never the network itself (ADR 0004)", async () => {
    await rememberNotNow(OFFICE);
    await rememberNotNow(OFFICE_GROUP);

    const stored = window.localStorage.getItem(NOT_NOW_KEY) ?? "";
    expect(stored).not.toContain("110.44");
    expect(stored).not.toContain("2400");
    expect(JSON.parse(stored)).toEqual([
      expect.stringMatching(/^[0-9a-f]{64}$/),
      expect.stringMatching(/^[0-9a-f]{64}$/),
    ]);
  });

  it("stores a network once however often Not now is pressed", async () => {
    await rememberNotNow(OFFICE);
    await rememberNotNow(OFFICE);

    expect(JSON.parse(window.localStorage.getItem(NOT_NOW_KEY) ?? "")).toHaveLength(1);
  });

  it("keeps the 20 newest, so the list never grows without end", async () => {
    for (let n = 1; n <= 21; n += 1) await rememberNotNow(`110.44.115.${String(n)}`);

    expect(JSON.parse(window.localStorage.getItem(NOT_NOW_KEY) ?? "")).toHaveLength(20);
    expect(await isNotNow("110.44.115.1")).toBe(false);
    expect(await isNotNow("110.44.115.21")).toBe(true);
  });

  it.each([
    ["broken JSON", "{not json"],
    ["not a list", '{"a":1}'],
    ["a list of other things", '["110.44.115.82", 4]'],
  ])("treats %s in storage as nothing remembered, and starts again", async (_, value) => {
    window.localStorage.setItem(NOT_NOW_KEY, value);

    expect(await isNotNow(OFFICE)).toBe(false);
    await rememberNotNow(OFFICE);
    expect(await isNotNow(OFFICE)).toBe(true);
  });

  it("works without storage: nothing is remembered and nothing throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    await expect(rememberNotNow(OFFICE)).resolves.toBeUndefined();
    expect(await isNotNow(OFFICE)).toBe(false);
  });

  it("works without hashing (an insecure page): nothing is remembered", async () => {
    vi.spyOn(crypto.subtle, "digest").mockRejectedValue(new Error("no subtle crypto"));

    await expect(rememberNotNow(OFFICE)).resolves.toBeUndefined();
    expect(await isNotNow(OFFICE)).toBe(false);
    expect(window.localStorage.getItem(NOT_NOW_KEY)).toBeNull();
  });
});
