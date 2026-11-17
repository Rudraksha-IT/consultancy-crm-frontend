import { mergeActivity, sourcesToLoadNext, type ActivitySource } from "./activity";

type Item = { key: string; at: string };

function source(ats: string[], count = ats.length, prefix = "x"): ActivitySource<Item> {
  return {
    items: ats.map((at, index) => ({ key: `${prefix}${String(index)}`, at })),
    count,
    page: 1,
  };
}

describe("mergeActivity", () => {
  it("puts every source's items in one list, newest first", () => {
    const visits = source(["2026-11-03T10:00:00+05:45", "2026-11-01T10:00:00+05:45"], 2, "v");
    const history = source(["2026-11-02T10:00:00+05:45"], 1, "h");

    const merged = mergeActivity([visits, history]);

    expect(merged.items.map((item) => item.key)).toEqual(["v0", "h0", "v1"]);
    expect(merged.hasOlder).toBe(false);
  });

  it("compares the moments, not the text, when offsets differ", () => {
    const utc = source(["2026-11-03T04:00:00Z"], 1, "u");
    const nepal = source(["2026-11-03T09:00:00+05:45"], 1, "n");

    // 09:00 in Nepal is 03:15 UTC, so the UTC item is newer.
    expect(mergeActivity([nepal, utc]).items.map((item) => item.key)).toEqual(["u0", "n0"]);
  });

  it("holds back items older than a source that has more to load", () => {
    const history = source(["2026-11-03T10:00:00Z", "2026-11-02T10:00:00Z"], 5, "h");
    const visits = source(["2026-11-02T12:00:00Z", "2026-10-01T10:00:00Z"], 2, "v");

    const merged = mergeActivity([history, visits]);

    // History's next page may hold anything older than 2 Nov, so the October visit waits.
    expect(merged.items.map((item) => item.key)).toEqual(["h0", "v0", "h1"]);
    expect(merged.hasOlder).toBe(true);
  });

  it("is empty with nothing loaded", () => {
    expect(mergeActivity<Item>([])).toEqual({ items: [], hasOlder: false });
  });
});

describe("sourcesToLoadNext", () => {
  it("names the sources whose next page could come next", () => {
    const history = source(["2026-11-03T10:00:00Z", "2026-11-02T10:00:00Z"], 5);
    const visits = source(["2026-11-03T12:00:00Z"], 4);
    const messages = source(["2026-11-01T10:00:00Z"], 1);

    // Visits stop at 3 Nov, later than History's 2 Nov: Visits must load first.
    expect(sourcesToLoadNext([history, visits, messages])).toEqual([1]);
  });

  it("names none when everything is loaded", () => {
    expect(sourcesToLoadNext([source(["2026-11-01T10:00:00Z"])])).toEqual([]);
  });
});
